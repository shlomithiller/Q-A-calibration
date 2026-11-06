import { useEffect, useState } from 'react';
import {
  AgentAstro,
  ArrowLeft,
  Bell,
  Check,
  ChevronDown,
  Grid,
  Home,
  Search,
} from './components/Icons';

type Page = 'questions' | 'calibration' | 'verified' | 'classify';
type Phase =
  | 'empty'
  | 'generating'
  | 'ready'
  | 'terms'
  | 'applied'
  | 'classify'
  | 'verified'
  | 'retesting'
  | 'matched';

interface DemoQuestion {
  id: string;
  text: string;
  source: string;
  model: string;
  sql: string;
  answer: string;
  chart: { label: string; value: number }[];
  yLabel: string;
}

const QUESTIONS: DemoQuestion[] = [
  {
    id: 'orders',
    text: 'Show me total orders by month',
    source: 'AI',
    model: 'C360',
    answer: 'I found a table called Orders, and here is the Total Orders by Month.',
    yLabel: 'Total Orders',
    chart: [
      { label: 'Jan', value: 32 },
      { label: 'Feb', value: 40 },
      { label: 'Mar', value: 28 },
      { label: 'Apr', value: 48 },
      { label: 'May', value: 44 },
      { label: 'Jun', value: 36 },
      { label: 'Jul', value: 50 },
      { label: 'Aug', value: 42 },
      { label: 'Sep', value: 30 },
      { label: 'Oct', value: 46 },
    ],
    sql: `WITH ranked_orders AS (
  SELECT month, COUNT(*) AS total_orders
  FROM SEMANTIC_VIEW('sales_extended', DIMENSIONS Order.Month)
  GROUP BY month
)
SELECT month, total_orders
FROM ranked_orders
ORDER BY month`,
  },
  {
    id: 'conversion',
    text: 'Compare lead conversion rate in the prior month for different sources, when responding to pipeline questions',
    source: 'AI',
    model: 'C360',
    answer: 'Lead conversion for the prior month is highest from Partner, then Web, then Event.',
    yLabel: 'Conversion',
    chart: [
      { label: 'Web', value: 22 },
      { label: 'Partner', value: 48 },
      { label: 'Event', value: 16 },
    ],
    sql: `SELECT source, AVG(conversion_rate) AS avg_conversion
FROM SEMANTIC_VIEW('sales_extended', DIMENSIONS Lead.Source)
WHERE close_month = DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
GROUP BY source`,
  },
];

const TERMS = [
  { id: 'fresh', label: 'Fresh Accounts', prompt: 'Define the term Fresh accounts?' },
  { id: 'hq', label: 'HQ Territory', prompt: 'Define the term HQ Territory?' },
];

const CALIBRATIONS = [
  {
    id: 'description',
    title: 'Add Description',
    meta: 'Data Object · Account',
    impact: 'Medium',
    fields: [
      ['Data Field Name', 'Account Name'],
      ['Description', 'Allows you to identify the account'],
    ],
  },
  {
    id: 'field',
    title: 'Add Calculated Field',
    meta: 'Percentage CSAT',
    impact: 'High',
    fields: [
      ['Name', 'Relationship CSAT Percentage'],
      ['Formula', 'ROUND(COUNT(IF(sample = Superstore, [Discount] >= 4 THEN 1 END)) * 100 / COUNT([sample = Superstore_Orders]), 2)'],
    ],
  },
  {
    id: 'preference',
    title: 'Add Business Preference',
    meta: 'Total Discounts',
    impact: 'Medium',
    fields: [
      ['Preference', 'Total Discounts uses the custom discount field, not the standard amount.'],
    ],
  },
];

export function CustomerZero() {
  const [page, setPage] = useState<Page>('questions');
  const [phase, setPhase] = useState<Phase>('empty');
  const [model, setModel] = useState('');
  const [progress, setProgress] = useState(12);
  const [termDrafts, setTermDrafts] = useState<Record<string, string>>({ fresh: '', hq: '' });
  const [savedTerms, setSavedTerms] = useState<string[]>([]);
  const [openTerm, setOpenTerm] = useState('fresh');
  const [applied, setApplied] = useState<string[]>([]);
  const [classifyIndex, setClassifyIndex] = useState(0);
  const [answerReady, setAnswerReady] = useState(false);
  const [picked, setPicked] = useState<'accurate' | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSlack, setShowSlack] = useState(false);
  const [verifiedIds, setVerifiedIds] = useState<string[]>([]);

  const generated = phase !== 'empty' && phase !== 'generating';
  const bothVerified = verifiedIds.length === QUESTIONS.length;
  const termsDone = savedTerms.length === TERMS.length;
  const activeQuestion = QUESTIONS[classifyIndex];

  useEffect(() => {
    if (phase !== 'generating' && phase !== 'retesting') return;
    setProgress(18);
    const tick = window.setInterval(() => {
      setProgress((value) => Math.min(value + 8, 78));
    }, 220);
    const done = window.setTimeout(() => {
      setProgress(78);
      if (phase === 'generating') {
        setPhase('ready');
        setPage('questions');
      } else {
        setPhase('matched');
        setPage('questions');
        setShowSlack(false);
      }
    }, 2200);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(done);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'classify') return;
    setAnswerReady(false);
    setPicked(null);
    setSaving(false);
    const timer = window.setTimeout(() => setAnswerReady(true), 1200);
    return () => window.clearTimeout(timer);
  }, [phase, classifyIndex]);

  const openQuestions = () => setPage('questions');
  const openCalibration = () => {
    if (!generated) return;
    setPage('calibration');
    if (phase === 'ready') setPhase('terms');
  };
  const openVerified = () => {
    if (!bothVerified && phase !== 'classify') return;
    setPage(phase === 'classify' ? 'classify' : 'verified');
  };

  const generate = () => {
    if (!model || phase !== 'empty') return;
    setPhase('generating');
  };

  const saveTerm = (id: string) => {
    const text = termDrafts[id]?.trim();
    if (!text || savedTerms.includes(id)) return;
    const next = [...savedTerms, id];
    setSavedTerms(next);
    const upcoming = TERMS.find((term) => !next.includes(term.id));
    setOpenTerm(upcoming?.id ?? '');
  };

  const applyOne = (id: string) => {
    setApplied((current) => (current.includes(id) ? current : [...current, id]));
  };

  const applyAll = () => {
    setApplied(CALIBRATIONS.map((item) => item.id));
    setPhase('applied');
    setPage('calibration');
  };

  const startVerify = () => {
    setPhase('classify');
    setPage('classify');
    setClassifyIndex(0);
    setVerifiedIds([]);
  };

  const confirmClassification = () => {
    if (picked !== 'accurate' || saving) return;
    setSaving(true);
    window.setTimeout(() => {
      const id = QUESTIONS[classifyIndex].id;
      const nextVerified = verifiedIds.includes(id) ? verifiedIds : [...verifiedIds, id];
      setVerifiedIds(nextVerified);
      setSaving(false);
      if (classifyIndex < QUESTIONS.length - 1) {
        setClassifyIndex(classifyIndex + 1);
      } else {
        setPhase('verified');
        setPage('questions');
        setShowSlack(true);
      }
    }, 700);
  };

  const retest = () => {
    if (phase !== 'verified' && phase !== 'matched') return;
    setShowSlack(false);
    setPhase('retesting');
    setPage('questions');
  };

  const reviewCount = bothVerified ? 0 : generated ? QUESTIONS.length : 0;
  const suggestionCount = generated ? 2 : 0;

  return (
    <div className="app">
      <header className="global-header">
        <div className="header-left">
          <div className="app-launcher" aria-hidden="true"><Grid size={16} /></div>
          <div className="home-tab">
            <Home size={20} />
            <div className="home-tab-indicator" />
          </div>
        </div>
        <div className="header-center" />
        <div className="header-right">
          <div className="header-controls">
            <button className="icon-button" aria-label="Agentforce" type="button"><AgentAstro size={20} /></button>
            <button className="icon-button" aria-label="Notifications" type="button"><Bell size={20} /></button>
          </div>
          <div className="header-user">
            <img className="avatar" src={`${import.meta.env.BASE_URL}avatars/header-avatar.svg`} alt="" />
            <ChevronDown size={12} className="avatar-chevron" />
          </div>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-header">
            <button className="back-arrow" type="button" aria-label="Back" onClick={openQuestions}>
              <ArrowLeft size={16} />
            </button>
            <span className="sidebar-title">Q&amp;A Calibration</span>
          </div>
          <nav className="nav" aria-label="Q&A Calibration">
            <button className="nav-item" type="button" onClick={openQuestions}>Home</button>
            <button className={`nav-item ${page === 'questions' ? 'active' : ''}`} type="button" onClick={openQuestions}>All Questions</button>
            <button className={`nav-item ${page === 'verified' || page === 'classify' ? 'active' : ''}`} type="button" onClick={openVerified}>Verified Queries</button>
            <button className={`nav-item ${page === 'calibration' ? 'active' : ''}`} type="button" onClick={openCalibration} disabled={!generated}>Model Calibration</button>
          </nav>
        </aside>

        <main className={`canvas ${page === 'classify' || page === 'calibration' ? 'cz-split' : ''}`}>
          {page === 'questions' && (
            <QuestionsPage
              phase={phase}
              model={model}
              progress={progress}
              reviewCount={reviewCount}
              suggestionCount={suggestionCount}
              verified={bothVerified}
              matched={phase === 'matched'}
              onModel={setModel}
              onGenerate={generate}
              onReview={openCalibration}
              onRetest={retest}
              onOpen={() => {
                if (bothVerified) {
                  setPage('verified');
                }
              }}
            />
          )}
          {page === 'calibration' && (
            <CalibrationPage
              progress={phase === 'applied' ? progress : 0}
              showProgress={phase === 'applied'}
              termDrafts={termDrafts}
              savedTerms={savedTerms}
              openTerm={openTerm}
              termsDone={termsDone}
              applied={applied}
              done={phase === 'applied'}
              onDraft={(id, value) => setTermDrafts((current) => ({ ...current, [id]: value }))}
              onToggleTerm={setOpenTerm}
              onSaveTerm={saveTerm}
              onApply={applyOne}
              onApplyAll={applyAll}
              onVerify={startVerify}
            />
          )}
          {page === 'classify' && (
            <ClassifyPage
              question={activeQuestion}
              index={classifyIndex}
              total={QUESTIONS.length}
              answerReady={answerReady}
              picked={picked}
              saving={saving}
              onPick={() => setPicked('accurate')}
              onBack={() => {
                if (classifyIndex === 0) openCalibration();
                else setClassifyIndex(classifyIndex - 1);
              }}
              onNext={confirmClassification}
            />
          )}
          {page === 'verified' && (
            <VerifiedPage onBack={openQuestions} />
          )}
        </main>
      </div>

      {showSlack && (
        <aside className="cz-slack" role="status">
          <div className="cz-slack-top">
            <span className="cz-slack-app">
              <SlackMark />
              SLACK
            </span>
            <span>3m ago</span>
          </div>
          <strong>Jane</strong>
          <p>Hey, we've updated the “c360” model<br />I suggest reviewing the Q&amp;A in case it effected a change on your side</p>
        </aside>
      )}
    </div>
  );
}

function QuestionsPage({
  phase,
  model,
  progress,
  reviewCount,
  suggestionCount,
  verified,
  matched,
  onModel,
  onGenerate,
  onReview,
  onRetest,
  onOpen,
}: {
  phase: Phase;
  model: string;
  progress: number;
  reviewCount: number;
  suggestionCount: number;
  verified: boolean;
  matched: boolean;
  onModel: (value: string) => void;
  onGenerate: () => void;
  onReview: () => void;
  onRetest: () => void;
  onOpen: () => void;
}) {
  const showList = phase !== 'empty' && phase !== 'generating';
  const busy = phase === 'generating' || phase === 'retesting';
  return (
    <div className="cz-page">
      <div className="cz-title-row">
        <h1>All Questions</h1>
        <button className="btn btn-outlined" type="button" onClick={onRetest} disabled={!verified && phase !== 'matched'}>
          Retest
        </button>
      </div>
      <div className="cz-metrics">
        <Metric label="Questions for review" value={reviewCount} />
        <Metric label="Regression" value={0} />
        <Metric label="VQs" value={verified ? QUESTIONS.length : 0} tone={verified ? 'good' : undefined} />
        <Metric label="Calibration Suggestions" value={suggestionCount} tone={suggestionCount && !verified ? 'alert' : undefined} />
      </div>
      {busy && (
        <ProgressBanner
          label={phase === 'retesting' ? 'Running batch regression' : 'Generating Questions from model'}
          progress={progress}
        />
      )}
      {phase === 'ready' && (
        <button className="cz-banner" type="button" onClick={onReview}>
          <span className="cz-dot" />
          2 Calibration Suggestions are ready for the “Sales” model
          <span className="cz-banner-link">Review</span>
        </button>
      )}
      {matched && (
        <div className="cz-match">Batch regression complete. The verified questions still match.</div>
      )}
      <section className="cz-card">
        <div className="cz-toolbar">
          <span>{showList ? `${QUESTIONS.length} questions` : '0 questions'}</span>
          <div className="cz-tools">
            <span className="cz-fake-select">Any classification <ChevronDown size={12} /></span>
            <span className="cz-fake-select">Any model <ChevronDown size={12} /></span>
            <label className="cz-search">
              <Search size={14} />
              <input aria-label="Search questions" placeholder="Search..." />
            </label>
          </div>
        </div>
        {!showList ? (
          <div className="cz-empty">
            <EmptyArt />
            <h2>No Question Available</h2>
            <p>You currently have no questions. Select a semantic model in order to generate questions.</p>
            <label className="cz-model">
              <span className="cz-sr">Semantic model</span>
              <select value={model} onChange={(event) => onModel(event.target.value)} aria-label="Semantic model">
                <option value="">Select a semantic model</option>
                <option value="Sales">Sales</option>
              </select>
            </label>
            <button className="btn btn-brand" type="button" disabled={!model || phase === 'generating'} onClick={onGenerate}>
              Generate
            </button>
          </div>
        ) : (
          <table className="cz-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Source</th>
                {verified ? <th>Rating</th> : null}
                <th>Semantic Model</th>
                <th>Last Modified</th>
                <th>Classification</th>
                {verified ? null : <th>Findings</th>}
              </tr>
            </thead>
            <tbody>
              {QUESTIONS.map((question) => (
                <tr key={question.id}>
                  <td>
                    <button className="cz-q" type="button" onClick={verified ? onOpen : onReview}>{question.text}</button>
                  </td>
                  <td>{question.source}</td>
                  {verified ? <td>31 / 12</td> : null}
                  <td>{question.model}</td>
                  <td>{verified ? '12 hours ago' : '24 minutes ago'}</td>
                  <td>{verified ? <span className="cz-pill cz-pill-good">Verified</span> : <span className="cz-pill">New</span>}</td>
                  {verified ? null : <td><span className="cz-pill cz-pill-warn">Missing Definitions</span></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function CalibrationPage({
  showProgress,
  progress,
  termDrafts,
  savedTerms,
  openTerm,
  termsDone,
  applied,
  done,
  onDraft,
  onToggleTerm,
  onSaveTerm,
  onApply,
  onApplyAll,
  onVerify,
}: {
  showProgress: boolean;
  progress: number;
  termDrafts: Record<string, string>;
  savedTerms: string[];
  openTerm: string;
  termsDone: boolean;
  applied: string[];
  done: boolean;
  onDraft: (id: string, value: string) => void;
  onToggleTerm: (id: string) => void;
  onSaveTerm: (id: string) => void;
  onApply: (id: string) => void;
  onApplyAll: () => void;
  onVerify: () => void;
}) {
  return (
    <div className="cz-cal">
      <div className="cz-cal-main">
        <h1>Model Name - Sales</h1>
        <div className="cz-meta-line">
          <span>Generalization Score <b className="cz-score">40%</b></span>
          <span>Run Time: 20 seconds</span>
          <span>Last Modified A week ago</span>
        </div>
        {showProgress && <ProgressBanner label="Applying calibrations" progress={progress} />}
        <table className="cz-table">
          <thead>
            <tr>
              <th>Representative Questions</th>
              <th>Classification</th>
              <th>Findings</th>
            </tr>
          </thead>
          <tbody>
            {QUESTIONS.map((question) => (
              <tr key={question.id}>
                <td>{question.text}</td>
                <td><span className="cz-pill">New</span></td>
                <td><span className="cz-pill cz-pill-warn">Missing Definitions</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <aside className="cz-rail">
        {done ? (
          <div className="cz-done">
            <div className="cz-done-mark"><Check size={22} /></div>
            <h2>All Calibrations Applied</h2>
            <p>No new calibrations suggested for this model.</p>
            <button className="btn btn-outlined" type="button">Add new questions</button>
            <button className="btn btn-brand" type="button" onClick={onVerify}>Verify existing questions</button>
          </div>
        ) : (
          <>
            <div className="cz-rail-head">
              <strong>Calibrate</strong>
              <span className="cz-ai">AI-generated</span>
            </div>
            <section className="cz-terms">
              <h2>Terms - Require Input</h2>
              {TERMS.map((term) => {
                const open = openTerm === term.id;
                const saved = savedTerms.includes(term.id);
                return (
                  <div key={term.id} className={`cz-term ${open ? 'open' : ''}`}>
                    <button type="button" className="cz-term-toggle" onClick={() => onToggleTerm(open ? '' : term.id)}>
                      {open ? '▾' : '▸'} {term.label}
                      {saved ? <span className="cz-saved">Saved</span> : null}
                    </button>
                    {open && !saved && (
                      <div className="cz-term-body">
                        <p>{term.prompt}</p>
                        <textarea
                          value={termDrafts[term.id] ?? ''}
                          placeholder="Use text to explain the term"
                          onChange={(event) => onDraft(term.id, event.target.value)}
                        />
                        <button
                          className="cz-text-btn"
                          type="button"
                          disabled={!termDrafts[term.id]?.trim()}
                          onClick={() => onSaveTerm(term.id)}
                        >
                          Save &amp; Suggest
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
            {termsDone && (
              <section className="cz-cals">
                <h2>Suggested Calibrations</h2>
                {CALIBRATIONS.map((item) => (
                  <article key={item.id} className="cz-cal-card">
                    <header>
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.meta}</span>
                      </div>
                      <span className={`cz-impact ${item.impact === 'High' ? 'high' : ''}`}>{item.impact} impact</span>
                    </header>
                    {item.fields.map(([label, value]) => (
                      <label key={label}>
                        {label}
                        <textarea readOnly value={value} />
                      </label>
                    ))}
                    <button className="btn btn-brand" type="button" disabled={applied.includes(item.id)} onClick={() => onApply(item.id)}>
                      {applied.includes(item.id) ? 'Applied' : 'Apply'}
                    </button>
                  </article>
                ))}
                <button className="btn btn-outlined cz-apply-all" type="button" onClick={onApplyAll}>Apply All</button>
              </section>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

function ClassifyPage({
  question,
  index,
  total,
  answerReady,
  picked,
  saving,
  onPick,
  onBack,
  onNext,
}: {
  question: DemoQuestion;
  index: number;
  total: number;
  answerReady: boolean;
  picked: 'accurate' | null;
  saving: boolean;
  onPick: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const max = Math.max(...question.chart.map((point) => point.value));
  return (
    <div className="cz-detail">
      <div className="cz-detail-main">
        <p className="cz-crumb">Q&amp;A Calibration Questions</p>
        <div className="cz-title-row">
          <h1>{question.text}</h1>
          <button className="btn btn-outlined" type="button">Rerun</button>
        </div>
        <div className="cz-meta-line">
          <span>Classified by: N/A</span>
          <span>Source: {question.source}</span>
          <span>Model: C360 Model</span>
          <span>{total - index} questions left to review</span>
        </div>
        <div className="cz-preview">
          <div>
            <h2>Q&amp;A Preview</h2>
            <p className="cz-ask">{question.text}</p>
            {!answerReady ? (
              <p className="cz-working">Understanding your request<br />Working…</p>
            ) : (
              <>
                <p>{question.answer}</p>
                <div className="cz-chart" aria-hidden="true">
                  {question.chart.map((point) => (
                    <div key={point.label} className="cz-bar-wrap">
                      <div className="cz-bar" style={{ height: `${(point.value / max) * 100}%` }} />
                      <span>{point.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <pre>{question.sql}</pre>
        </div>
      </div>
      <aside className="cz-rail cz-class">
        <h2>Classification</h2>
        <p>How would you classify the agent's response?</p>
        <button className="cz-choice" type="button" disabled>
          <strong>Inaccurate</strong>
          <span>Use this example to diagnose the issue and test semantic model calibrations.</span>
        </button>
        <button className={`cz-choice ${picked === 'accurate' ? 'picked' : ''}`} type="button" onClick={onPick}>
          <strong>Accurate</strong>
          <span>This response is correct and will be saved as the expected query for future agent responses.</span>
        </button>
        <div className="cz-class-actions">
          <button className="btn btn-outlined" type="button" onClick={onBack}>Back</button>
          <button className="btn btn-brand" type="button" disabled={picked !== 'accurate' || saving} onClick={onNext}>
            {saving ? 'Saving…' : index === total - 1 ? 'Finish' : 'Next Question'}
          </button>
        </div>
      </aside>
      {saving && <div className="cz-saving">Saving Classification...</div>}
    </div>
  );
}

function VerifiedPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="cz-page">
      <div className="cz-title-row">
        <h1>Verified Queries</h1>
        <button className="btn btn-outlined" type="button" onClick={onBack}>All Questions</button>
      </div>
      <section className="cz-card">
        <div className="cz-toolbar"><span>2 questions</span></div>
        <table className="cz-table">
          <thead>
            <tr>
              <th>Question</th>
              <th>Source</th>
              <th>Semantic Model</th>
              <th>Classification</th>
              <th>Verified Query</th>
            </tr>
          </thead>
          <tbody>
            {QUESTIONS.map((question) => (
              <tr key={question.id}>
                <td>{question.text}</td>
                <td>Manual</td>
                <td>C360</td>
                <td><span className="cz-pill cz-pill-good">Verified</span></td>
                <td><button className="cz-text-btn" type="button">Review</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: 'good' | 'alert' }) {
  return (
    <div className="cz-metric">
      <span>{label}</span>
      <strong className={tone ? `cz-${tone}` : undefined}>{value}</strong>
    </div>
  );
}

function ProgressBanner({ label, progress }: { label: string; progress: number }) {
  return (
    <div className="cz-progress">
      <div className="cz-progress-meta">
        <span>Agent: Concierge Sales</span>
        <span>Run by: Harry Anderson</span>
        <span>Start time 02/24/2023, 11:34 AM</span>
        <span>Description {label}</span>
      </div>
      <div className="cz-progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <small>Processing: {progress}% (1m 30s elapsed)</small>
    </div>
  );
}

function EmptyArt() {
  return (
    <svg className="cz-art" viewBox="0 0 220 120" aria-hidden="true">
      <path d="M20 90c24-28 40-28 58-8 12 14 22 10 34-6 14-18 28-16 46 4 10 12 22 10 42-8" fill="none" stroke="#7eb6ff" strokeWidth="3" />
      <circle cx="150" cy="38" r="10" fill="#d6e6ff" />
      <path d="M70 88l10-28 10 28M108 88l12-36 12 36" fill="#9ec5ff" />
    </svg>
  );
}

function SlackMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="1" y="4" width="3" height="6" rx="1" fill="#E01E5A" />
      <rect x="5" y="1" width="3" height="6" rx="1" fill="#36C5F0" />
      <rect x="9" y="4" width="3" height="6" rx="1" fill="#2EB67D" />
      <rect x="5" y="8" width="3" height="5" rx="1" fill="#ECB22E" />
    </svg>
  );
}

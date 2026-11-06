import { useEffect, useState } from 'react';
import { DotSpinner } from './components/DotSpinner';
import {
  AgentAstro,
  ArrowLeft,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Code,
  Grid,
  FilterIcon,
  Home,
  Plus,
  Search,
  Shield,
  SparkleSingle,
  ThumbsDown,
  ThumbsUp,
  Warning,
} from './components/Icons';

type Page = 'questions' | 'calibration' | 'verified' | 'classify' | 'home' | 'model';
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
  list: { source: string; up: number; down: number; modified: string };
}

const QUESTIONS: DemoQuestion[] = [
  {
    id: 'orders',
    text: 'Show me total orders by month',
    source: 'AI',
    model: 'C360',
    answer: 'I found a table called Orders, and here is the Total Orders by Month.',
    yLabel: 'Total Orders',
    list: { source: 'Manual', up: 31, down: 12, modified: '24 minutes ago' },
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
    list: { source: 'Feedback', up: 1, down: 0, modified: '12 hours ago' },
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

const HEALTH_MODELS = [
  { name: 'C360', description: 'Lorem ipsum dolor sit amet, consectetur adipiscing...', regression: 0, calibrations: 5, up: 1, down: 0, questions: 2, warn: true },
  { name: 'Marketing', description: 'Aliquam pulvinar vestibulum blandit. Donec sed ni...', regression: 10, calibrations: 5, up: 1, down: 0, questions: 5, warn: false },
  { name: 'Insights', description: 'Donec sed erat ut magna suscipit mattis. Aliquam...', regression: 3, calibrations: 20, up: 22, down: 2, questions: 20, warn: false },
  { name: 'ConversationalInten', description: 'Lorem ipsum dolor sit amet, consectetur adipiscin...', regression: 5, calibrations: 3, up: 7, down: 18, questions: 3, warn: false },
  { name: 'Relevia.ai', description: 'In a laoreet purus. Integer turpis quam, laoreet id...', regression: 8, calibrations: 8, up: 0, down: 9, questions: 9, warn: false },
  { name: 'InsightMatter.ai', description: 'Lorem ipsum dolor sit amet, consectetur adipiscin...', regression: 7, calibrations: 9, up: 11, down: 1, questions: 9, warn: false },
  { name: 'ChainLift AI', description: 'Vestibulum eu quam nec neque pellentesque effic...', regression: 11, calibrations: 4, up: 18, down: 3, questions: 4, warn: false },
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
  const [score, setScore] = useState(40);
  const [applyRunning, setApplyRunning] = useState(false);
  const [termDrafts, setTermDrafts] = useState<Record<string, string>>({ fresh: '', hq: '' });
  const [savedTerms, setSavedTerms] = useState<string[]>([]);
  const [openTerm, setOpenTerm] = useState('fresh');
  const [openCalibrationId, setOpenCalibrationId] = useState('');
  const [applied, setApplied] = useState<string[]>([]);
  const [classifyIndex, setClassifyIndex] = useState(0);
  const [answerReady, setAnswerReady] = useState(false);
  const [picked, setPicked] = useState<'accurate' | 'inaccurate' | null>(null);
  const [correction, setCorrection] = useState('');
  const [revisionReady, setRevisionReady] = useState(false);
  const [reclassified, setReclassified] = useState<'accurate' | 'inaccurate' | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSlack, setShowSlack] = useState(false);
  const [c360Test, setC360Test] = useState<'idle' | 'running' | 'passed'>('idle');
  const [c360Progress, setC360Progress] = useState(0);
  const [verifiedIds, setVerifiedIds] = useState<string[]>([]);

  const generated = phase !== 'empty' && phase !== 'generating';
  const bothVerified = verifiedIds.length === QUESTIONS.length;
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
    if (phase !== 'applied') return;
    setScore(40);
    setProgress(8);
    setApplyRunning(true);
    const tick = window.setInterval(() => {
      setProgress((value) => Math.min(value + 12, 100));
    }, 200);
    const hide = window.setTimeout(() => {
      setProgress(100);
      setApplyRunning(false);
    }, 1800);
    const lift = window.setTimeout(() => setScore(82), 2500);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(hide);
      window.clearTimeout(lift);
    };
  }, [phase]);

  useEffect(() => {
    if (page === 'verified' || page === 'model') setShowSlack(false);
  }, [page]);

  useEffect(() => {
    if (phase !== 'verified' || page !== 'questions') return;
    const timer = window.setTimeout(() => setShowSlack(true), 5000);
    return () => window.clearTimeout(timer);
  }, [phase, page]);

  useEffect(() => {
    if (c360Test !== 'running') return;
    setC360Progress(14);
    const tick = window.setInterval(() => {
      setC360Progress((value) => Math.min(value + 12, 100));
    }, 200);
    const done = window.setTimeout(() => {
      setC360Progress(100);
      setC360Test('passed');
    }, 1800);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(done);
    };
  }, [c360Test]);

  useEffect(() => {
    if (phase !== 'classify') return;
    setAnswerReady(false);
    setPicked(null);
    setCorrection('');
    setRevisionReady(false);
    setReclassified(null);
    setSaving(false);
    const timer = window.setTimeout(() => setAnswerReady(true), 1200);
    return () => window.clearTimeout(timer);
  }, [phase, classifyIndex]);

  const openQuestions = () => setPage('questions');
  const openHome = () => {
    if (bothVerified || phase === 'matched' || phase === 'retesting') setPage('home');
    else setPage('questions');
  };
  const openC360 = () => setPage('model');
  const runC360Test = () => {
    setPage('model');
    setC360Test('running');
  };
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
    const next = applied.includes(id) ? applied : [...applied, id];
    setApplied(next);
    if (openCalibrationId === id) setOpenCalibrationId('');
    const remaining = CALIBRATIONS.filter((item) => item.id !== 'description' && !next.includes(item.id));
    if (remaining.length === 0) setPhase('applied');
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

  const leaveQuestion = (nextVerified: string[]) => {
    if (classifyIndex < QUESTIONS.length - 1) {
      setClassifyIndex(classifyIndex + 1);
    } else if (nextVerified.length === QUESTIONS.length) {
      setPhase('verified');
      setPage('questions');
    } else {
      setPhase('terms');
      setPage('questions');
    }
  };

  const runClassification = (choice: 'accurate' | 'inaccurate') => {
    if (saving) return;
    setSaving(true);
    window.setTimeout(() => {
      const id = QUESTIONS[classifyIndex].id;
      const nextVerified = choice === 'accurate'
        ? (verifiedIds.includes(id) ? verifiedIds : [...verifiedIds, id])
        : verifiedIds.filter((item) => item !== id);
      setVerifiedIds(nextVerified);
      setSaving(false);
      leaveQuestion(nextVerified);
    }, 700);
  };

  const skipQuestion = () => {
    if (saving) return;
    const id = QUESTIONS[classifyIndex].id;
    leaveQuestion(verifiedIds.filter((item) => item !== id));
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
            <button className="back-arrow" type="button" aria-label="Back" onClick={openHome}>
              <ArrowLeft size={16} />
            </button>
            <span className="sidebar-title">Q&amp;A Calibration</span>
          </div>
          <nav className="nav" aria-label="Q&A Calibration">
            <button className={`nav-item ${page === 'home' ? 'active' : ''}`} type="button" onClick={openHome}>Home</button>
            <button className={`nav-item ${page === 'questions' ? 'active' : ''}`} type="button" onClick={openQuestions}>All Questions</button>
            <button className={`nav-item ${page === 'verified' || page === 'classify' ? 'active' : ''}`} type="button" onClick={openVerified}>Verified Queries</button>
            <button className={`nav-item ${page === 'calibration' ? 'active' : ''}`} type="button" onClick={openCalibration} disabled={!generated}>Model Calibration</button>
            <button className="nav-item" type="button">Tests</button>
          </nav>
        </aside>

        <main className={`canvas ${page === 'calibration' ? 'cz-split' : ''}`}>
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
              showProgress={phase === 'applied' && applyRunning}
              score={score}
              model={model}
              termDrafts={termDrafts}
              savedTerms={savedTerms}
              openTerm={openTerm}
              openCalibration={openCalibrationId}
              onToggleCalibration={setOpenCalibrationId}
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
            <ClassifyDetail
              question={activeQuestion}
              answerReady={answerReady}
              saving={saving}
              revised={revisionReady}
              onBack={() => {
                if (classifyIndex === 0) openCalibration();
                else setClassifyIndex(classifyIndex - 1);
              }}
            />
          )}
          {page === 'home' && (
            <HomePage onOpenC360={openC360} />
          )}
          {page === 'model' && (
            <C360ModelPage
              testing={c360Test === 'running'}
              passed={c360Test === 'passed'}
              progress={c360Progress}
              onRun={runC360Test}
              onBack={openHome}
            />
          )}
          {page === 'verified' && (
            <VerifiedPage
              testing={c360Test === 'running'}
              passed={c360Test === 'passed'}
              progress={c360Progress}
              onRun={runC360Test}
              onBack={openQuestions}
            />
          )}
        </main>
        {page === 'classify' && (
          <ClassificationRail
            total={QUESTIONS.length}
            accurateCount={verifiedIds.length}
            picked={picked}
            saving={saving}
            correction={correction}
            onCorrection={setCorrection}
            revisionReady={revisionReady}
            reclassified={reclassified}
            onApplyRevision={() => correction.trim() && setRevisionReady(true)}
            onPick={(choice) => {
              if (choice === 'inaccurate') setPicked('inaccurate');
              else runClassification('accurate');
            }}
            onRepick={(choice) => {
              setReclassified(choice);
              runClassification(choice);
            }}
            onChange={() => {
              setPicked(null);
              setRevisionReady(false);
              setReclassified(null);
            }}
            onBack={() => {
              if (classifyIndex === 0) openCalibration();
              else setClassifyIndex(classifyIndex - 1);
            }}
            onNext={skipQuestion}
          />
        )}
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
          Retest <ChevronDown size={12} />
        </button>
      </div>
      <div className="cz-metrics">
        <Metric label="Questions for review" value={reviewCount} />
        <Metric label="Regression" value={0} />
        <Metric label="VQs" value={verified ? QUESTIONS.length : 0} tone={verified ? 'good' : undefined} />
        <Metric label="Calibration Suggestions" value={suggestionCount} tone={suggestionCount ? 'alert' : undefined} />
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
          2 Calibration Suggestions are ready for the “{model}” model
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
            {verified && (
              <>
                <button className="btn btn-brand" type="button" onClick={onReview}>Review</button>
                <button className="icon-btn-bordered" type="button" aria-label="Filter"><FilterIcon size={14} /></button>
              </>
            )}
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
                <option value="Marketing">Marketing</option>
                <option value="C360">C360</option>
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
                {verified ? <th aria-label="Select" /> : null}
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
                  {verified ? <td><input type="checkbox" aria-label={`Select ${question.text}`} /></td> : null}
                  <td>
                    <button className="cz-q" type="button" onClick={verified ? onOpen : onReview}>{question.text}</button>
                  </td>
                  <td>{verified ? question.list.source : question.source}</td>
                  {verified ? (
                    <td>
                      <span className="rating">
                        <span><ThumbsUp size={12} /> {question.list.up}</span>
                        <span><ThumbsDown size={12} /> {question.list.down}</span>
                      </span>
                    </td>
                  ) : null}
                  <td>{question.model}</td>
                  <td>{verified ? question.list.modified : '24 minutes ago'}</td>
                  <td>{verified ? <span className="cz-pill cz-pill-good"><Shield size={12} /> Verified</span> : <span className="cz-pill">New</span>}</td>
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
  score,
  model,
  termDrafts,
  savedTerms,
  openTerm,
  openCalibration,
  onToggleCalibration,
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
  score: number;
  model: string;
  termDrafts: Record<string, string>;
  savedTerms: string[];
  openTerm: string;
  openCalibration: string;
  onToggleCalibration: (id: string) => void;
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
        <h1>Model Name - {model}</h1>
        <div className="cz-meta-line">
          <span>Generalization Score <b className={`cz-score ${score > 40 ? 'up' : ''}`}>{score}%</b></span>
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
            <section className="cz-cals">
              <h2>Suggested Calibrations</h2>
              {CALIBRATIONS.filter((item) => item.id !== 'description' && !applied.includes(item.id)).map((item) => {
                const open = openCalibration === item.id;
                return (
                  <article key={item.id} className="cz-cal-card">
                    <header>
                      <button type="button" className="cz-term-toggle" onClick={() => onToggleCalibration(open ? '' : item.id)}>
                        {open ? '▾' : '▸'} {item.title}
                        <span>{item.meta}</span>
                      </button>
                      <button type="button" className="cz-edit" onClick={() => onToggleCalibration(open ? '' : item.id)}>Edit in model</button>
                    </header>
                    {open && (
                      <>
                        <div className="cz-impact-row">
                          <span className={`cz-impact ${item.impact === 'High' ? 'high' : ''}`}>Impact: {item.impact}</span>
                          <span className="cz-impact-show">show</span>
                        </div>
                        {item.fields.map(([label, value]) => (
                          <label key={label}>
                            {label}
                            <textarea readOnly value={value} />
                          </label>
                        ))}
                        <button className="btn btn-brand cz-apply" type="button" onClick={() => onApply(item.id)}>
                          <Plus size={12} /> Apply
                        </button>
                      </>
                    )}
                  </article>
                );
              })}
              <button className="btn btn-outlined cz-apply-all" type="button" onClick={onApplyAll}>Apply All</button>
            </section>
          </>
        )}
      </aside>
    </div>
  );
}

function ClassifyDetail({
  question,
  answerReady,
  saving,
  revised,
  onBack,
}: {
  question: DemoQuestion;
  answerReady: boolean;
  saving: boolean;
  revised: boolean;
  onBack: () => void;
}) {
  const max = Math.max(...question.chart.map((point) => point.value));
  return (
    <div className="detail-view">
      <header className="authoring">
        <div className="breadcrumb">
          <a href="#" onClick={(event) => { event.preventDefault(); onBack(); }}>Q&amp;A Calibration Questions</a>
          <ChevronRight size={10} />
        </div>
        <div className="authoring-title-row">
          <button className="icon-btn-bordered back-arrow" type="button" onClick={onBack} aria-label="Back to questions">
            <ArrowLeft size={14} />
          </button>
          <h2 className="question-title">{question.text}</h2>
          <button className="btn-pill-outline" type="button">Rerun <ChevronDown size={12} /></button>
        </div>
      </header>

      <div className="details-bar">
        <div className="meta-item"><span className="meta-label">Classified by:</span><span className="meta-value muted">N/A</span></div>
        <div className="meta-item"><span className="meta-label">Classified at:</span><span className="meta-value muted">N/A</span></div>
        <div className="meta-item"><span className="meta-label">Source:</span><span className="meta-value">Manual</span></div>
        <div className="meta-item">
          <span className="meta-label">Rating:</span>
          <span className="rating"><span><ThumbsUp size={12} /> 0</span><span><ThumbsDown size={12} /> 2</span></span>
        </div>
        <div className="meta-item"><span className="meta-label">Model:</span><span className="meta-value">C360 Model</span></div>
      </div>

      <div className="evaluation-card-wrapper">
        <div className="evaluation-card">
          <section className="eval-panel">
            <div className="eval-panel-header"><span className="eval-panel-title">Q&amp;A Preview</span></div>
            <div className="eval-panel-body">
              <div className="message">
                <div className="avatar-sm user">
                  <img src={`${import.meta.env.BASE_URL}avatars/user-avatar.svg`} alt="" className="avatar-img" />
                </div>
                <div className="body">
                  <div className="author">Samantha Adams</div>
                  <div className="text">{question.text}</div>
                </div>
              </div>
              <div className="message">
                <div className="avatar-sm agent">
                  <img src={`${import.meta.env.BASE_URL}avatars/agent-avatar.svg`} alt="" className="avatar-img" />
                </div>
                <div className="body">
                  <div className="author">Agent</div>
                  {!answerReady ? (
                    <div className="agent-progress">
                      <div className="done"><Check size={12} /> Understanding your request</div>
                      <div className="done"><Check size={12} /> Identifying next steps</div>
                      <div className="working"><WorkingDots /> Working</div>
                    </div>
                  ) : (
                    <>
                      <div className="text">{question.answer}</div>
                      <div className="chart">
                        <div className="y-axis">{question.yLabel}</div>
                        <div className="chart-canvas" aria-hidden="true">
                          {question.chart.map((point) => (
                            <div key={point.label} className="chart-bar" style={{ height: `${(point.value / max) * 100}%` }} />
                          ))}
                        </div>
                        <div className="chart-x-axis">
                          {question.chart.map((point) => <span key={point.label}>{point.label}</span>)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
          <section className="eval-panel relative">
            <div className="eval-panel-header">
              <div className="panel-tabs">
                <button className="panel-tab active" type="button"><Code size={14} /> Query</button>
              </div>
            </div>
            <div className={`eval-panel-body no-pad cz-query-pane ${answerReady || revised ? '' : 'is-loading'}`}>
              {revised ? <QueryDiff questionId={question.id} /> : <pre>{question.sql}</pre>}
              {!answerReady && !revised && <DotSpinner />}
            </div>
          </section>
          {saving && (
            <div className="saving-blanket">
              <div className="spinner" />
              <div>Saving Classification...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClassificationRail({
  total,
  accurateCount,
  picked,
  saving,
  correction,
  onCorrection,
  revisionReady,
  reclassified,
  onApplyRevision,
  onPick,
  onRepick,
  onChange,
  onBack,
  onNext,
}: {
  total: number;
  accurateCount: number;
  picked: 'accurate' | 'inaccurate' | null;
  saving: boolean;
  correction: string;
  onCorrection: (value: string) => void;
  revisionReady: boolean;
  reclassified: 'accurate' | 'inaccurate' | null;
  onApplyRevision: () => void;
  onPick: (choice: 'accurate' | 'inaccurate') => void;
  onRepick: (choice: 'accurate' | 'inaccurate') => void;
  onChange: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const remaining = total - accurateCount;
  const progress = total > 0 ? Math.round((accurateCount / total) * 100) : 0;
  return (
    <aside className="builder-rail">
      <div className="classification-panel">
        <div className="classification-panel-header">Classification</div>
        <div className="classification-progress-section">
          <div className="progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-label"><strong>{remaining} questions</strong> left to review in model</div>
        </div>
        {picked === 'inaccurate' ? (
          <div className="inaccurate-body">
            <p className="inaccurate-prompt">Please describe what went wrong and the desired state (one issue at a time).</p>
            <div className={`ai-input-wrap ${correction.trim() ? 'has-content' : ''}`}>
              <div className="ai-input-glow" aria-hidden />
              <div className="ai-input">
                <span className="ai-input-icon" aria-hidden><SparkleSingle size={14} /></span>
                <textarea
                  className="ai-input-textarea"
                  value={correction}
                  onChange={(event) => onCorrection(event.target.value)}
                  rows={6}
                  placeholder="The agent used 'Total Orders' field but the expected query references 'Pipeline Value' instead."
                />
              </div>
            </div>
            <div className="cz-explain-row">
              <div className="alt-action">
                OR <button type="button" className="link-button" onClick={onChange}>Classify Manually</button>
              </div>
              <button className="btn-pill-outline" type="button" disabled={!correction.trim()} onClick={onApplyRevision}>Apply</button>
            </div>
            {revisionReady && (
              <>
                <p className="classification-prompt">How would you classify the agent&apos;s response?</p>
                <ChoiceCards picked={reclassified} onPick={onRepick} />
              </>
            )}
          </div>
        ) : (
          <div className="classification-body">
            <p className="classification-prompt">How would you classify the agent&apos;s response?</p>
            <ChoiceCards picked={picked} onPick={onPick} />
          </div>
        )}
        <div className="classification-actions">
          <button className="btn-pill-outline" type="button" onClick={picked === 'inaccurate' ? onChange : onBack}>Back</button>
          <button className="btn-pill-brand" type="button" disabled={saving} onClick={onNext}>
            {saving ? 'Saving…' : 'Next Question'}
          </button>
        </div>
      </div>
    </aside>
  );
}

function ChoiceCards({
  picked,
  onPick,
}: {
  picked: 'accurate' | 'inaccurate' | null;
  onPick: (choice: 'accurate' | 'inaccurate') => void;
}) {
  return (
    <div className="classification-cards equal-height">
      <button className={`classification-option inaccurate ${picked === 'inaccurate' ? 'selected' : ''}`} type="button" onClick={() => onPick('inaccurate')}>
        <div className="option-icon"><Warning size={16} /></div>
        <div className="option-content">
          <div className="option-title">Inaccurate</div>
          <div className="option-desc">Use this example to diagnose the issue and test semantic model calibrations.</div>
        </div>
        {picked === 'inaccurate' && <div className="option-check"><Check size={14} /></div>}
      </button>
      <button className={`classification-option verified ${picked === 'accurate' ? 'selected' : ''}`} type="button" onClick={() => onPick('accurate')}>
        <div className="option-icon"><Shield size={16} /></div>
        <div className="option-content">
          <div className="option-title">Accurate</div>
          <div className="option-desc">This response is correct and will be saved as expected query for future agent responses.</div>
        </div>
        {picked === 'accurate' && <div className="option-check"><Check size={14} /></div>}
      </button>
    </div>
  );
}

type QueryToken = { text: string; tone?: 'add' | 'del' };

const QUERY_DIFF: Record<string, QueryToken[][]> = {
  orders: [
    [{ text: 'WITH ranked_orders AS (' }],
    [{ text: '  SELECT month, COUNT(*) AS ' }, { text: 'total_orders', tone: 'del' }, { text: 'pipeline_value', tone: 'add' }],
    [{ text: "  FROM SEMANTIC_VIEW('sales_extended', DIMENSIONS " }, { text: 'Order.Month', tone: 'del' }, { text: 'Pipeline.Value', tone: 'add' }, { text: ')' }],
    [{ text: '  GROUP BY month' }],
    [{ text: ')' }],
    [{ text: 'SELECT month, ' }, { text: 'total_orders', tone: 'del' }, { text: ' pipeline_value', tone: 'add' }],
    [{ text: 'FROM ranked_orders' }],
    [{ text: 'ORDER BY month' }],
  ],
  conversion: [
    [{ text: 'SELECT source, AVG(' }, { text: 'conversion_rate', tone: 'del' }, { text: 'pipeline_value', tone: 'add' }, { text: ') AS avg_conversion' }],
    [{ text: "FROM SEMANTIC_VIEW('sales_extended', DIMENSIONS " }, { text: 'Lead.Source', tone: 'del' }, { text: 'Pipeline.Source', tone: 'add' }, { text: ')' }],
    [{ text: "WHERE close_month = DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'" }],
    [{ text: 'GROUP BY source' }],
  ],
};

function QueryDiff({ questionId }: { questionId: string }) {
  const lines = QUERY_DIFF[questionId] ?? [];
  return (
    <pre className="cz-query-diff">
      {lines.map((line, index) => (
        <div key={index}>
          {line.map((token, tokenIndex) => (
            <span key={tokenIndex} className={token.tone ? `cz-token-${token.tone}` : undefined}>{token.text}</span>
          ))}
        </div>
      ))}
    </pre>
  );
}

function WorkingDots() {
  return (
    <span className="cz-working-dots" aria-hidden="true">
      <i /><i /><i />
    </span>
  );
}

function C360ModelPage({
  testing,
  passed,
  progress,
  onRun,
  onBack,
}: {
  testing: boolean;
  passed: boolean;
  progress: number;
  onRun: () => void;
  onBack: () => void;
}) {
  return (
    <div className="cz-page">
      <div className="cz-title-row">
        <h1 className="cz-warn-name"><Warning size={18} /> C360</h1>
        <div className="cz-tools">
          <button className="btn btn-outlined" type="button" onClick={onBack}>Overall Health</button>
          <button className="btn btn-brand" type="button" onClick={onRun} disabled={testing}>
            {testing ? 'Running test…' : 'Run verified query test'}
          </button>
        </div>
      </div>
      <p className="cz-model-note">This model was updated. Run the verified queries to confirm they still match.</p>
      {testing && <ProgressBanner label="Running verified query test on C360" progress={progress} />}
      {passed && !testing && <div className="cz-match">Verified query test passed. The C360 questions still match.</div>}
      <section className="cz-card">
        <div className="cz-toolbar"><span>2 verified questions</span></div>
        <table className="cz-table">
          <thead>
            <tr>
              <th>Question</th>
              <th>Source</th>
              <th>Semantic Model</th>
              <th>Classification</th>
            </tr>
          </thead>
          <tbody>
            {QUESTIONS.map((question) => (
              <tr key={question.id}>
                <td>{question.text}</td>
                <td>{question.list.source}</td>
                <td>C360</td>
                <td>
                  <span className={`cz-pill ${passed ? 'cz-pill-good' : ''}`}>
                    {passed ? <><Shield size={12} /> Passed</> : <><Shield size={12} /> Verified</>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function HomePage({ onOpenC360 }: { onOpenC360: () => void }) {
  return (
    <div className="cz-page">
      <h1>Overall Health</h1>
      <div className="cz-metrics cz-metrics-3">
        <Metric label="VQ's in Regression" value={0} />
        <Metric label="calibration Suggestions" value={0} />
        <Metric label="Questions in low scoring" value={0} />
      </div>
      <h2 className="cz-section-title">Health by Model</h2>
      <section className="cz-card">
        <div className="cz-toolbar">
          <span />
          <div className="cz-tools">
            <span className="cz-fake-select">Score <ChevronDown size={12} /></span>
            <label className="cz-search">
              <Search size={14} />
              <input aria-label="Search models" placeholder="Search..." />
            </label>
          </div>
        </div>
        <table className="cz-table">
          <thead>
            <tr>
              <th aria-label="Select" />
              <th>Model Name</th>
              <th>Description</th>
              <th>VQ's in regression</th>
              <th>Calibrations</th>
              <th>Q&amp;A Score</th>
              <th>Questions</th>
            </tr>
          </thead>
          <tbody>
            {HEALTH_MODELS.map((item) => (
              <tr key={item.name}>
                <td><input type="checkbox" aria-label={`Select ${item.name}`} /></td>
                <td>
                  {item.warn ? (
                    <button className="cz-q cz-warn-name" type="button" onClick={onOpenC360}>
                      <Warning size={14} /> {item.name}
                    </button>
                  ) : (
                    <button className="cz-q" type="button">{item.name}</button>
                  )}
                </td>
                <td>{item.description}</td>
                <td>{item.regression > 0 ? <span className="cz-reg">{item.regression}</span> : 0}</td>
                <td>{item.calibrations}</td>
                <td>
                  <span className="rating">
                    <span><ThumbsUp size={12} /> {item.up}</span>
                    <span><ThumbsDown size={12} /> {item.down}</span>
                  </span>
                </td>
                <td><span className="cz-count">{item.questions}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function VerifiedPage({
  testing,
  passed,
  progress,
  onRun,
  onBack,
}: {
  testing: boolean;
  passed: boolean;
  progress: number;
  onRun: () => void;
  onBack: () => void;
}) {
  return (
    <div className="cz-page">
      <div className="cz-title-row">
        <h1>Verified Queries</h1>
        <button className="btn btn-brand" type="button" onClick={onRun} disabled={testing}>
          {testing ? 'Testing C360…' : 'Run test on C360'}
        </button>
      </div>
      {testing && <ProgressBanner label="Testing the C360 model" progress={progress} />}
      {passed && <div className="cz-match">C360 test passed. The verified questions still match.</div>}
      <section className="cz-card">
        <div className="cz-toolbar"><span>2 questions · C360</span></div>
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
                <td>{question.list.source}</td>
                <td>C360</td>
                <td><span className="cz-pill cz-pill-good"><Shield size={12} /> Verified</span></td>
                <td><button className="cz-text-btn" type="button" onClick={onBack}>Review</button></td>
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

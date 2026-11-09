import { useEffect, useRef, useState } from 'react';
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

type Page = 'semantic' | 'questions' | 'calibration' | 'verified' | 'classify' | 'home' | 'model';
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

const SECOND_QUESTIONS: { text: string; finding: 'clear' | 'missing' }[] = [
  { text: 'What is the average NPS score of all customers that have critical tickets and open pipelines?', finding: 'clear' },
  { text: 'Compare lead conversion rate in the prior month for different sources, when responding to pipeline questions', finding: 'clear' },
  { text: 'What is our average days to close?', finding: 'missing' },
  { text: 'Show me the total sales amount and opportunity type for closed won deals', finding: 'missing' },
  { text: 'How does the average deal size of opportunities for new business compare to existing?', finding: 'clear' },
  { text: 'Compare the average deal size for each lead source.', finding: 'clear' },
  { text: "What's the total opportunity amount by opportunity stage for this quarter", finding: 'clear' },
  { text: 'Total opportunity amount between aug 1 2024 and dec 1 2024, by closed date and stage', finding: 'clear' },
  { text: 'Whats the Average Deal Size this Quarter?', finding: 'clear' },
  { text: 'List unconverted leads grouped by rating level and acquisition channel', finding: 'clear' },
  { text: 'Compare lead conversion rate in the prior month for different sources, when responding to pipeline questions', finding: 'clear' },
  { text: "What's the total opportunity amount by opportunity stage for this quarter", finding: 'clear' },
  { text: 'Which lead sources are generating the highest number of converted leads this quarter?', finding: 'clear' },
];

const QUESTION_CATALOG: { text: string; up: number; down: number; verified: boolean }[] = [
  { text: 'Show me total orders by month', up: 31, down: 12, verified: true },
  { text: 'Compare lead conversion rate in the prior month for different sources, when responding to pipeline questions', up: 1, down: 0, verified: true },
  { text: 'Show me the total sales amount and opportunity type for closed won deals', up: 22, down: 2, verified: true },
  { text: 'How does the average deal size of opportunities for new business compare to existing?', up: 7, down: 18, verified: true },
  { text: 'How does the average deal size of opportunities for new business compare to existing?', up: 0, down: 0, verified: false },
  { text: 'Compare the average deal size for each lead source.', up: 11, down: 1, verified: false },
  { text: "What's the total opportunity amount by opportunity stage for this quarter", up: 18, down: 3, verified: false },
  { text: "What's the total opportunity amount by opportunity stage for this quarter", up: 16, down: 0, verified: false },
  { text: 'Which lead sources are generating the highest number of converted leads this quarter?', up: 41, down: 0, verified: false },
  { text: 'Which account types have the lowest lead conversion rates?', up: 19, down: 6, verified: false },
  { text: 'Total opportunity amount between aug 1 2024 and dec 1 2024, by closed date and stage', up: 0, down: 0, verified: false },
  { text: "What's the total opportunity amount by opportunity stage for this quarter", up: 71, down: 1, verified: false },
  { text: 'Are there any significant differences in the average sales cycle length for new business versus existing business?', up: 0, down: 0, verified: false },
  { text: 'What is the average deal size for opportunities won in key accounts this quarter?', up: 0, down: 0, verified: false },
  { text: 'Whats the Average Deal Size this Quarter?', up: 0, down: 0, verified: false },
  { text: 'What is the average NPS score of all customers that have critical tickets and open pipelines?', up: 4, down: 1, verified: false },
  { text: 'What is our average days to close?', up: 8, down: 2, verified: false },
  { text: 'List unconverted leads grouped by rating level and acquisition channel', up: 3, down: 0, verified: false },
  { text: 'Show me pipeline coverage by sales team for the current quarter', up: 12, down: 1, verified: false },
  { text: 'How many opportunities moved to closed won this month?', up: 9, down: 0, verified: false },
  { text: 'Which products have the highest discount rate on closed won deals?', up: 2, down: 4, verified: false },
  { text: 'Compare win rate by lead source for the last two quarters', up: 6, down: 1, verified: false },
  { text: 'What is the total open pipeline amount by forecast category?', up: 15, down: 0, verified: false },
  { text: 'Show me accounts with no activity in the last 30 days', up: 1, down: 3, verified: false },
  { text: 'How does quota attainment compare across sales regions?', up: 7, down: 2, verified: false },
  { text: 'Which campaigns created the most qualified leads this quarter?', up: 5, down: 0, verified: false },
];

const SECOND_SUGGESTIONS = [
  { id: 'deals-description', title: 'Add Description', meta: 'Deals' },
  { id: 'opportunity-description', title: 'Add Description', meta: 'Opportunity' },
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
  const [page, setPage] = useState<Page>('semantic');
  const [phase, setPhase] = useState<Phase>('empty');
  const [model, setModel] = useState('Sales');
  const [queryCount, setQueryCount] = useState('');
  const [calibrationDetail, setCalibrationDetail] = useState(false);
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
  const [calibrationDot, setCalibrationDot] = useState(false);
  const [secondDone, setSecondDone] = useState(false);
  const [showSlack, setShowSlack] = useState(false);
  const [slackLeaving, setSlackLeaving] = useState(false);
  const [slackShown, setSlackShown] = useState(false);
  const skipQuestionLanding = useRef(false);
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
    if (page !== 'questions') return;
    if (!calibrationDot || skipQuestionLanding.current) return;
    setSecondDone(true);
  }, [page, calibrationDot]);

  useEffect(() => {
    if (!secondDone || page !== 'questions' || slackShown) return;
    const timer = window.setTimeout(() => {
      setSlackShown(true);
      setShowSlack(true);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [secondDone, page, slackShown]);

  useEffect(() => {
    if (!showSlack || slackLeaving) return;
    const timer = window.setTimeout(() => setSlackLeaving(true), 10000);
    return () => window.clearTimeout(timer);
  }, [showSlack, slackLeaving]);

  useEffect(() => {
    if (!slackLeaving) return;
    const timer = window.setTimeout(() => {
      setShowSlack(false);
      setSlackLeaving(false);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [slackLeaving]);

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

  const openQuestions = () => {
    skipQuestionLanding.current = false;
    if (calibrationDot) setSecondDone(true);
    setPage('questions');
  };
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
    if (!model || !queryCount || phase !== 'empty') return;
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
    if (calibrationDot) {
      const next = [...new Set([...applied, ...SECOND_SUGGESTIONS.map((item) => item.id)])];
      setApplied(next);
      setSecondDone(true);
      setPage('questions');
      return;
    }
    const suggested = CALIBRATIONS.filter((item) => item.id !== 'description');
    const revealed = suggested.filter((_, index) => savedTerms.includes(TERMS[index]?.id)).map((item) => item.id);
    if (revealed.length === 0) return;
    const next = [...new Set([...applied, ...revealed])];
    setApplied(next);
    if (suggested.every((item) => next.includes(item.id))) setPhase('applied');
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
    } else {
      setCalibrationDot(true);
      skipQuestionLanding.current = true;
      if (nextVerified.length === QUESTIONS.length) {
        setPhase('verified');
        setPage('questions');
      } else {
        setPhase('terms');
        setPage('questions');
      }
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

      {page === 'semantic' ? (
        <SalesModel onOpenQa={() => { setModel('Sales'); setPage('questions'); }} />
      ) : (
      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-header">
            <button className="back-arrow" type="button" aria-label="Back" onClick={openHome}>
              <ArrowLeft size={16} />
            </button>
            <span className="sidebar-title">Q&amp;A Calibration</span>
          </div>
          <nav className="nav" aria-label="Q&A Calibration">
            {page === 'verified' ? (
              <>
                <button className="nav-item" type="button" onClick={openQuestions}>All Questions</button>
                <button className="nav-item" type="button" onClick={() => { setCalibrationDetail(false); openCalibration(); }}>calibrations</button>
                <button className="nav-item active" type="button" onClick={openVerified}>Verified Queries</button>
              </>
            ) : (
              <>
                <button className={`nav-item ${page === 'home' ? 'active' : ''}`} type="button" onClick={openHome}>Home</button>
                <button className={`nav-item ${page === 'questions' ? 'active' : ''}`} type="button" onClick={openQuestions}>All Questions</button>
                <button className={`nav-item ${page === 'classify' ? 'active' : ''}`} type="button" onClick={openVerified}>Verified Queries</button>
                <button className={`nav-item cz-nav-calibration ${page === 'calibration' ? 'active' : ''}`} type="button" onClick={() => { setCalibrationDetail(false); openCalibration(); }} disabled={!generated}>
                  Model Calibration
                  {calibrationDot && <span className="cz-nav-dot" aria-hidden="true" />}
                </button>
                <button className="nav-item" type="button">Tests</button>
              </>
            )}
          </nav>
        </aside>

        <main className={`canvas ${page === 'calibration' && calibrationDetail ? 'cz-split' : ''} ${page === 'verified' || (page === 'calibration' && !calibrationDetail) ? 'cz-canvas-plain' : ''}`}>
          {page === 'questions' && (
            <QuestionsPage
              phase={phase}
              model={model}
              queryCount={queryCount}
              progress={progress}
              reviewCount={reviewCount}
              suggestionCount={suggestionCount}
              verified={bothVerified}
              matched={phase === 'matched'}
              onModel={setModel}
              onQueryCount={setQueryCount}
              onGenerate={generate}
              onReview={() => { setCalibrationDetail(false); openCalibration(); }}
              onRetest={retest}
              expanded={secondDone}
              onOpen={() => {
                if (bothVerified) {
                  setPage('verified');
                }
              }}
            />
          )}
          {page === 'calibration' && !calibrationDetail && (
            <CalibrationHome
              model={model || 'Sales'}
              queryCount={queryCount || '2'}
              score={calibrationDot ? 40 : null}
              verifiedCount={verifiedIds.length}
              onReview={() => setCalibrationDetail(true)}
            />
          )}
          {page === 'calibration' && calibrationDetail && (
            <CalibrationPage
              progress={phase === 'applied' ? progress : 0}
              showProgress={phase === 'applied' && applyRunning && !calibrationDot}
              score={calibrationDot ? 60 : null}
              followUp={calibrationDot}
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
                if (classifyIndex === 0) {
                  setCalibrationDetail(true);
                  openCalibration();
                } else setClassifyIndex(classifyIndex - 1);
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
            canGoBack={classifyIndex > 0}
            onBack={() => setClassifyIndex(classifyIndex - 1)}
            onNext={skipQuestion}
          />
        )}
      </div>
      )}

      {showSlack && (
        <aside className={`cz-slack${slackLeaving ? ' is-leaving' : ''}`} role="status">
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
  queryCount,
  progress,
  reviewCount,
  suggestionCount,
  verified,
  matched,
  onModel,
  onQueryCount,
  onGenerate,
  onReview,
  onRetest,
  onOpen,
  expanded,
}: {
  phase: Phase;
  model: string;
  queryCount: string;
  progress: number;
  reviewCount: number;
  suggestionCount: number;
  verified: boolean;
  matched: boolean;
  onModel: (value: string) => void;
  onQueryCount: (value: string) => void;
  onGenerate: () => void;
  onReview: () => void;
  onRetest: () => void;
  onOpen: () => void;
  expanded: boolean;
}) {
  const showList = phase !== 'empty' && phase !== 'generating';
  const busy = phase === 'generating' || phase === 'retesting';
  return (
    <div className="cz-page">
      <div className="cz-title-row">
        <h1>All Questions</h1>
        {expanded ? (
          <button className="btn btn-outlined" type="button">Add Question <ChevronDown size={12} /></button>
        ) : (
          <button className="btn btn-outlined" type="button" onClick={onRetest} disabled={!verified && phase !== 'matched'}>
            Retest <ChevronDown size={12} />
          </button>
        )}
      </div>
      {!expanded && <div className="cz-metrics">
        <Metric label="Questions for review" value={reviewCount} />
        <Metric label="Regression" value={0} />
        <Metric label="VQs" value={verified ? QUESTIONS.length : 0} tone={verified ? 'good' : undefined} />
        <Metric label="Calibration Suggestions" value={suggestionCount} tone={suggestionCount ? 'alert' : undefined} />
      </div>}
      {busy && (
        <ProgressBanner
          label={phase === 'retesting' ? 'Running batch regression' : `Generating ${queryCount || ''} questions from model`}
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
          <span>{expanded ? `${QUESTION_CATALOG.length} questions` : showList ? `${QUESTIONS.length} questions` : '0 questions'}</span>
          <div className="cz-tools">
            <span className="cz-fake-select">Any classification <ChevronDown size={12} /></span>
            <span className="cz-fake-select">{expanded ? 'Sales' : 'Any model'} <ChevronDown size={12} /></span>
            <label className="cz-search">
              <Search size={14} />
              <input aria-label="Search questions" placeholder="Search..." />
            </label>
            {expanded ? (
              <button className="icon-btn-bordered" type="button" aria-label="Refresh"><RefreshIcon /></button>
            ) : verified && (
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
            <div className="cz-generate-row">
              <label className="cz-model">
                <span className="cz-sr">Semantic model</span>
                <select value={model} onChange={(event) => onModel(event.target.value)} aria-label="Semantic model">
                  <option value="">Select a model</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                  <option value="C360">C360</option>
                </select>
              </label>
              <label className="cz-model cz-count">
                <span className="cz-sr">Number of questions</span>
                <select value={queryCount} onChange={(event) => onQueryCount(event.target.value)} aria-label="Number of questions">
                  <option value="">Number of questions</option>
                  <option value="2">2</option>
                  <option value="5">5</option>
                  <option value="10">10</option>
                </select>
              </label>
            </div>
            <button className="btn btn-brand" type="button" disabled={!model || !queryCount || phase === 'generating'} onClick={onGenerate}>
              Generate
            </button>
          </div>
        ) : expanded ? (
          <table className="cz-table">
            <thead>
              <tr>
                <th aria-label="Select" />
                <th>Question</th>
                <th>Source</th>
                <th>Rating</th>
                <th>Semantic Model</th>
                <th>Last Modified</th>
                <th>Classification</th>
                <th>Verified Query</th>
              </tr>
            </thead>
            <tbody>
              {QUESTION_CATALOG.map((question, index) => (
                <tr key={`${question.text}-${index}`}>
                  <td><input type="checkbox" aria-label={`Select ${question.text}`} /></td>
                  <td><button className="cz-q" type="button" onClick={question.verified ? onOpen : onReview}>{question.text}</button></td>
                  <td>AI Generated</td>
                  <td>
                    <span className="rating">
                      <span><ThumbsUp size={12} /> {question.up}</span>
                      <span><ThumbsDown size={12} /> {question.down}</span>
                    </span>
                  </td>
                  <td>C360</td>
                  <td>24 minutes ago</td>
                  <td>
                    {question.verified
                      ? <span className="cz-pill cz-pill-good"><Shield size={12} /> Verified</span>
                      : <span className="cz-pill">New</span>}
                  </td>
                  <td>{question.verified ? <button className="cz-text-btn" type="button" onClick={onOpen}>Review</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
  followUp,
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
  score: number | null;
  followUp: boolean;
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
  const suggested = CALIBRATIONS.filter((item) => item.id !== 'description');
  const unlockedSuggestions = suggested.filter((_, index) => savedTerms.includes(TERMS[index]?.id));
  const visibleSuggestions = followUp
    ? SECOND_SUGGESTIONS.filter((item) => !applied.includes(item.id)).map((item) => ({
        ...item,
        impact: 'Medium',
        fields: [] as [string, string][],
      }))
    : unlockedSuggestions.filter((item) => !applied.includes(item.id));
  const questions = followUp
    ? SECOND_QUESTIONS
    : QUESTIONS.map((question) => ({ text: question.text, finding: 'missing' as const }));
  return (
    <div className="cz-cal">
      <div className="cz-cal-main">
        <h1>Model Name - {model}</h1>
        <div className="cz-meta-line">
          <span>Generalization Score <b className={`cz-score${score === null ? ' na' : !followUp && score > 40 ? ' up' : ''}`}>{score === null ? 'NA' : `${score}%`}</b></span>
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
            {questions.map((question, index) => (
              <tr key={`${question.text}-${index}`}>
                <td>{question.text}</td>
                <td><span className="cz-pill">New</span></td>
                <td>
                  {question.finding === 'missing'
                    ? <span className="cz-pill cz-pill-warn">{followUp ? 'Missing Definition' : 'Missing Definitions'}</span>
                    : <span className="cz-pill">Intent Clear</span>}
                </td>
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
            <div className="cz-rail-scroll">
            {followUp && (
              <div className="cz-cal-filters">
                <select aria-label="Calibration type" defaultValue="all"><option value="all">All Calibrations Types</option></select>
                <select aria-label="Impact" defaultValue="any"><option value="any">Impact</option></select>
              </div>
            )}
            {!followUp && (
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
            )}
            <section className="cz-cals">
              <h2>Suggested Calibrations</h2>
              {visibleSuggestions.map((item) => {
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
            </section>
            </div>
            <button className="btn btn-outlined cz-apply-all" type="button" onClick={onApplyAll} disabled={!followUp && unlockedSuggestions.length === 0}>Apply All</button>
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
  canGoBack,
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
  canGoBack: boolean;
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
          <button className="btn-pill-outline" type="button" disabled={picked !== 'inaccurate' && !canGoBack} onClick={picked === 'inaccurate' ? onChange : onBack}>Back</button>
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
          <div className="option-title">Verified</div>
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

function SalesModel({ onOpenQa }: { onOpenQa: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const objects = [
    ['Account', 17],
    ['Account Contact', 31],
    ['Case', 27],
    ['ForecastingQuota', 19],
    ['Goods Product', 14],
    ['Lead', 39],
    ['Master Product', 19],
    ['Opportunity', 34],
    ['Opportunity Product', 16],
    ['Period_Home', 15],
    ['User', 15],
  ] as const;
  return (
    <div className="sm">
      <div className="sm-titlebar">
        <h1>Sales</h1>
        <div className="sm-title-actions">
          <button className="btn btn-outlined" type="button">Share</button>
          <button className="btn btn-outlined" type="button">Tableau Agent <ChevronDown size={12} /></button>
          <button className="btn" type="button">Create Visualization</button>
        </div>
      </div>
      <div className="sm-tabs">
        <button className="sm-tab" type="button">Semantic DX</button>
        <button className="sm-tab" type="button">Test</button>
        <button className={`sm-tab ${menuOpen ? 'open' : ''}`} type="button" onClick={() => setMenuOpen((open) => !open)}>
          AI Optimization
          <span className="sm-alert" aria-label="Needs attention" />
          <ChevronDown size={12} />
        </button>
        {menuOpen && (
          <div className="sm-menu" role="menu">
            <button className="sm-menu-item" type="button" role="menuitem">
              <span>Optimize Model</span>
              <b className="sm-weak">Weak</b>
            </button>
            <button className="sm-menu-item" type="button" role="menuitem">Manage Business Preferences</button>
            <div className="sm-menu-item sm-menu-qa">
              <span>Verified Queries</span>
              <b className="sm-none">None</b>
              <button className="sm-open-qa" type="button" aria-label="Open Q&A Calibration" onClick={onOpenQa}>
                <ExternalIcon />
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="sm-body">
        <aside className="sm-tree">
          <div className="sm-tree-head">
            <strong>Model</strong>
            <span>New</span>
          </div>
          <div className="sm-tree-switch">
            <button type="button" className="active">Objects</button>
            <button type="button">Model Filters</button>
          </div>
          <label className="sm-search">
            <Search size={14} />
            <input aria-label="Search the model" placeholder="Search" />
          </label>
          <div className="sm-group">Metrics (8)</div>
          <div className="sm-group">Calculated Fields (3)</div>
          <div className="sm-group open">Data Objects (11)</div>
          <ul>
            {objects.map(([name, count]) => (
              <li key={name}><i />{name} <span>({count})</span></li>
            ))}
          </ul>
        </aside>
        <div className="sm-canvas">
          <div className="sm-diagram">
            <svg className="sm-lines" viewBox="0 0 1000 460" aria-hidden="true">
              <path d="M118 80H190V380H118M190 220H250M310 220H820M660 240V360H820" />
            </svg>
            <ModelNode icon="person" label="Email Engagement" left="8%" top="17%" />
            <ModelNode icon="person" label="Message Engagement" left="8%" top="48%" />
            <ModelNode icon="person" tone="purple" label="Email Conversion" left="8%" top="83%" />
            <ModelNode icon="link" label="Campaign" left="28%" top="48%" />
            <ModelNode icon="link" label="Product" left="46%" top="48%" />
            <ModelNode icon="recycle" tone="purple" label="Transactions" left="66%" top="48%" />
            <ModelNode icon="link" label="Stores" left="84%" top="48%" />
            <ModelNode icon="link" label="Website" left="84%" top="78%" />
            <ModelNode icon="grid" tone="orange" label="Dates" left="96%" top="62%" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ModelNode({
  icon,
  tone = 'pink',
  label,
  left,
  top,
}: {
  icon: 'person' | 'link' | 'recycle' | 'grid';
  tone?: 'pink' | 'purple' | 'orange';
  label: string;
  left: string;
  top: string;
}) {
  return (
    <span className="sm-obj" style={{ left, top }}>
      <span className={`sm-orb ${tone}`}>
        {icon === 'person' && <PersonGlyph />}
        {icon === 'link' && <LinkGlyph />}
        {icon === 'recycle' && <RecycleGlyph />}
        {icon === 'grid' && <GridGlyph />}
      </span>
      <span className="sm-obj-label">{label}</span>
    </span>
  );
}

function PersonGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="5" r="2.1" fill="#fff" />
      <path d="M3.4 13.2c.7-2.5 2.4-3.7 4.6-3.7s3.9 1.2 4.6 3.7" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LinkGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8.5" r="1.5" fill="#fff" />
      <circle cx="4" cy="4" r="1.35" fill="#fff" />
      <circle cx="12" cy="4" r="1.35" fill="#fff" />
      <circle cx="8" cy="13" r="1.35" fill="#fff" />
      <path d="M5.1 5 6.8 7.2M10.9 5 9.2 7.2M8 10v1.6" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function RecycleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2.8 9.2 4.6H6.8L8 2.8ZM3.6 8.2l1.6-1.8 1.1 2.1-2.7-.3ZM12.4 8.2l-1.6-.3 1.1-2.1 1.6 1.8Z" fill="#fff" />
      <path d="M5.2 6.2A3.1 3.1 0 0 1 10.6 5M10.8 9.8A3.1 3.1 0 0 1 5.4 11" fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function GridGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="3" width="10" height="10" rx="1" fill="none" stroke="#fff" strokeWidth="1.3" />
      <path d="M3 6.5h10M3 9.5h10M6.5 3v10M9.5 3v10" stroke="#fff" strokeWidth="1.1" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M5 3H3.5A1.5 1.5 0 0 0 2 4.5v6A1.5 1.5 0 0 0 3.5 12h6A1.5 1.5 0 0 0 11 10.5V9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M7.5 2H12v4.5M12 2 6.5 7.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

const SALES_VERIFIED = [
  { text: 'Show me total orders by month.', source: 'Manual', up: 31, down: 12, modified: '24 minutes ago' },
  { text: 'Compare lead conversion rate in the prior month for different sources, when respond...', source: 'Manual', up: 1, down: 0, modified: '12 hours ago' },
  { text: 'Show me the total sales amount and opportunity type for closed won deals.', source: 'Manual', up: 22, down: 2, modified: 'Feb 02, 2024' },
  { text: 'How does the average deal size of opportunities for new business compare to existing?', source: 'AI Generated', up: 7, down: 18, modified: 'Feb 01, 2024' },
  { text: "What's the total opportunity amount by opportunity stage for this quarter?", source: 'Manual', up: 0, down: 5, modified: 'Jan 28, 2024' },
  { text: 'Whats the Average Deal Size this Quarter?', source: 'Manual', up: 11, down: 1, modified: 'Jan 27, 2024' },
];

function CalibrationHome({
  model,
  queryCount,
  score,
  verifiedCount,
  onReview,
}: {
  model: string;
  queryCount: string;
  score: number | null;
  verifiedCount: number;
  onReview: () => void;
}) {
  return (
    <div className="cz-page cz-cal-home">
      <h1>Calibration</h1>
      <section className="cz-cal-summary">
        <div>
          <h2>Model Name : {model}</h2>
          <div className="cz-cal-meta">
            <span>Generalization Score <b className={`cz-score${score === null ? ' na' : ''}`}>{score === null ? 'NA' : `${score}%`}</b></span>
            <span>Created: <b>20 minutes ago</b></span>
            <span>Number of questions: <b>{queryCount}</b></span>
            <span>Verified Queries <b>{verifiedCount}</b></span>
            <span>Calibration Suggestions <b>2</b></span>
          </div>
        </div>
        <div className="cz-cal-actions">
          <button className="btn" type="button" onClick={onReview}>Review</button>
          <button className="btn btn-brand" type="button" onClick={onReview}>Scan for Calibrations</button>
        </div>
      </section>
    </div>
  );
}

function VerifiedPage({
  onBack,
}: {
  testing: boolean;
  passed: boolean;
  progress: number;
  onRun: () => void;
  onBack: () => void;
}) {
  const [modelOpen, setModelOpen] = useState(true);
  const [customOpen, setCustomOpen] = useState(false);
  const [suite, setSuite] = useState<'sales' | 'c360'>('sales');
  const [run, setRun] = useState<'idle' | 'running' | 'passed'>('idle');
  const [progress, setProgress] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (run !== 'running') return;
    setProgress(12);
    const tick = window.setInterval(() => {
      setProgress((value) => Math.min(value + 10, 96));
    }, 180);
    const done = window.setTimeout(() => {
      setProgress(100);
      setRun('passed');
    }, 1800);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(done);
    };
  }, [run]);

  const rows = (suite === 'sales' ? SALES_VERIFIED : QUESTIONS.map((question) => ({
    text: question.text,
    source: question.list.source,
    up: question.list.up,
    down: question.list.down,
    modified: question.list.modified,
  }))).filter((row) => row.text.toLowerCase().includes(query.trim().toLowerCase()));
  const modelName = suite === 'sales' ? 'Sales' : 'C360';

  return (
    <div className="cz-vq-page">
      <aside className="cz-suite-card">
        <div className="cz-suite-label">All Verified Queries</div>
        <button className="cz-suite-toggle" type="button" onClick={() => setModelOpen((open) => !open)}>
          {modelOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Model Test Suites
        </button>
        {modelOpen && (
          <div className="cz-suite-items">
            <button className={`cz-suite-item ${suite === 'sales' ? 'active' : ''}`} type="button" onClick={() => { setSuite('sales'); setRun('idle'); }}>Sales Model</button>
            <button className={`cz-suite-item ${suite === 'c360' ? 'active' : ''}`} type="button" onClick={() => { setSuite('c360'); setRun('idle'); }}>C360 Model</button>
          </div>
        )}
        <button className="cz-suite-toggle" type="button" onClick={() => setCustomOpen((open) => !open)}>
          {customOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Custom Test Suites
        </button>
      </aside>
      <section className="cz-vq-main">
        <div className="cz-vq-head">
          <h1>Verified Queries - {modelName} Model</h1>
          <button className="btn btn-brand" type="button" onClick={() => setRun('running')} disabled={run === 'running'}>Test Model</button>
        </div>
        {run === 'running' && (
          <div className="cz-vq-run">
            <ProgressBanner label="Regression test for selected questions" progress={progress} />
            <button className="cz-stop" type="button" aria-label="Stop test" onClick={() => setRun('idle')} />
          </div>
        )}
        {run === 'passed' && (
          <div className="cz-vq-pass">
            <span>All VQ&apos;s passed the regression test</span>
            <button type="button" onClick={onBack}>Review</button>
          </div>
        )}
        <div className="cz-vq-table-card">
          <div className="cz-vq-tools">
            <span>{rows.length} questions</span>
            <select aria-label="Status" defaultValue="any">
              <option value="any">Any Status</option>
              <option value="verified">Verified</option>
            </select>
            <label className="cz-vq-search">
              <Search size={14} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search..." aria-label="Search questions" />
            </label>
          </div>
          <table className="cz-table cz-vq-table">
            <thead>
              <tr>
                <th aria-label="Select" />
                <th>Question</th>
                <th>Source</th>
                <th>Rating</th>
                <th>Last Modified</th>
                <th>Classification</th>
                <th>Verified Query</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.text}>
                  <td><input type="checkbox" aria-label={`Select ${row.text}`} /></td>
                  <td>{row.text}</td>
                  <td>{row.source}</td>
                  <td>
                    <span className="rating">
                      <span><ThumbsUp size={12} /> {row.up}</span>
                      <span><ThumbsDown size={12} /> {row.down}</span>
                    </span>
                  </td>
                  <td>{row.modified}</td>
                  <td><span className="cz-pill cz-pill-good"><Shield size={12} /> Verified</span></td>
                  <td><button className="cz-text-btn" type="button" onClick={onBack}>Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  const art = `${import.meta.env.BASE_URL}illustrations/no-questions`;
  return (
    <div className="cz-art" aria-hidden="true">
      <img className="cz-art-mountain" src={`${art}/mountain.svg`} alt="" />
      <img className="cz-art-cloud1" src={`${art}/cloud1.svg`} alt="" />
      <img className="cz-art-cloud2" src={`${art}/cloud2.svg`} alt="" />
      <img className="cz-art-nap-light" src={`${art}/nap-light.svg`} alt="" />
      <img className="cz-art-nap-dark" src={`${art}/nap-dark.svg`} alt="" />
      <img className="cz-art-tree3-light" src={`${art}/tree3-light.svg`} alt="" />
      <img className="cz-art-tree3-dark" src={`${art}/tree3-dark.svg`} alt="" />
      <img className="cz-art-tree2-light" src={`${art}/tree2-light.svg`} alt="" />
      <img className="cz-art-tree2-dark" src={`${art}/tree2-dark.svg`} alt="" />
      <img className="cz-art-tree1-light" src={`${art}/tree3-light.svg`} alt="" />
      <img className="cz-art-tree1-dark" src={`${art}/tree1-dark.svg`} alt="" />
      <img className="cz-art-birds" src={`${art}/birds.svg`} alt="" />
    </div>
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

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M11.5 7a4.5 4.5 0 1 1-1.2-3.1" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11.6 2.2v2.4H9.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

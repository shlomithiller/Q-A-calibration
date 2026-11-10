import { useEffect, useRef, useState } from 'react';
import { DotSpinner } from './components/DotSpinner';
import {
  AgentAstro,
  ArrowLeft,
  Bell,
  Check,
  ChevronDown,
  Close,
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

const GENERATED_QUESTIONS: { text: string; up: number; down: number }[] = [
  { text: 'Show me total orders by month', up: 31, down: 12 },
  { text: 'Compare lead conversion rate in the prior month for different sources, when responding to pipeline questions', up: 1, down: 0 },
  { text: 'Show me the total sales amount and opportunity type for closed won deals', up: 22, down: 2 },
  { text: 'How does the average deal size of opportunities for new business compare to existing?', up: 7, down: 18 },
  { text: 'How does the average deal size of opportunities for new business compare to existing?', up: 0, down: 0 },
  { text: 'Compare the average deal size for each lead source.', up: 11, down: 1 },
  { text: "What's the total opportunity amount by opportunity stage for this quarter", up: 18, down: 3 },
  { text: "What's the total opportunity amount by opportunity stage for this quarter", up: 16, down: 0 },
  { text: 'Which lead sources are generating the highest number of converted leads this quarter?', up: 41, down: 0 },
  { text: 'Which account types have the lowest lead conversion rates?', up: 19, down: 6 },
  { text: 'Total opportunity amount between aug 1 2024 and dec 1 2024, by closed date and stage', up: 0, down: 0 },
  { text: "What's the total opportunity amount by opportunity stage for this quarter", up: 71, down: 1 },
  { text: 'Are there any significant differences in the average sales cycle length for new business versus existing business?', up: 0, down: 0 },
  { text: 'What is the average deal size for opportunities won in key accounts this quarter?', up: 0, down: 0 },
  { text: 'Whats the Average Deal Size this Quarter?', up: 0, down: 0 },
  { text: 'What is the average NPS score of all customers that have critical tickets and open pipelines?', up: 4, down: 1 },
  { text: 'What is our average days to close?', up: 8, down: 2 },
  { text: 'List unconverted leads grouped by rating level and acquisition channel', up: 3, down: 0 },
  { text: 'Show me pipeline coverage by sales team for the current quarter', up: 12, down: 1 },
  { text: 'How many opportunities moved to closed won this month?', up: 9, down: 0 },
  { text: 'Which products have the highest discount rate on closed won deals?', up: 2, down: 4 },
  { text: 'Compare win rate by lead source for the last two quarters', up: 6, down: 1 },
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
  const [page, setPage] = useState<Page>('questions');
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

  const generate = (nextModel = model, nextCount = queryCount) => {
    if (!nextModel || phase !== 'empty') return;
    setModel(nextModel);
    setQueryCount(nextCount || '2');
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
          {page === 'semantic' ? (
            <div className="ws-tabs">
              <button className="ws-tab" type="button">Data</button>
              <button className="ws-tab" type="button"><Home size={14} /> Home</button>
              <button className="ws-tab active" type="button">Sales <Close size={12} /></button>
            </div>
          ) : (
            <div className="home-tab">
              <Home size={20} />
              <div className="home-tab-indicator" />
            </div>
          )}
        </div>
        <div className="header-center" />
        <div className="header-right">
          <div className="header-controls">
            <button className="icon-button" aria-label="Agentforce" type="button"><AgentAstro size={20} /></button>
            <button className="icon-button" aria-label="Notifications" type="button"><Bell size={20} /></button>
          </div>
          <div className="header-user">
            {page === 'semantic' && <span className="ws-user-label">Personal</span>}
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
                  {generated && <span className="cz-nav-dot" aria-hidden="true" />}
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
              onBack={() => setCalibrationDetail(false)}
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
  onGenerate: (nextModel?: string, nextCount?: string) => void;
  onReview: () => void;
  onRetest: () => void;
  onOpen: () => void;
  expanded: boolean;
}) {
  const showList = phase !== 'empty' && phase !== 'generating';
  const busy = phase === 'generating' || phase === 'retesting';
  const [menuOpen, setMenuOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState('');
  const [semanticOpen, setSemanticOpen] = useState(false);
  const [draftModel, setDraftModel] = useState('');
  const [draftCount, setDraftCount] = useState('');
  const openSemantic = () => {
    setMenuOpen(false);
    setDraftModel('');
    setDraftCount('');
    setSemanticOpen(true);
  };
  const closeSemantic = () => setSemanticOpen(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const openManual = () => {
    setMenuOpen(false);
    setManualOpen(true);
  };
  const uploadCsv = () => {
    setMenuOpen(false);
    fileRef.current?.click();
  };
  return (
    <div className="cz-page">
      <div className="cz-title-row">
        <h1>All Questions</h1>
        {expanded || phase === 'empty' || phase === 'generating' || (showList && !verified) ? (
          <div className="cz-add-split">
            <button className="cz-add-main" type="button" onClick={openManual}>Add Question</button>
            <button className="cz-add-more" type="button" aria-label="More ways to add questions" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
              <ChevronDown size={12} />
            </button>
            {menuOpen && (
              <div className="cz-add-menu" role="menu">
                <button type="button" role="menuitem" onClick={openSemantic}>Semantic model</button>
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onGenerate(); }}>Slack Conversations</button>
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onGenerate(); }}>Tableau Dashboard</button>
                <button type="button" role="menuitem" onClick={openManual}>Add Manually</button>
                <button type="button" role="menuitem" onClick={uploadCsv}>Upload CSV</button>
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-outlined" type="button" onClick={onRetest} disabled={!verified && phase !== 'matched'}>
            Retest <ChevronDown size={12} />
          </button>
        )}
      </div>
      {phase === 'generating' ? (
        <GeneratingRun progress={progress} />
      ) : (
      <>
      {!expanded && phase !== 'empty' && <div className="cz-metrics">
        <Metric label="Questions for review" value={reviewCount} />
        <Metric label="Regression" value={0} />
        <Metric label="VQs" value={verified ? QUESTIONS.length : 0} tone={verified ? 'good' : undefined} />
        <Metric label="Calibration Suggestions" value={suggestionCount} tone={suggestionCount ? 'alert' : undefined} />
      </div>}
      {busy && (
        <ProgressBanner
          label="Running batch regression"
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
          <span>{expanded ? `${QUESTION_CATALOG.length} questions` : verified ? `${QUESTIONS.length} questions` : showList ? `${GENERATED_QUESTIONS.length} questions` : '0 questions'}</span>
          <div className="cz-tools">
            <span className="cz-fake-select">Any classification <ChevronDown size={12} /></span>
            <span className="cz-fake-select">{expanded || (showList && !verified) ? 'Sales' : 'Any model'} <ChevronDown size={12} /></span>
            <label className="cz-search">
              <Search size={14} />
              <input aria-label="Search questions" placeholder="Search..." />
            </label>
            {expanded || phase === 'empty' ? (
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
            <LakeArt />
            <h2><strong>Welcome!</strong><br />Start by collecting you organization business questions</h2>
            <p>Choose how you’d like to add questions to Q&amp;A calibration</p>
            <section className="cz-add-card cz-add-card-generate">
              <h3>Generate Questions</h3>
              <p>Have questions generated for you. Choose a source type for grounding</p>
              <div className="cz-add-card-rule" />
              <div className="cz-add-card-actions">
                <button type="button" disabled={phase === 'generating'} onClick={openSemantic}><SourceIcon /> Semantic model</button>
                <button type="button" disabled={phase === 'generating'} onClick={() => onGenerate()}><SlackIcon /> Slack Conversations</button>
                <button type="button" disabled={phase === 'generating'} onClick={() => onGenerate()}><DashboardIcon /> Tableau Dashboard</button>
              </div>
            </section>
            <section className="cz-add-card">
              <h3>More ways to add questions</h3>
              <div className="cz-add-card-actions">
                <button type="button" onClick={openManual}><PencilIcon /> Add Manually</button>
                <button type="button" onClick={uploadCsv}><UploadIcon /> Upload CSV</button>
              </div>
              {manualOpen && (
                <form className="cz-manual" onSubmit={(event) => { event.preventDefault(); if (manualText.trim()) onGenerate(); }}>
                  <input aria-label="Question" placeholder="Write a question" value={manualText} onChange={(event) => setManualText(event.target.value)} />
                  <button className="btn btn-brand" type="submit" disabled={!manualText.trim() || phase === 'generating'}>Add</button>
                </form>
              )}
              <input ref={fileRef} className="cz-sr" type="file" accept=".csv,text/csv" aria-label="Upload CSV" onChange={(event) => { if (event.target.files?.length) onGenerate(); }} />
            </section>
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
        ) : verified ? (
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
              </tr>
            </thead>
            <tbody>
              {QUESTIONS.map((question) => (
                <tr key={question.id}>
                  <td><input type="checkbox" aria-label={`Select ${question.text}`} /></td>
                  <td><button className="cz-q" type="button" onClick={onOpen}>{question.text}</button></td>
                  <td>{question.list.source}</td>
                  <td>
                    <span className="rating">
                      <span><ThumbsUp size={12} /> {question.list.up}</span>
                      <span><ThumbsDown size={12} /> {question.list.down}</span>
                    </span>
                  </td>
                  <td>{question.model}</td>
                  <td>{question.list.modified}</td>
                  <td><span className="cz-pill cz-pill-good"><Shield size={12} /> Verified</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
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
              {GENERATED_QUESTIONS.map((question, index) => (
                <tr key={`${question.text}-${index}`}>
                  <td><input type="checkbox" aria-label={`Select ${question.text}`} /></td>
                  <td><button className="cz-q" type="button" onClick={onReview}>{question.text}</button></td>
                  <td>AI Generated</td>
                  <td>
                    <span className="rating">
                      <span><ThumbsUp size={12} /> {question.up}</span>
                      <span><ThumbsDown size={12} /> {question.down}</span>
                    </span>
                  </td>
                  <td>C360</td>
                  <td>24 minutes ago</td>
                  <td><span className="cz-pill">New</span></td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      </>
      )}
      {semanticOpen && (
        <div className="cz-scrim" onClick={closeSemantic}>
          <div className="cz-gen-modal" role="dialog" aria-modal="true" aria-labelledby="cz-gen-title" onClick={(event) => event.stopPropagation()}>
            <button className="cz-gen-close" type="button" aria-label="Close" onClick={closeSemantic}><Close size={12} /></button>
            <h2 id="cz-gen-title">Generate Questions</h2>
            <p>pick a semantic model and choose how many questions should be generated</p>
            <label className="cz-gen-field">
              <select className={draftModel ? 'has-value' : ''} value={draftModel} onChange={(event) => setDraftModel(event.target.value)} aria-label="Semantic model">
                <option value="">Select a model</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="C360">C360</option>
              </select>
            </label>
            <label className="cz-gen-field">
              <select className={draftCount ? 'has-value' : ''} value={draftCount} onChange={(event) => setDraftCount(event.target.value)} aria-label="Number of questions">
                <option value="">Number of questions</option>
                <option value="2">2</option>
                <option value="5">5</option>
                <option value="10">10</option>
              </select>
            </label>
            <div className="cz-gen-actions">
              <button className="cz-gen-cancel" type="button" onClick={closeSemantic}>Cancel</button>
              <button className="btn btn-brand" type="button" disabled={!draftModel || !draftCount} onClick={() => { onGenerate(draftModel, draftCount); closeSemantic(); }}>Upload</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalibrationPage({
  showProgress,
  progress,
  score,
  followUp,
  model,
  onBack,
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
  onBack: () => void;
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
    : GENERATED_QUESTIONS.map((question, index) => ({
        text: question.text,
        finding: index < 2 ? 'missing' as const : 'clear' as const,
      }));
  return (
    <div className="cz-cal">
      <div className="cz-cal-main">
        <div className="cz-cal-title">
          <button className="cz-cal-back" type="button" aria-label="Back" onClick={onBack}><ArrowLeft size={16} /></button>
          <h1>Model Name - {model}</h1>
        </div>
        <div className="cz-meta-line">
          <span>Generalization Score <b className={`cz-score${score === null ? ' na' : !followUp && score > 40 ? ' up' : ''}`}>{score === null ? 'NA' : `${score}%`}</b></span>
          <span>Run Time: 20 seconds</span>
          <span>Last Modified A week ago</span>
        </div>
        {showProgress && <ProgressBanner label="Applying calibrations" progress={progress} />}
        <div className="cz-cal-table">
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
            <section className="cz-cals">
              <h2>Suggested Calibrations</h2>
              <div className="cz-cal-filters">
                <select aria-label="Calibration type" defaultValue="all"><option value="all">All Calibrations Types</option></select>
                <select aria-label="Impact" defaultValue="any"><option value="any">Impact</option></select>
              </div>
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
            {!followUp && (
            <section className="cz-terms">
              <h2>Require Input</h2>
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
  return (
    <div className="sm">
      <div className="sm-titlebar">
        <div>
          <button className="sm-crumb" type="button">Marketing <ChevronDown size={12} /></button>
          <h1>Sales</h1>
        </div>
        <div className="sm-title-actions">
          <span className="sm-unsaved">Unsaved Changes</span>
          <button className="btn btn-outlined" type="button">Create Visualization</button>
          <button className="btn btn-outlined" type="button">Share</button>
          <button className="btn btn-brand" type="button">Save <ChevronDown size={12} /></button>
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
          <div className="sm-tree-switch">
            <button type="button" className="active">Data</button>
            <button type="button">Filter</button>
            <button type="button">Actions</button>
          </div>
          <div className="sm-search-row">
            <label className="sm-search">
              <Search size={14} />
              <input aria-label="Search the model" placeholder="Search..." />
            </label>
            <button className="sm-icon" type="button" aria-label="Filter fields"><FilterIcon size={14} /></button>
            <button className="sm-icon" type="button" aria-label="Add"><Plus size={14} /></button>
          </div>
          <div className="sm-group open">Calculated Fields (2)</div>
          <ul>
            <li><ProductSizeIcon />Product Size Category</li>
            <li><SalesByRegionIcon />Sales by region</li>
          </ul>
          <div className="sm-group">Parameters (1)</div>
          <div className="sm-group">Dimension Hierarchies (1)</div>
          <div className="sm-group open">Data Objects (8)</div>
          <ul>
            <li><ChevronRight size={12} /> <PinkObjectIcon /> Account <span>(6)</span></li>
            <li><ChevronRight size={12} /> <PinkObjectIcon /> Email Engagement <span>(8)</span></li>
            <li className="open">
              <ChevronDown size={12} /> <PinkObjectIcon /> Campaign <span>(6)</span>
              <ul>
                <li>campaign_ID</li>
                <li>
                  <ChevronDown size={12} /> Geo
                  <ul>
                    <li>country</li>
                    <li>region</li>
                    <li>city</li>
                    <li>geo</li>
                  </ul>
                </li>
                <li>currency</li>
              </ul>
            </li>
          </ul>
        </aside>
        <div className="sm-canvas">
          <div className="sm-float-tools" aria-label="Canvas tools">
            <button type="button" aria-label="Add">+</button>
            <button type="button" aria-label="Undo">↶</button>
            <button type="button" aria-label="Redo">↷</button>
            <button type="button" aria-label="Fit">⤢</button>
            <button type="button" aria-label="Zoom">⌕</button>
          </div>
          <div className="sm-diagram">
            <svg className="sm-lines" viewBox="0 0 1000 460" aria-hidden="true">
              <path d="M128 78H176C183.732 78 190 84.268 190 92V354C190 361.732 183.732 368 176 368H128M190 214H248M312 214H808M640 236V336C640 343.732 646.268 350 654 350H808" />
            </svg>
            <ModelNode icon="object" label="Email Engagement" left="9%" top="17%" />
            <ModelNode icon="object" label="Message Engagement" left="9%" top="46%" />
            <ModelNode icon="person" tone="purple" label="Email Conversion" left="9%" top="80%" />
            <ModelNode icon="object" label="Campaign" left="28%" top="46%" />
            <ModelNode icon="object" label="Product" left="45%" top="46%" />
            <ModelNode icon="object" label="Transactions" left="64%" top="46%" />
            <ModelNode icon="object" label="Stores" left="83%" top="46%" />
            <ModelNode icon="object" label="Website" left="83%" top="76%" />
            <ModelNode icon="grid" tone="orange" label="Dates" left="96%" top="60%" />
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
  icon: 'person' | 'object' | 'recycle' | 'grid';
  tone?: 'pink' | 'purple' | 'orange';
  label: string;
  left: string;
  top: string;
}) {
  return (
    <span className="sm-obj" style={{ left, top }}>
      <span className={`sm-orb ${tone}`}>
        {icon === 'person' && <PersonGlyph />}
        {icon === 'object' && <ObjectGlyph />}
        {icon === 'recycle' && <RecycleGlyph />}
        {icon === 'grid' && <GridGlyph />}
      </span>
      <span className="sm-obj-label">{label}</span>
    </span>
  );
}

function PersonGlyph() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="20" viewBox="0 0 29 27" fill="none" aria-hidden="true">
      <path d="M25.44 15.312V15.12C25.44 10.8 22.896 7.056 19.248 5.232V4.8C19.248 2.16 17.088 0 14.448 0C11.808 0 9.648 2.16 9.648 4.8V5.232C7.79546 6.13747 6.23354 7.54366 5.13916 9.29126C4.04479 11.0389 3.46172 13.058 3.456 15.12V15.312C2.78106 15.5089 2.1576 15.8516 1.6297 16.3159C1.10181 16.7803 0.682366 17.355 0.401036 17.9993C0.119705 18.6436 -0.0166467 19.3419 0.00162061 20.0447C0.0198879 20.7475 0.192329 21.4378 0.50675 22.0666C0.821172 22.6955 1.2699 23.2476 1.8212 23.6839C2.37251 24.1202 3.01293 24.4301 3.69719 24.5916C4.38145 24.7531 5.09284 24.7624 5.78106 24.6187C6.46929 24.475 7.11755 24.1818 7.68 23.76C9.59065 25.2786 11.9593 26.1053 14.4 26.1053C16.8407 26.1053 19.2094 25.2786 21.12 23.76C21.8331 24.2949 22.6811 24.6206 23.5689 24.7006C24.4568 24.7807 25.3493 24.6119 26.1466 24.2133C26.9439 23.8146 27.6145 23.2018 28.0831 22.4435C28.5518 21.6852 28.8 20.8114 28.8 19.92C28.896 17.76 27.456 15.888 25.44 15.312ZM9.168 22.08C9.50028 21.4122 9.67236 20.6762 9.67059 19.9303C9.66883 19.1845 9.49327 18.4493 9.15785 17.7831C8.82242 17.1169 8.33635 16.538 7.73821 16.0924C7.14008 15.6468 6.44633 15.3467 5.712 15.216V15.12C5.712 11.76 7.632 8.832 10.416 7.344C10.8548 8.02771 11.4584 8.59018 12.1713 8.97975C12.8842 9.36931 13.6836 9.57347 14.496 9.57347C15.3084 9.57347 16.1078 9.36931 16.8207 8.97975C17.5336 8.59018 18.1372 8.02771 18.576 7.344C21.36 8.832 23.28 11.76 23.28 15.12V15.216C22.5457 15.3467 21.8519 15.6468 21.2538 16.0924C20.6556 16.538 20.1696 17.1169 19.8342 17.7831C19.4987 18.4493 19.3232 19.1845 19.3214 19.9303C19.3196 20.6762 19.4917 21.4122 19.824 22.08C18.3034 23.2711 16.4276 23.9184 14.496 23.9184C12.5644 23.9184 10.6886 23.2711 9.168 22.08Z" fill="white" />
    </svg>
  );
}

function ProductSizeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M11.5309 9.1642L9.11953 3.18679C9.08557 3.06793 8.98368 3 8.86481 3H8.10065C7.98178 3 7.86292 3.08491 7.82895 3.18679L5.62139 9.1642C5.57045 9.28306 5.65535 9.41891 5.77422 9.41891H6.62328C6.74215 9.41891 6.86102 9.31703 6.89498 9.19816L7.45537 7.63588H9.62897L10.2573 9.19816C10.2912 9.31703 10.4101 9.41891 10.529 9.41891H11.3611C11.4969 9.41891 11.5988 9.28306 11.5309 9.1642ZM7.89688 6.46419L8.52519 4.83399L9.22142 6.46419H7.89688Z" fillRule="evenodd" clipRule="evenodd" fill="#0176D3" />
      <path d="M15.3959 12.4469C15.3446 11.7454 15.3275 11.0267 15.3275 10.3252L15.3446 9.26433C15.3446 9.20512 15.3457 9.14591 15.3468 9.0868C15.3519 8.82137 15.357 8.55803 15.259 8.30614C14.9852 7.6046 14.0613 7.46771 13.394 7.46771C12.8023 7.47767 12.2194 7.61175 11.6829 7.86126L11.9053 8.4088C11.953 8.5042 11.9712 8.61438 11.9872 8.71188L11.9909 8.7339C12.4358 8.52857 12.8806 8.4088 13.3255 8.4088C14.027 8.4088 14.3693 8.68257 14.3693 9.23011V9.48677L13.8731 9.46966C12.9833 9.46966 12.316 9.60655 11.8369 9.86321C11.3749 10.137 11.1353 10.599 11.1353 11.2663C11.1353 11.7625 11.2893 12.156 11.5973 12.4298C11.9053 12.7036 12.2989 12.8405 12.7609 12.8405C13.1715 12.8405 13.5137 12.7891 13.7704 12.6694C14.027 12.5496 14.2495 12.3785 14.4206 12.1389H14.4548L14.5404 12.7207H15.3959V12.4469ZM14.3864 10.7187C14.3864 10.8385 14.3693 10.9583 14.3179 11.0781C14.2837 11.1636 14.2495 11.2492 14.181 11.3347C13.9536 11.6132 13.63 11.7964 13.2742 11.848C13.0517 11.8823 12.8464 11.8652 12.624 11.8309C12.4529 11.7967 12.2818 11.7112 12.1962 11.5572C12.0422 11.3176 12.0764 10.9412 12.2475 10.7187C12.3502 10.5819 12.5042 10.4963 12.6582 10.445C13.086 10.3081 13.5822 10.3081 14.0099 10.3081L14.3864 10.3252V10.7187Z" fillRule="evenodd" clipRule="evenodd" fill="#0176D3" />
      <path d="M1.23252 6.06882H4.39722C4.5255 6.06882 4.62949 6.17281 4.62949 6.30109L4.62949 7.04629C4.62949 7.17457 4.5255 7.27857 4.39722 7.27857H1.23252C1.10424 7.27857 1.00024 7.17457 1.00024 7.04629V6.30109C1.00024 6.17281 1.10424 6.06882 1.23252 6.06882Z" fill="#0176D3" />
      <path d="M1.23252 8.73994H4.39722C4.5255 8.73994 4.62949 8.84393 4.62949 8.97221L4.62949 9.71742C4.62949 9.8457 4.5255 9.94969 4.39722 9.94969H1.23252C1.10424 9.94969 1.00024 9.8457 1.00024 9.71742V8.97221C1.00024 8.84393 1.10424 8.73994 1.23252 8.73994Z" fill="#0176D3" />
    </svg>
  );
}

function SalesByRegionIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="11" viewBox="0 0 15 11" fill="none" aria-hidden="true">
      <path d="M12.8694 2.45473H14.2255C14.3114 2.45473 14.3972 2.52339 14.3972 2.54056V2.57489L14.1225 3.60485C14.1054 3.69068 14.0367 3.74217 13.9509 3.74217H12.5089L11.8395 6.3514H13.2471C13.3501 6.3514 13.4187 6.43723 13.4187 6.52306V6.55739L13.1441 7.58734C13.1269 7.67317 13.0583 7.72467 12.9724 7.72467H11.479L10.8782 10.0764C10.861 10.1622 10.7924 10.2137 10.7065 10.2137H9.62507C9.52207 10.2137 9.45341 10.1279 9.45341 10.0421V10.0077L10.0371 7.74184H7.342L6.74119 10.0936C6.72403 10.1794 6.65536 10.2309 6.56953 10.2309H5.48808C5.38508 10.2309 5.31642 10.1451 5.31642 10.0592V10.0249L5.90006 7.759H4.76874C4.66574 7.759 4.59708 7.67317 4.59708 7.58734V7.55301L4.87173 6.52306C4.90606 6.45439 4.95756 6.40289 5.04339 6.40289H6.26054L6.93002 3.79367H5.74719C5.6442 3.79367 5.57553 3.70784 5.57553 3.62201V3.58768L5.85019 2.55772C5.88452 2.48906 5.93602 2.43756 6.02185 2.43756H7.2905L7.89131 0.137327C7.90847 0.0686637 7.97714 0 8.06297 0H9.14442C9.24742 0 9.31608 0.0858297 9.31608 0.171659V0.223157L8.73244 2.45473H11.4447L12.0283 0.137327C12.0455 0.0686637 12.1141 0 12.2 0H13.2814C13.3844 0 13.4531 0.0858297 13.4531 0.171659V0.223157L12.8694 2.45473ZM7.70248 6.43722H10.4147L11.067 3.828H8.37195L7.70248 6.43722Z" fillRule="evenodd" clipRule="evenodd" fill="#2E844A" />
      <path d="M0.232272 3.26404H3.39698C3.52526 3.26404 3.62925 3.36803 3.62925 3.49631L3.62925 4.24152C3.62925 4.3698 3.52526 4.47379 3.39698 4.47379H0.232272C0.103992 4.47379 0 4.3698 0 4.24152V3.49631C0 3.36803 0.103992 3.26404 0.232272 3.26404Z" fill="#2E844A" />
      <path d="M0.232272 5.93516H3.39698C3.52526 5.93516 3.62925 6.03916 3.62925 6.16744L3.62925 6.91264C3.62925 7.04092 3.52526 7.14491 3.39698 7.14491H0.232272C0.103992 7.14491 0 7.04092 0 6.91264V6.16744C0 6.03916 0.103992 5.93516 0.232272 5.93516Z" fill="#2E844A" />
    </svg>
  );
}

function PinkObjectIcon() {
  return (
    <span className="sm-obj-badge" aria-hidden="true">
      <ObjectGlyph size={10} />
    </span>
  );
}

function ObjectGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 29 29" fill="none" aria-hidden="true">
      <path d="M25.008 21.84C24.4718 21.8359 23.9432 21.9681 23.472 22.224L19.248 19.104C19.6348 18.3293 19.8322 17.4739 19.824 16.608C19.8223 15.3451 19.4022 14.1183 18.6292 13.1196C17.8563 12.1208 16.7741 11.4064 15.552 11.088V6.288C16.1174 6.01993 16.5967 5.5993 16.9359 5.0735C17.2752 4.54771 17.4608 3.93763 17.472 3.312C17.472 2.87706 17.3863 2.44638 17.2199 2.04455C17.0534 1.64272 16.8095 1.27761 16.5019 0.970062C16.1944 0.662514 15.8293 0.418554 15.4274 0.252111C15.0256 0.085667 14.5949 0 14.16 0C13.7251 0 13.2944 0.085667 12.8926 0.252111C12.4907 0.418554 12.1256 0.662514 11.8181 0.970062C11.5105 1.27761 11.2666 1.64272 11.1001 2.04455C10.9337 2.44638 10.848 2.87706 10.848 3.312C10.8416 3.94153 11.0201 4.55909 11.3614 5.0881C11.7027 5.61712 12.1918 6.03433 12.768 6.288V11.088C11.5459 11.4064 10.4637 12.1208 9.69077 13.1196C8.91782 14.1183 8.49766 15.3451 8.496 16.608C8.48781 17.4739 8.68522 18.3293 9.072 19.104L4.848 22.224C4.37261 21.9789 3.84682 21.8474 3.312 21.84C2.65695 21.84 2.01661 22.0342 1.47195 22.3982C0.927297 22.7621 0.50279 23.2794 0.252113 23.8846C0.00143507 24.4897 -0.0641536 25.1557 0.0636406 25.7981C0.191435 26.4406 0.506872 27.0307 0.970063 27.4939C1.43325 27.9571 2.0234 28.2726 2.66586 28.4004C3.30833 28.5282 3.97426 28.4626 4.57945 28.2119C5.18464 27.9612 5.7019 27.5367 6.06583 26.992C6.42976 26.4474 6.624 25.8071 6.624 25.152L6.576 24.528L10.992 21.264C11.9416 21.9511 13.0839 22.321 14.256 22.321C15.4281 22.321 16.5704 21.9511 17.52 21.264L21.936 24.528C21.8962 24.7335 21.8801 24.9428 21.888 25.152C21.888 26.0304 22.2369 26.8728 22.8581 27.4939C23.4792 28.1151 24.3216 28.464 25.2 28.464C26.0784 28.464 26.9208 28.1151 27.5419 27.4939C28.1631 26.8728 28.512 26.0304 28.512 25.152C28.4517 24.2604 28.0575 23.4243 27.408 22.8104C26.7586 22.1965 25.9016 21.85 25.008 21.84ZM14.784 19.392C14.5639 19.4473 14.3387 19.4794 14.112 19.488C13.4909 19.4718 12.891 19.2584 12.3991 18.8788C11.9073 18.4991 11.549 17.9728 11.376 17.376C11.3204 17.1397 11.2883 16.8986 11.28 16.656C11.2782 16.1563 11.411 15.6653 11.6644 15.2346C11.9177 14.8038 12.2824 14.4492 12.72 14.208C13.1578 13.9552 13.6545 13.8222 14.16 13.8222C14.6655 13.8222 15.1622 13.9552 15.6 14.208C16.0376 14.4492 16.4023 14.8038 16.6556 15.2346C16.909 15.6653 17.0418 16.1563 17.04 16.656C17.0317 16.8986 16.9996 17.1397 16.944 17.376C16.7786 17.8643 16.4947 18.3041 16.1178 18.6559C15.7408 19.0077 15.2826 19.2606 14.784 19.392Z" fill="white" />
    </svg>
  );
}

function RecycleGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10.2 3.2 12.4 6H8.6L10.2 3.2Zm-5.4 5.6 2.4-1.3.5 2.6-2.9-.3Zm7.6 1.3 2.9-.3-.5-2.6 2.4 1.3-4.8 1.6Z" fill="#fff" />
      <path d="M7.1 8.2a3.6 3.6 0 0 1 5.6-1.5M13.2 12.2a3.6 3.6 0 0 1-5.6 1.4" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12.2 5.4 12.6 7.2 10.8 6.6M7.4 14.6 7.8 12.8 9.6 13.4" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GridGlyph() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="22" viewBox="0 0 27 29" fill="none" aria-hidden="true">
      <path d="M6.336 7.2H0.864C0.386826 7.2 0 7.58682 0 8.064V9.936C0 10.4132 0.386826 10.8 0.864 10.8H6.336C6.81317 10.8 7.2 10.4132 7.2 9.936V8.064C7.2 7.58682 6.81317 7.2 6.336 7.2Z" fill="white" />
      <path d="M15.888 25.2H10.416C9.93883 25.2 9.552 25.5868 9.552 26.064V27.936C9.552 28.4132 9.93883 28.8 10.416 28.8H15.888C16.3652 28.8 16.752 28.4132 16.752 27.936V26.064C16.752 25.5868 16.3652 25.2 15.888 25.2Z" fill="white" />
      <path d="M6.336 13.248H0.864C0.386826 13.248 0 13.6348 0 14.112V15.984C0 16.4612 0.386826 16.848 0.864 16.848H6.336C6.81317 16.848 7.2 16.4612 7.2 15.984V14.112C7.2 13.6348 6.81317 13.248 6.336 13.248Z" fill="white" />
      <path d="M6.336 25.2H0.864C0.386826 25.2 0 25.5868 0 26.064V27.936C0 28.4132 0.386826 28.8 0.864 28.8H6.336C6.81317 28.8 7.2 28.4132 7.2 27.936V26.064C7.2 25.5868 6.81317 25.2 6.336 25.2Z" fill="white" />
      <path d="M25.488 0H0.864C0.386826 0 0 0.386826 0 0.864V3.888C0 4.36517 0.386826 4.752 0.864 4.752H25.488C25.9652 4.752 26.352 4.36517 26.352 3.888V0.864C26.352 0.386826 25.9652 0 25.488 0Z" fill="white" />
      <path d="M6.336 19.152H0.864C0.386826 19.152 0 19.5388 0 20.016V21.888C0 22.3652 0.386826 22.752 0.864 22.752H6.336C6.81317 22.752 7.2 22.3652 7.2 21.888V20.016C7.2 19.5388 6.81317 19.152 6.336 19.152Z" fill="white" />
      <path d="M15.888 19.152H10.416C9.93883 19.152 9.552 19.5388 9.552 20.016V21.888C9.552 22.3652 9.93883 22.752 10.416 22.752H15.888C16.3652 22.752 16.752 22.3652 16.752 21.888V20.016C16.752 19.5388 16.3652 19.152 15.888 19.152Z" fill="white" />
      <path d="M15.888 13.248H10.416C9.93883 13.248 9.552 13.6348 9.552 14.112V15.984C9.552 16.4612 9.93883 16.848 10.416 16.848H15.888C16.3652 16.848 16.752 16.4612 16.752 15.984V14.112C16.752 13.6348 16.3652 13.248 15.888 13.248Z" fill="white" />
      <path d="M25.536 13.248H20.064C19.5868 13.248 19.2 13.6348 19.2 14.112V15.984C19.2 16.4612 19.5868 16.848 20.064 16.848H25.536C26.0132 16.848 26.4 16.4612 26.4 15.984V14.112C26.4 13.6348 26.0132 13.248 25.536 13.248Z" fill="white" />
      <path d="M25.536 7.2H20.064C19.5868 7.2 19.2 7.58682 19.2 8.064V9.936C19.2 10.4132 19.5868 10.8 20.064 10.8H25.536C26.0132 10.8 26.4 10.4132 26.4 9.936V8.064C26.4 7.58682 26.0132 7.2 25.536 7.2Z" fill="white" />
      <path d="M25.536 19.152H20.064C19.5868 19.152 19.2 19.5388 19.2 20.016V21.888C19.2 22.3652 19.5868 22.752 20.064 22.752H25.536C26.0132 22.752 26.4 22.3652 26.4 21.888V20.016C26.4 19.5388 26.0132 19.152 25.536 19.152Z" fill="white" />
      <path d="M25.536 25.2H20.064C19.5868 25.2 19.2 25.5868 19.2 26.064V27.936C19.2 28.4132 19.5868 28.8 20.064 28.8H25.536C26.0132 28.8 26.4 28.4132 26.4 27.936V26.064C26.4 25.5868 26.0132 25.2 25.536 25.2Z" fill="white" />
      <path d="M15.888 7.2H10.416C9.93883 7.2 9.552 7.58682 9.552 8.064V9.936C9.552 10.4132 9.93883 10.8 10.416 10.8H15.888C16.3652 10.8 16.752 10.4132 16.752 9.936V8.064C16.752 7.58682 16.3652 7.2 15.888 7.2Z" fill="white" />
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

function GeneratingRun({ progress }: { progress: number }) {
  return (
    <section className="cz-run">
      <div className="cz-run-meta">
        <span><b>Agent: </b>Concierge Sales</span>
        <span><b>Run by:</b> Harry Anderson</span>
        <span><b>Start time</b> 02/24/2023, 11:34 AM</span>
      </div>
      <div className="cz-run-body">
        <div className="cz-run-main">
          <div className="cz-run-copy">
            <p><b>Processing: </b>{progress}% (1m 30s elapsed)</p>
            <p>Estimated Remaining Time: 30sec</p>
          </div>
          <div className="cz-run-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button className="cz-run-stop" type="button" aria-label="Stop"><i /></button>
      </div>
    </section>
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

function LakeArt() {
  const art = `${import.meta.env.BASE_URL}illustrations/lake-mountain`;
  return (
    <div className="cz-lake" aria-hidden="true">
      <img className="cz-lake-cloud2" src={`${art}/cloud2-light.svg`} alt="" />
      <img className="cz-lake-mtn-white" src={`${art}/mountain-white.svg`} alt="" />
      <img className="cz-lake-mtn-light" src={`${art}/mountain-light.svg`} alt="" />
      <img className="cz-lake-fg-light" src={`${art}/foreground-light.svg`} alt="" />
      <img className="cz-lake-fg-dark" src={`${art}/foreground-dark.svg`} alt="" />
      <img className="cz-lake-tree2-light" src={`${art}/tree2-light.svg`} alt="" />
      <img className="cz-lake-tree2-dark" src={`${art}/tree2-dark.svg`} alt="" />
      <img className="cz-lake-tree1-light" src={`${art}/tree1-light.svg`} alt="" />
      <img className="cz-lake-tree1-dark" src={`${art}/tree1-dark.svg`} alt="" />
      <img className="cz-lake-cloud1-white" src={`${art}/cloud1-white.svg`} alt="" />
      <img className="cz-lake-cloud1" src={`${art}/cloud1-light.svg`} alt="" />
    </div>
  );
}

function SourceIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="3" cy="7" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="11" cy="3.2" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="11" cy="10.8" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 6.4 9.4 3.8M4.5 7.6 9.4 10.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function SlackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M5.2 1.2h1.4v3.2H5.2A1.6 1.6 0 1 1 5.2 1.2Zm0 4.4h4.8V7H5.2V5.6ZM1.2 5.2A1.6 1.6 0 1 1 4.4 5.2v1.4H1.2V5.2Zm8.8 0h1.4A1.6 1.6 0 1 1 8.8 7V5.6h1.2V5.2ZM8.8 8.4v3.2A1.6 1.6 0 1 1 7.2 10V8.4h1.6ZM5.6 12.8A1.6 1.6 0 1 1 7 9.6V8.4H5.6v4.4Z" fill="currentColor" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="1.2" y="1.2" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <rect x="7.8" y="1.2" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1.2" y="7.8" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <rect x="7.8" y="7.8" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M8.2 2.2 11.8 5.8 5 12.6H1.4V9L8.2 2.2Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7 3.4 10.6 7" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M7 1.6v7.2M4.2 4.4 7 1.6l2.8 2.8M2.2 9.2v2.2h9.6V9.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
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

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M11.5 7a4.5 4.5 0 1 1-1.2-3.1" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11.6 2.2v2.4H9.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

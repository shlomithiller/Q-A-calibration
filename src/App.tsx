import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from './components/AppShell';
import { Workbench } from './components/Workbench';
import type { TabKey } from './components/Workbench';
import { QuestionDetail } from './components/QuestionDetail';
import { ClassificationPanel } from './components/ClassificationPanel';
import type { PanelMode } from './components/ClassificationPanel';
import { RegressionTestView } from './components/RegressionTestView';
import { TestSuitesList } from './components/TestSuitesList';
import { questions as seedQuestions } from './data/questions';
import type { Classification, Question } from './data/questions';
import { CreateTestModal } from './components/CreateTestModal';
import { DiffModal } from './components/DiffModal';
import { Close, Check, SparkleSingle } from './components/Icons';
import { SqlCurationView } from './components/SqlCurationView';

type View =
  | { kind: 'list'; tab?: TabKey }
  | { kind: 'detail'; questionId: string }
  | { kind: 'test-suites' }
  | { kind: 'regression-test'; testName: string; questionIds: string[] };

type ToastVariant = 'accurate' | 'inaccurate';
interface ToastMsg {
  variant: ToastVariant;
  text: string;
}

export default function App() {
  const [questions, setQuestions] = useState<Question[]>(seedQuestions);
  const [view, setView] = useState<View>({ kind: 'list' });
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const initialReviewable = useRef(
    seedQuestions.filter((q) => q.classification === 'new').length,
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Classification | null>(null);
  const [selected, setSelected] = useState<Classification | null>(null);
  const [mode, setMode] = useState<PanelMode>('classify');
  const [correction, setCorrection] = useState('');
  const [allDone, setAllDone] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showRerunDialog, setShowRerunDialog] = useState(false);
  const [testFailedIds, setTestFailedIds] = useState<Set<string>>(new Set());
  const [showCalibrationPanel, setShowCalibrationPanel] = useState(false);
  const [calibrationPanelState, setCalibrationPanelState] = useState<'analyzing' | 'generating' | 'results'>('analyzing');
  const [lastTestName, setLastTestName] = useState('');
  const [lastTestQuestionIds, setLastTestQuestionIds] = useState<string[]>([]);
  const [cameFromTest, setCameFromTest] = useState(false);
  const [verified, setVerified] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [sqlCurationValue, setSqlCurationValue] = useState('');
  const [sqlEditActive, setSqlEditActive] = useState(false);

  const currentQuestion =
    view.kind === 'detail'
      ? questions.find((q) => q.id === view.questionId)
      : undefined;

  useEffect(() => {
    if (view.kind !== 'detail') return;
    const q = questions.find((qq) => qq.id === view.questionId);
    setLoading(true);
    setAllDone(false);
    setSelected(q?.classification === 'regression' ? 'inaccurate' : null);
    setSaving(null);
    setMode(q?.classification === 'regression' ? 'regression-analysis' : 'classify');
    setCorrection('');
    setVerified(false);
    setSqlEditActive(false);
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.kind === 'detail' ? view.questionId : null]);

  const openQuestion = (id: string) => {
    setCameFromTest(false);
    setView({ kind: 'detail', questionId: id });
  };

  const openQuestionFromTest = (id: string) => {
    setCameFromTest(true);
    setView({ kind: 'detail', questionId: id });
  };

  const backToList = () => {
    setView({ kind: 'list' });
  };

  const handleBackFromDetail = () => {
    if (cameFromTest && lastTestQuestionIds.length > 0) {
      setView({ kind: 'regression-test', testName: lastTestName, questionIds: lastTestQuestionIds });
    } else {
      setView({ kind: 'list' });
    }
  };

  const showToast = (msg: ToastMsg) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2400);
  };

  const moveToGoldenDataSet = () => {
    if (view.kind !== 'detail') return;
    const currentId = view.questionId;

    setQuestions((prev) => {
      const updated = prev.map((q) =>
        q.id === currentId ? { ...q, classification: 'accurate' as Classification } : q,
      );

      const nextUnreviewed = updated.find(
        (q) => q.classification === 'new' && q.id !== currentId,
      );

      if (nextUnreviewed) {
        setView({ kind: 'detail', questionId: nextUnreviewed.id });
        setAllDone(false);
      } else {
        setAllDone(true);
        setSaving(null);
      }

      return updated;
    });

    showToast({
      variant: 'accurate',
      text: 'Moved to Golden Dataset',
    });
  };

  const handleAccurate = () => {
    if (saving || !currentQuestion) return;
    setSelected('accurate');
    setSaving('accurate');
    setTimeout(() => {
      setSaving(null);
      moveToGoldenDataSet();
    }, 850);
  };

  const handleInaccurateClick = () => {
    if (saving || !currentQuestion) return;
    setSelected('inaccurate');
    setMode('fork-decision');
  };

  const handleBackToClassify = () => {
    setMode('classify');
    setSelected(null);
  };

  const handleChooseCalibration = () => {
    setMode('nl-input');
    setCorrection('');
  };

  const handleChooseSqlCuration = () => {
    setSqlCurationValue(currentQuestion?.response.sql ?? '');
    setSqlEditActive(true);
  };

  const handleSqlCurationSave = () => {
    if (view.kind !== 'detail' || !currentQuestion) return;
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === currentQuestion.id
          ? { ...q, response: { ...q.response, sql: sqlCurationValue }, classification: 'accurate' as Classification }
          : q,
      ),
    );
    showToast({ variant: 'accurate', text: 'SQL query saved' });
    setSqlEditActive(false);
    setMode('classify');
    setSelected(null);
  };

  const handleBackToFork = () => {
    setSqlEditActive(false);
    setMode('fork-decision');
  };

  const handleSuggestCalibration = () => {
    setMode('suggesting');
    setTimeout(() => setMode('suggestion-preview'), 2200);
  };

  const handleBackToNlInput = () => {
    setMode('nl-input');
  };

  const handleApplyCalibration = () => {
    setMode('calibrating');
    setTimeout(() => {
      setMode('re-evaluating');
      setTimeout(() => {
        showToast({
          variant: 'inaccurate',
          text: 'Question re-evaluated with calibration',
        });
        setMode('classify');
        setSelected(null);
        setSaving(null);
      }, 2000);
    }, 1800);
  };

  const handleRunTest = () => {
    setShowTestModal(true);
  };

  const handleCreateTest = (name: string, _description: string, questionIds: string[]) => {
    setShowTestModal(false);
    const testName = name || 'My Batch Test';
    // Pick 4 random questions to fail
    const shuffled = [...questionIds].sort(() => Math.random() - 0.5);
    const failIds = new Set(shuffled.slice(0, Math.min(4, shuffled.length)));
    setTestFailedIds(failIds);
    setShowCalibrationPanel(false);
    setTestCompleted(false);
    setLastTestName(testName);
    setLastTestQuestionIds(questionIds);

    // Mark failed questions as 'regression' in the data
    setQuestions((prev) =>
      prev.map((q) => (failIds.has(q.id) ? { ...q, classification: 'regression' as Classification } : q)),
    );

    setView({ kind: 'regression-test', testName, questionIds });
  };

  const handleTestCalibrate = () => {
    setShowCalibrationPanel(true);
    setCalibrationPanelState('analyzing');
    setTimeout(() => setCalibrationPanelState('generating'), 1800);
    setTimeout(() => setCalibrationPanelState('results'), 3600);
  };

  const handleTestCalibrationApply = () => {
    setShowCalibrationPanel(false);
    setShowRerunDialog(true);
  };

  const handleRerunConfirm = () => {
    setShowRerunDialog(false);
    if (view.kind !== 'regression-test') return;

    // After rerun: all pass, fix regression status
    setQuestions((prev) =>
      prev.map((q) => (testFailedIds.has(q.id) ? { ...q, classification: 'accurate' as Classification } : q)),
    );
    setTestFailedIds(new Set());

    // Re-trigger the view to re-animate
    const { testName, questionIds } = view;
    setView({ kind: 'list' });
    setTimeout(() => {
      setView({ kind: 'regression-test', testName, questionIds });
    }, 50);
  };

  const handleRerunCancel = () => {
    setShowRerunDialog(false);
  };

  const handleRetest = () => {
    if (view.kind !== 'regression-test') return;
    const { testName, questionIds } = view;
    setTestCompleted(false);
    setView({ kind: 'list' });
    setTimeout(() => {
      setView({ kind: 'regression-test', testName, questionIds });
    }, 50);
  };

  const remainingCount = useMemo(
    () => questions.filter((q) => q.classification === 'new').length,
    [questions],
  );

  const isReEvaluating = mode === 're-evaluating';

  const renderBody = () => {
    if (view.kind === 'test-suites') {
      return (
        <TestSuitesList
          onOpenSuite={(id) => {
            if (id === 'recent' && lastTestQuestionIds.length > 0) {
              setView({ kind: 'regression-test', testName: lastTestName, questionIds: lastTestQuestionIds });
            }
          }}
          onNewTest={() => setShowTestModal(true)}
          recentTestId={lastTestQuestionIds.length > 0 ? 'recent' : undefined}
          recentTestName={lastTestName}
        />
      );
    }
    if (view.kind === 'regression-test') {
      return (
        <RegressionTestView
          testName={view.testName}
          questionIds={view.questionIds}
          failedIds={testFailedIds}
          onBack={() => setView({ kind: 'test-suites' })}
          onOpenQuestion={openQuestionFromTest}
          onCalibrate={handleTestCalibrate}
          onRetest={handleRetest}
          skipAnimation={testCompleted}
          onComplete={() => setTestCompleted(true)}
        />
      );
    }
    if (view.kind === 'list') {
      return (
        <Workbench
          questions={questions}
          onOpenQuestion={openQuestion}
          initialTab={view.tab}
          onRunTest={handleRunTest}
        />
      );
    }
    if (!currentQuestion) {
      setView({ kind: 'list' });
      return null;
    }
    return (
      <QuestionDetail
        question={currentQuestion}
        loading={loading}
        saving={saving}
        onBack={handleBackFromDetail}
        reEvaluating={isReEvaluating}
        verified={verified}
        fromTest={cameFromTest}
        sqlEditMode={sqlEditActive}
        sqlEditValue={sqlCurationValue}
        onSqlEditChange={setSqlCurationValue}
      />
    );
  };

  const rightPanel =
    view.kind === 'detail' && currentQuestion ? (
      allDone ? (
        <div className="classification-panel">
          <div className="classification-panel-header">Classification</div>
          <div className="done-panel-state">
            <img src="/illustrations/all-caught-up.svg" alt="" className="done-panel-illo" />
            <h3 className="done-panel-title">You're all caught up</h3>
            <p className="done-panel-text">
              Every question in this batch has been classified. Review
              the Golden Dataset or pick up the next batch.
            </p>
            <button className="btn-pill-brand" onClick={() => setView({ kind: 'list', tab: 'golden' })}>
              View Golden Dataset
            </button>
          </div>
        </div>
      ) : (
        <ClassificationPanel
          mode={mode}
          selected={selected}
          saving={saving}
          remainingCount={remainingCount}
          totalCount={initialReviewable.current}
          questionClassification={currentQuestion?.classification}
          verified={verified}
          onVerifiedChange={(v) => {
            setVerified(v);
            if (v) {
              showToast({ variant: 'accurate', text: 'Question marked as verified' });
            }
          }}
          fromTest={cameFromTest}
          correction={correction}
          onCorrectionChange={setCorrection}
          onInaccurateClick={handleInaccurateClick}
          onAccurateClick={handleAccurate}
          onChangeClassification={handleBackToClassify}
          onChooseCalibration={handleChooseCalibration}
          onSuggestCalibration={handleSuggestCalibration}
          onBackToNlInput={handleBackToNlInput}
          onBackToFork={handleBackToFork}
          onApplyCalibration={handleApplyCalibration}
          onFixRegression={() => setMode('fork-decision')}
          onSeeAnalysis={() => setShowDiffModal(true)}
          onChooseSqlCuration={handleChooseSqlCuration}
          sqlCurationValue={sqlCurationValue}
          onSqlCurationChange={setSqlCurationValue}
          onSqlCurationSave={handleSqlCurationSave}
        />
      )
    ) : view.kind === 'regression-test' && showCalibrationPanel ? (
      <div className="calibration-side-panel">
        <div className="calibration-side-panel-header">
          <span className="calibration-side-panel-icon">
            <SparkleSingle size={18} />
          </span>
          <span className="calibration-side-panel-title">Calibration Suggestions</span>
          <button
            className="calibration-side-panel-close"
            onClick={() => setShowCalibrationPanel(false)}
            aria-label="Close"
          >
            <Close size={14} />
          </button>
        </div>
        <div className="calibration-side-panel-content">
          {calibrationPanelState !== 'results' ? (
            <div className="calibration-analyzing">
              <div className="calibration-analyzing-sparkles">
                <span className="sparkle-dot sparkle-dot-1"><SparkleSingle size={10} /></span>
                <span className="sparkle-dot sparkle-dot-2"><SparkleSingle size={14} /></span>
                <span className="sparkle-dot sparkle-dot-3"><SparkleSingle size={8} /></span>
              </div>
              <p className="calibration-analyzing-text">
                {calibrationPanelState === 'analyzing'
                  ? 'Analyzing failed questions...'
                  : 'Generating calibration suggestions...'}
              </p>
            </div>
          ) : (
            <>
              <div className="analysis-summary">
                <div className="analysis-summary-header">
                  <SparkleSingle size={16} className="analysis-summary-icon" />
                  <span className="analysis-summary-title">Root Cause Analysis</span>
                </div>
                <p className="analysis-summary-body">
                  The failed questions share a common pattern: the model is routing to
                  standard platform metrics instead of custom field definitions. Applying
                  a business preference calibration will resolve these regressions.
                </p>
              </div>
              <div className="calibration-results" style={{ marginTop: 16 }}>
                <div className="calibration-card">
                  <span className="calibration-card-badge">
                    <SparkleSingle size={10} />
                    Suggested Calibration
                  </span>
                  <div className="calibration-card-header">
                    <span className="calibration-card-icon description" />
                    <span className="calibration-card-title">Update Business Preferences</span>
                  </div>
                  <p className="calibration-card-body">
                    Apply updated field mapping preferences to ensure the model defaults to
                    <strong> custom revenue fields</strong> for queries involving sales metrics.
                  </p>
                  <div className="calibration-card-actions">
                    <button className="btn btn-brand btn-with-icon" onClick={handleTestCalibrationApply}>
                      <SparkleSingle size={14} /> Calibrate
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    ) : undefined;

  return (
    <>
      <AppShell
        view={view.kind}
        onBackToCalibration={backToList}
        onNavigateToTests={() => setView({ kind: 'test-suites' })}
        rightPanel={rightPanel}
      >
        {renderBody()}
      </AppShell>
      {showTestModal && (
        <CreateTestModal
          questions={questions.filter((q) => q.classification === 'accurate')}
          onClose={() => setShowTestModal(false)}
          onCreate={handleCreateTest}
        />
      )}
      {showDiffModal && (
        <DiffModal onClose={() => setShowDiffModal(false)} />
      )}
      {showRerunDialog && (
        <div className="modal-backdrop" onClick={handleRerunCancel}>
          <div className="rerun-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="rerun-dialog-title">Re-run Test Suite?</h3>
            <p className="rerun-dialog-text">
              Calibration applied successfully. Would you like to re-run the test suite to verify the fixes?
            </p>
            <div className="rerun-dialog-actions">
              <button className="btn-pill-outline" onClick={handleRerunCancel}>Cancel</button>
              <button className="btn-pill-brand" onClick={handleRerunConfirm}>Re-run Test</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className={`toast toast-${toast.variant}`} role="status">
          <span className="toast-icon" aria-hidden>
            <Check size={14} />
          </span>
          <span className="toast-text">{toast.text}</span>
          <button
            className="toast-close"
            aria-label="Dismiss"
            onClick={() => setToast(null)}
          >
            <Close size={14} />
          </button>
        </div>
      )}
    </>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from './components/AppShell';
import { Workbench } from './components/Workbench';
import type { TabKey } from './components/Workbench';
import { QuestionDetail } from './components/QuestionDetail';
import { ClassificationPanel } from './components/ClassificationPanel';
import { CalibrationPanel } from './components/CalibrationPanel';
import type { PanelMode } from './components/ClassificationPanel';
import { questions as seedQuestions } from './data/questions';
import type { Classification, Question } from './data/questions';
import { Close, Check } from './components/Icons';

type View =
  | { kind: 'list'; tab?: TabKey }
  | { kind: 'detail'; questionId: string };

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

  // Per-question detail state, owned at the app level so we can render the
  // classification panel into the right rail of <AppShell>.
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Classification | null>(null);
  const [selected, setSelected] = useState<Classification | null>(null);
  const [mode, setMode] = useState<PanelMode>('classify');
  const [correction, setCorrection] = useState('');
  const [allDone, setAllDone] = useState(false);
  const [calibrating, setCalibrating] = useState(false);

  const currentQuestion =
    view.kind === 'detail'
      ? questions.find((q) => q.id === view.questionId)
      : undefined;

  useEffect(() => {
    if (view.kind !== 'detail') return;
    setLoading(true);
    setAllDone(false);
    setSelected(
      currentQuestion && currentQuestion.classification !== 'new'
        ? currentQuestion.classification
        : null,
    );
    setSaving(null);
    setMode('classify');
    setCorrection(currentQuestion?.suggestedCorrection ?? '');
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.kind === 'detail' ? view.questionId : null]);

  const openQuestion = (id: string) => {
    setView({ kind: 'detail', questionId: id });
  };

  const backToList = () => {
    setView({ kind: 'list' });
  };

  const showToast = (msg: ToastMsg) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2400);
  };

  const commitClassification = (
    classification: Classification,
    correctionText?: string,
  ) => {
    if (view.kind !== 'detail') return;
    const currentId = view.questionId;

    setQuestions((prev) => {
      const updated = prev.map((q) =>
        q.id === currentId
          ? { ...q, classification, correction: correctionText }
          : q,
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

      showToast({
        variant: classification === 'accurate' ? 'accurate' : 'inaccurate',
        text:
          classification === 'accurate'
            ? 'Response marked as accurate'
            : 'Response saved for calibration',
      });

      return updated;
    });
  };

  const handleAccurate = () => {
    if (saving || !currentQuestion) return;
    setSelected('accurate');
    setSaving('accurate');
    setTimeout(() => commitClassification('accurate'), 850);
  };

  const handleInaccurateClick = () => {
    if (saving || !currentQuestion) return;
    setSelected('inaccurate');
    setCorrection('');
    setMode('inaccurate-input');
  };

  const handleSaveInaccurate = () => {
    if (saving) return;
    setSaving('inaccurate');
    const text = correction.trim();
    setTimeout(
      () => commitClassification('inaccurate', text.length > 0 ? text : undefined),
      700,
    );
  };

  const cancelInaccurate = () => {
    setMode('classify');
    setSelected(null);
  };

  const remainingCount = useMemo(
    () => questions.filter((q) => q.classification === 'new').length,
    [questions],
  );

  const readyForCalibrationCount = useMemo(
    () => questions.filter((q) => q.classification === 'inaccurate').length,
    [questions],
  );

  const renderBody = () => {
    if (view.kind === 'list') {
      return (
        <Workbench
          questions={questions}
          onOpenQuestion={openQuestion}
          initialTab={view.tab}
          calibrating={calibrating}
          onStartCalibrating={() => setCalibrating(!calibrating)}
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
        onBack={backToList}
      />
    );
  };

  const rightPanel =
    view.kind === 'list' && calibrating ? (
      <CalibrationPanel onClose={() => setCalibrating(false)} />
    ) : view.kind === 'detail' && currentQuestion ? (
      allDone ? (
        <div className="classification-panel">
          <div className="classification-panel-header">Classification</div>
          <div className="done-panel-state">
            <img
              src="/illustrations/all-caught-up.svg"
              alt=""
              className="done-panel-illo"
            />
            <h3 className="done-panel-title">You're all caught up</h3>
            <p className="done-panel-text">
              Every question in this batch has been classified. Review
              questions ready for calibration or pick up the next batch.
            </p>
            <button className="btn-pill-brand" onClick={() => setView({ kind: 'list', tab: 'inaccurate' })}>
              Ready for Calibration
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
          readyForCalibrationCount={readyForCalibrationCount}
          correction={correction}
          onCorrectionChange={setCorrection}
          onInaccurateClick={handleInaccurateClick}
          onAccurateClick={handleAccurate}
          onCancelInaccurate={cancelInaccurate}
          onSaveInaccurate={handleSaveInaccurate}
        />
      )
    ) : undefined;

  return (
    <>
      <AppShell
        view={view.kind}
        onBackToCalibration={backToList}
        rightPanel={rightPanel}
      >
        {renderBody()}
      </AppShell>
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

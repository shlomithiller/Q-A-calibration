import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Asterisk, Ban, Info, SparkleSingle, VerifiedCheck } from './Icons';
import { questions as allQuestions } from '../data/questions';

export type DualRunOutcome = 'robust' | 'overfitted' | 'stale-vq';

export function seedDualRunOutcomes(ids: string[]): Record<string, DualRunOutcome> {
  const result: Record<string, DualRunOutcome> = {};
  let overfit = 0;
  let stale = 0;
  if (ids.length >= 5) {
    overfit = 2;
    stale = 2;
  } else if (ids.length >= 2) {
    overfit = 1;
    stale = 1;
  }
  ids.forEach((id, i) => {
    if (i < overfit) result[id] = 'overfitted';
    else if (i < overfit + stale) result[id] = 'stale-vq';
    else result[id] = 'robust';
  });
  return result;
}

interface RegressionTestViewProps {
  testName: string;
  questionIds: string[];
  outcomes: Record<string, DualRunOutcome>;
  onBack: () => void;
  onOpenQuestion: (id: string) => void;
  onCalibrate: () => void;
  onAutoCalibrate?: () => void;
  onRetest: () => void;
  skipAnimation?: boolean;
  showSuggestionBanner?: boolean;
  onComplete?: () => void;
}

type VqStatus = 'Processing' | 'Passed' | 'Failed' | 'Waiting';
type SemanticFitChip = 'robust' | 'overfitted' | 'stale-vq' | 'processing' | null;

interface TestRow {
  id: string;
  question: string;
  vqStatus: VqStatus;
  semanticFit: SemanticFitChip;
  semanticModel: string;
  showResults: boolean;
}

const TOTAL_DURATION = 22000;
const VQ_PHASE = 0.55;

function outcomeOf(outcomes: Record<string, DualRunOutcome>, id: string): DualRunOutcome {
  return outcomes[id] ?? 'robust';
}

function rowAtProgress(
  id: string,
  question: string,
  semanticModel: string,
  outcome: DualRunOutcome,
  pct: number,
  idx: number,
  total: number,
): TestRow {
  const start = idx / total;
  const end = (idx + 1) / total;
  const vqEnd = start + (end - start) * VQ_PHASE;

  if (pct < start) {
    return { id, question, semanticModel, vqStatus: 'Waiting', semanticFit: null, showResults: false };
  }
  if (pct < vqEnd) {
    return { id, question, semanticModel, vqStatus: 'Processing', semanticFit: null, showResults: false };
  }

  if (outcome === 'stale-vq') {
    return {
      id,
      question,
      semanticModel,
      vqStatus: 'Failed',
      semanticFit: 'stale-vq',
      showResults: true,
    };
  }

  if (pct < end) {
    return {
      id,
      question,
      semanticModel,
      vqStatus: 'Passed',
      semanticFit: 'processing',
      showResults: true,
    };
  }

  return {
    id,
    question,
    semanticModel,
    vqStatus: 'Passed',
    semanticFit: outcome === 'overfitted' ? 'overfitted' : 'robust',
    showResults: true,
  };
}

function finalRow(
  id: string,
  question: string,
  semanticModel: string,
  outcome: DualRunOutcome,
): TestRow {
  if (outcome === 'stale-vq') {
    return { id, question, semanticModel, vqStatus: 'Failed', semanticFit: 'stale-vq', showResults: true };
  }
  return {
    id,
    question,
    semanticModel,
    vqStatus: 'Passed',
    semanticFit: outcome === 'overfitted' ? 'overfitted' : 'robust',
    showResults: true,
  };
}

export function RegressionTestView({
  testName,
  questionIds,
  outcomes,
  onBack,
  onOpenQuestion,
  onAutoCalibrate,
  onRetest,
  skipAnimation,
  showSuggestionBanner = true,
  onComplete,
}: RegressionTestViewProps) {
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [rows, setRows] = useState<TestRow[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const animFrameRef = useRef<number>(0);
  const hasRunRef = useRef(false);
  const questionIdsKey = questionIds.join(',');
  const outcomesKey = questionIds.map((id) => `${id}:${outcomeOf(outcomes, id)}`).join('|');

  const buildInitial = (): TestRow[] =>
    questionIds.map((id) => {
      const q = allQuestions.find((question) => question.id === id);
      return {
        id,
        question: q?.text ?? `Question ${id}`,
        vqStatus: 'Waiting' as VqStatus,
        semanticFit: null,
        semanticModel: q?.semanticModel ?? 'C360',
        showResults: false,
      };
    });

  useEffect(() => {
    hasRunRef.current = false;
    setRows(buildInitial());
    setProgress(0);
    setElapsed(0);
    startTimeRef.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIdsKey]);

  useEffect(() => {
    const applyFinal = () => {
      setProgress(1);
      setElapsed(TOTAL_DURATION);
      setRows(
        questionIds.map((id) => {
          const q = allQuestions.find((question) => question.id === id);
          return finalRow(
            id,
            q?.text ?? `Question ${id}`,
            q?.semanticModel ?? 'C360',
            outcomeOf(outcomes, id),
          );
        }),
      );
      hasRunRef.current = true;
    };

    if (hasRunRef.current || skipAnimation) {
      applyFinal();
      return;
    }

    startTimeRef.current = Date.now();

    const tick = () => {
      const now = Date.now();
      const elapsedMs = now - startTimeRef.current;
      const pct = Math.min(elapsedMs / TOTAL_DURATION, 1);
      setProgress(pct);
      setElapsed(elapsedMs);

      const total = questionIds.length;
      setRows(
        questionIds.map((id, idx) => {
          const q = allQuestions.find((question) => question.id === id);
          return rowAtProgress(
            id,
            q?.text ?? `Question ${id}`,
            q?.semanticModel ?? 'C360',
            outcomeOf(outcomes, id),
            pct,
            idx,
            Math.max(total, 1),
          );
        }),
      );

      if (pct < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        hasRunRef.current = true;
        onComplete?.();
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIdsKey, outcomesKey, skipAnimation]);

  const isComplete = progress >= 1;
  const elapsedSeconds = Math.floor(elapsed / 1000);
  const remainingSeconds = isComplete ? 0 : Math.max(0, Math.ceil((TOTAL_DURATION - elapsed) / 1000));

  const total = rows.length;
  const vqPassedCount = rows.filter((r) => r.vqStatus === 'Passed').length;
  const vqFailedCount = rows.filter((r) => r.vqStatus === 'Failed').length;
  const regressionCount = vqFailedCount;
  const passRate = total > 0 ? Math.round((vqPassedCount / total) * 100) : 0;
  const runtimeLabel = elapsedSeconds >= 60
    ? `${Math.max(1, Math.round(elapsedSeconds / 60))}min`
    : `${elapsedSeconds}s`;

  const now = new Date();
  const startTimeStr = now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="regression-test-view">
      <div className="rt-header">
        <div className="rt-title-row">
          <button className="icon-btn-bordered back-arrow" onClick={onBack} aria-label="Back">
            <ArrowLeft size={14} />
          </button>
          <h1 className="rt-title">{testName}</h1>
          <button className="btn-pill-outline" onClick={onRetest}>Retest</button>
        </div>
      </div>

      <div className="rt-metrics rt-metrics-kpis">
        <div className="rt-metric-card">
          <span className="rt-metric-label">
            Number of Regressions
            <Info size={14} className="rt-metric-info" aria-label="Questions that failed and were marked as regression" />
          </span>
          <span className="rt-metric-value">
            {isComplete ? regressionCount : 'Processing...'}
          </span>
        </div>
        <div className="rt-metric-card">
          <span className="rt-metric-label">Runtime</span>
          <span className="rt-metric-value">
            {isComplete ? runtimeLabel : 'Processing...'}
          </span>
        </div>
        <div className="rt-metric-card">
          <span className="rt-metric-label">Pass Rate %</span>
          <span className="rt-metric-value">
            {isComplete ? passRate : 'Processing...'}
          </span>
        </div>
      </div>

      <div className="rt-metadata-bar">
        <div className="rt-meta-item">
          <span className="rt-meta-label">Agent</span>
          <span className="rt-meta-value">Concierge Sales</span>
        </div>
        <div className="rt-meta-item">
          <span className="rt-meta-label">Run by</span>
          <span className="rt-meta-value">Harry Anderson</span>
        </div>
        <div className="rt-meta-item">
          <span className="rt-meta-label">Start time</span>
          <span className="rt-meta-value">{startTimeStr}</span>
        </div>
        <div className="rt-meta-item">
          <span className="rt-meta-label">Description</span>
          <span className="rt-meta-value rt-meta-value-muted">
            Dual-run regression: VQ Path and Semantic Fit
          </span>
        </div>
        <div className={`rt-meta-progress ${isComplete ? 'rt-meta-progress-done' : ''}`}>
          <div className="rt-progress-labels">
            <span><strong>Processing:</strong> {Math.round(progress * 100)}% ({elapsedSeconds}s elapsed)</span>
            <span>Estimated Remaining: ~{remainingSeconds}s</span>
          </div>
          <div className="rt-progress-bar">
            <div
              className="rt-progress-fill"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {isComplete && onAutoCalibrate && showSuggestionBanner && (
        <div className="ac-banner">
          <div className="ac-banner-left">
            <SparkleSingle size={14} />
            <span>There are new calibration suggestions based on this test suite&apos;s results.</span>
          </div>
          <button type="button" onClick={onAutoCalibrate}>Review calibrations</button>
        </div>
      )}

      <div className="rt-results-card">
        <div className="rt-results-toolbar">
          <span>
            {rows.length} questions
            {` • ${vqPassedCount} passed • ${vqFailedCount} failed`}
            {!isComplete ? ` • ${rows.filter((r) => r.vqStatus === 'Processing').length} in process` : ''}
          </span>
        </div>
        <div className="rt-results-table-wrap">
          <table className="rt-results-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Semantic Model</th>
                <th>Classification</th>
                <th>Test Result</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isRegression = row.vqStatus === 'Failed';
                const resultBusy = row.vqStatus === 'Processing' || row.vqStatus === 'Waiting';
                return (
                  <tr key={row.id}>
                    <td className="rt-col-question">{row.question}</td>
                    <td className="rt-col-model">{row.semanticModel}</td>
                    <td>
                      {isRegression ? (
                        <span className="rt-badge rt-badge-class-regression">
                          <Ban size={12} />
                          Regression
                        </span>
                      ) : (
                        <span className="rt-badge rt-badge-class-verified">
                          <VerifiedCheck size={12} />
                          Verified
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`rt-badge ${resultBusy ? 'rt-badge-processing' : `rt-badge-${row.vqStatus.toLowerCase()}`}`}>
                        {resultBusy && <Asterisk size={12} />}
                        {resultBusy ? 'Processing...' : row.vqStatus}
                      </span>
                    </td>
                    <td>
                      <button
                        className="rt-show-results"
                        disabled={!row.showResults}
                        onClick={() => onOpenQuestion(row.id)}
                      >
                        Show Results
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

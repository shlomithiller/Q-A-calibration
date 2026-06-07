import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Warning } from './Icons';
import { questions as allQuestions } from '../data/questions';

interface RegressionTestViewProps {
  testName: string;
  questionIds: string[];
  failedIds: Set<string>;
  onBack: () => void;
  onOpenQuestion: (id: string) => void;
  onCalibrate: () => void;
  onRetest: () => void;
  skipAnimation?: boolean;
  onComplete?: () => void;
}

type TestStatus = 'Processing' | 'Passed' | 'Failed' | 'Waiting';

interface TestRow {
  id: string;
  question: string;
  status: TestStatus;
  semanticModel: string;
}

const TOTAL_DURATION = 22000;

export function RegressionTestView({
  testName,
  questionIds,
  failedIds,
  onBack,
  onOpenQuestion,
  onCalibrate,
  onRetest,
  skipAnimation,
  onComplete,
}: RegressionTestViewProps) {
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [rows, setRows] = useState<TestRow[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const animFrameRef = useRef<number>(0);
  const hasRunRef = useRef(false);
  const questionIdsKey = questionIds.join(',');

  useEffect(() => {
    if (hasRunRef.current && rows.length > 0) return;
    const initialRows: TestRow[] = questionIds.map((id) => {
      const q = allQuestions.find((question) => question.id === id);
      return {
        id,
        question: q?.text ?? `Question ${id}`,
        status: 'Waiting' as TestStatus,
        semanticModel: q?.semanticModel ?? 'C360',
      };
    });
    setRows(initialRows);
    setProgress(0);
    setElapsed(0);
    startTimeRef.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIdsKey]);

  useEffect(() => {
    if (hasRunRef.current || skipAnimation) {
      setProgress(1);
      setElapsed(TOTAL_DURATION);
      setRows((prev) =>
        prev.map((row) => ({
          ...row,
          status: failedIds.has(row.id) ? 'Failed' as TestStatus : 'Passed' as TestStatus,
        })),
      );
      hasRunRef.current = true;
      return;
    }

    startTimeRef.current = Date.now();

    const tick = () => {
      const now = Date.now();
      const elapsedMs = now - startTimeRef.current;
      const pct = Math.min(elapsedMs / TOTAL_DURATION, 1);
      setProgress(pct);
      setElapsed(elapsedMs);

      setRows((prev) => {
        const total = prev.length;
        if (total === 0) return prev;

        return prev.map((row, idx) => {
          const rowEndPct = (idx + 1) / total;
          const rowStartPct = idx / total;

          let status: TestStatus;
          if (pct >= rowEndPct) {
            status = failedIds.has(row.id) ? 'Failed' : 'Passed';
          } else if (pct >= rowStartPct) {
            status = 'Processing';
          } else {
            status = 'Waiting';
          }

          return { ...row, status };
        });
      });

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
  }, [questionIdsKey, failedIds]);

  const isComplete = progress >= 1;
  const elapsedSeconds = Math.floor(elapsed / 1000);
  const remainingSeconds = isComplete ? 0 : Math.max(0, Math.ceil((TOTAL_DURATION - elapsed) / 1000));

  const passedCount = rows.filter((r) => r.status === 'Passed').length;
  const failedCount = rows.filter((r) => r.status === 'Failed').length;
  const passPercent = rows.length > 0 ? Math.round((passedCount / rows.length) * 100) : 0;

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

      <div className="rt-metrics">
        <div className="rt-metric-card">
          <span className="rt-metric-label">Status</span>
          <span className="rt-metric-value">
            {isComplete ? 'Complete' : 'Processing...'}
          </span>
        </div>
        <div className="rt-metric-card">
          <span className="rt-metric-label">Runtime</span>
          <span className="rt-metric-value">
            {isComplete ? `~${elapsedSeconds}s` : '-'}
          </span>
        </div>
        <div className="rt-metric-card">
          <span className="rt-metric-label">Overall Accuracy</span>
          <span className={`rt-metric-value ${isComplete && passPercent < 100 ? 'rt-metric-warn' : ''}`}>
            {isComplete ? `${passPercent}%` : '-'}
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
            Regression test for selected questions
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

      {isComplete && failedCount > 0 && (
        <div className="rt-scoped-notification">
          <div className="rt-scoped-notification-left">
            <Warning size={16} />
            <span>{failedCount} question{failedCount > 1 ? 's' : ''} failed the test and marked as regression. Calibrate the model to resolve.</span>
          </div>
          <button className="rt-scoped-notification-link" onClick={onCalibrate}>
            Calibrate this test suite
          </button>
        </div>
      )}

      <div className="rt-results-card">
        <div className="rt-results-toolbar">
          <span>{rows.length} questions{isComplete ? ` • ${passedCount} passed • ${failedCount} failed` : ''}</span>
        </div>
        <div className="rt-results-table-wrap">
          <table className="rt-results-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Status</th>
                <th>Semantic Model</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="rt-col-question">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (isComplete) onOpenQuestion(row.id);
                      }}
                    >
                      {row.question}
                    </a>
                  </td>
                  <td>
                    <span className={`rt-badge rt-badge-${row.status.toLowerCase()}`}>
                      {row.status === 'Processing' ? 'Processing...' : row.status}
                    </span>
                  </td>
                  <td>{row.semanticModel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

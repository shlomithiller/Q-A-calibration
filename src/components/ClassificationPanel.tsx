import { useEffect, useRef } from 'react';
import type { Classification } from '../data/questions';
import { Warning, Shield, Check, SparkleSingle, Sparkles, Code, ChevronRight } from './Icons';
import { DotSpinner } from './DotSpinner';

export type PanelMode =
  | 'classify'
  | 'regression-analysis'
  | 'nl-input'
  | 'suggesting'
  | 'suggestion-preview'
  | 'calibrating'
  | 're-evaluating'
  | 'verifying';

interface ClassificationPanelProps {
  mode: PanelMode;
  loading?: boolean;
  onSkipLoading?: () => void;
  onNextQuestion?: () => void;
  hasNextQuestion?: boolean;
  selected: Classification | null;
  saving: Classification | null;
  remainingCount: number;
  totalCount: number;
  questionClassification?: Classification;
  fromTest?: boolean;
  correction: string;
  onCorrectionChange: (next: string) => void;
  onInaccurateClick: () => void;
  onAccurateClick: () => void;
  onConfirmAccurate?: () => void;
  onChangeClassification: () => void;
  onSuggestCalibration: () => void;
  onBackToNlInput: () => void;
  onSuggestMore: () => void;
  onApplyCalibration: () => void;
  onSaveAndSuggest?: () => void;
  onFixRegression?: () => void;
  onSeeAnalysis?: () => void;
  onChooseSqlCuration: () => void;
}

export function ClassificationPanel({
  mode,
  loading,
  onSkipLoading,
  onNextQuestion,
  hasNextQuestion,
  questionClassification,
  selected,
  saving,
  remainingCount,
  totalCount,
  fromTest: _fromTest,
  correction,
  onCorrectionChange,
  onInaccurateClick,
  onAccurateClick,
  onConfirmAccurate,
  onChangeClassification,
  onSuggestCalibration,
  onBackToNlInput,
  onSuggestMore,
  onApplyCalibration,
  onSaveAndSuggest,
  onFixRegression,
  onSeeAnalysis,
  onChooseSqlCuration,
}: ClassificationPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (mode === 'nl-input' && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [mode]);

  const isGolden = questionClassification === 'accurate';
  const completed = totalCount - remainingCount;
  const progressPct =
    totalCount > 0 ? Math.max(0, Math.min(100, (completed / totalCount) * 100)) : 0;

  return (
    <div className="classification-panel">
      <div className="classification-panel-header">Classification</div>

      {questionClassification === 'new' && (
        <div className="classification-progress-section">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="progress-label">
            <strong>{remainingCount} triage questions</strong> left to review
          </div>
        </div>
      )}

      {loading ? (
        <>
          <div className="classification-body">
            <div className="calibration-analyzing">
              <DotSpinner />
              <p className="calibration-analyzing-text">
                Checking response against expected answer...
              </p>
            </div>
          </div>
          <div className="classification-actions">
            <button className="btn-pill-outline" onClick={onSkipLoading}>
              Skip
            </button>
            {hasNextQuestion && (
              <button className="btn-pill-brand" onClick={onNextQuestion}>
                Next Question
              </button>
            )}
          </div>
        </>
      ) : (
        <>
      {mode === 'classify' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div className="classification-body">
          <p className="classification-prompt">
            How would you classify the agent's response?
          </p>
          <div className="classification-cards equal-height">
            <button
              className={`classification-option inaccurate ${
                selected === 'inaccurate' ? 'selected' : ''
              } ${isGolden ? 'disabled-muted' : ''}`}
              onClick={isGolden ? undefined : onInaccurateClick}
              disabled={Boolean(saving) || isGolden}
            >
              <div className="option-icon">
                <Warning size={16} />
              </div>
              <div className="option-content">
                <div className="option-title">Inaccurate</div>
                <div className="option-desc">
                  Use this example to diagnose the issue and test semantic
                  model calibrations.
                </div>
              </div>
              {selected === 'inaccurate' && (
                <div className="option-check">
                  <Check size={14} />
                </div>
              )}
            </button>

            <button
              className={`classification-option verified ${
                selected === 'accurate' || isGolden ? 'selected' : ''
              } ${isGolden ? 'disabled-selected' : ''}`}
              onClick={isGolden ? undefined : onAccurateClick}
              disabled={Boolean(saving) || isGolden}
            >
              <div className="option-icon">
                <Shield size={16} />
              </div>
              <div className="option-content">
                <div className="option-title">Verified</div>
                <div className="option-desc">
                  This example will be saved as a verified reference to guide future agent responses.
                </div>
              </div>
              {(selected === 'accurate' || isGolden) && (
                <div className="option-check">
                  <Check size={14} />
                </div>
              )}
            </button>
          </div>

        </div>

          {(selected === 'accurate' || isGolden) && (
            <div className="accurate-bottom-section">
              <div className="classification-actions">
                <button className="btn-pill-outline" onClick={onChangeClassification}>Back</button>
                <button className="btn-pill-brand" onClick={onConfirmAccurate}>Next Question</button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'regression-analysis' && (
        <>
          <div className="inaccurate-status">
            <span className="badge-error">Regression</span>
            <button className="link-button" onClick={onChangeClassification}>Change</button>
          </div>
          <div className="classification-body">
            <div className="ai-analysis-card">
              <div className="ai-analysis-header">
                <Sparkles size={14} />
                <span className="ai-analysis-title">AI Judge Analysis</span>
              </div>
              <p className="ai-analysis-body">
                The test failed due to a logic mismatch. The actual response does not align with your expected query baseline.
              </p>
              <button className="btn-pill-outline ai-analysis-btn" onClick={onSeeAnalysis}>See Analysis</button>
            </div>
          </div>
          <div className="classification-actions">
            <span />
            <button className="btn-pill-brand" onClick={onFixRegression}>Fix Regression <ChevronRight size={14} /></button>
          </div>
        </>
      )}

      {mode === 'nl-input' && (
        <>
          {questionClassification === 'regression' && (
            <div className="inaccurate-status">
              <span className="badge-error">Regression</span>
              <button className="link-button" onClick={onChangeClassification}>Change</button>
            </div>
          )}
          <div className="inaccurate-body">
            <p className="inaccurate-prompt">
              Describe the issue and the desired correct behavior
            </p>
            <div
              className={`ai-input-wrap ${
                correction.trim() ? 'has-content' : ''
              }`}
            >
              <div className="ai-input-glow" aria-hidden />
              <div className="ai-input">
                <span className="ai-input-icon" aria-hidden>
                  <SparkleSingle size={14} />
                </span>
                <textarea
                  ref={textareaRef}
                  className="ai-input-textarea"
                  value={correction}
                  onChange={(e) => onCorrectionChange(e.target.value)}
                  rows={6}
                  placeholder="Tip: Describe the expected behavior or correct answer so the agent can learn from this example..."
                />
              </div>
            </div>
            <div className="alt-action">
              OR{' '}
              <button
                type="button"
                className="link-button"
                onClick={onChangeClassification}
              >
                Classify Manually
              </button>
            </div>
          </div>
          <div className="classification-actions">
            <button
              className="btn-pill-outline"
              onClick={onChangeClassification}
            >
              Back
            </button>
            <button
              className="btn-pill-brand btn-with-icon"
              onClick={onSuggestCalibration}
              disabled={correction.trim().length === 0}
            >
              <SparkleSingle size={14} /> Suggest Calibration
            </button>
          </div>
        </>
      )}

      {mode === 'suggesting' && (
        <>
          <div className="classification-body">
            <div className="calibration-analyzing">
              <div className="calibration-analyzing-sparkles">
                <span className="sparkle-dot sparkle-dot-1"><SparkleSingle size={10} /></span>
                <span className="sparkle-dot sparkle-dot-2"><SparkleSingle size={14} /></span>
                <span className="sparkle-dot sparkle-dot-3"><SparkleSingle size={8} /></span>
              </div>
              <p className="calibration-analyzing-text">
                Generating calibration suggestion...
              </p>
            </div>
          </div>
        </>
      )}

      {mode === 'suggestion-preview' && (
        <>
          <div className="classification-body">
            <div className="analysis-summary">
              <div className="analysis-summary-header">
                <SparkleSingle size={16} className="analysis-summary-icon" />
                <span className="analysis-summary-title">Analysis Summary</span>
              </div>
              <p className="analysis-summary-body">
                Based on your feedback, the agent confirmed a mismatch between your intent
                and the semantic routing: the system mapped the query to a standard platform
                metric (<strong>Opportunity.Amount</strong>), overlooking your specific custom
                data definitions. To resolve this, we recommend applying the following calibration:
              </p>
            </div>

            <div className="calibration-results">
              <div className="calibration-card">
                <span className="calibration-card-badge">
                  <SparkleSingle size={10} />
                  Suggested Calibration
                </span>
                <div className="calibration-card-header">
                  <span className="calibration-card-icon description" />
                  <span className="calibration-card-title">Add Business Preference</span>
                </div>
                <p className="calibration-card-body">
                  Adding a business preference will explicitly instruct the model to bypass
                  standard mapping and default to <strong>Opportunity.Expected</strong> for
                  future queries involving revenue, ensuring the agent strictly follows your
                  local business logic.
                </p>
                <div className="calibration-card-actions">
                  <button className="btn btn-brand btn-with-icon" onClick={onApplyCalibration}>
                    <SparkleSingle size={14} /> Calibrate
                  </button>
                </div>
              </div>
            </div>

            <button type="button" className="link-button suggest-more-link" onClick={onSuggestMore}>
              Suggest more
            </button>

            <hr className="classification-divider" />

            <button
              type="button"
              className="curate-query-card"
              onClick={onChooseSqlCuration}
            >
              <span className="curate-query-icon">
                <Code size={14} />
              </span>
              <div className="curate-query-content">
                <span className="curate-query-title">Curate Verified Query</span>
                <p className="curate-query-desc">
                  Enables direct modification of the SQL syntax to establish an expected
                  query for regression testing and to guide the agent as a verified example.
                </p>
              </div>
            </button>
          </div>
          <div className="classification-actions">
            <button
              className="btn-pill-outline"
              onClick={onBackToNlInput}
            >
              Back
            </button>
            <button
              className="btn-pill-muted btn-with-icon-muted"
              onClick={onSaveAndSuggest ?? onApplyCalibration}
            >
              <SparkleSingle size={14} /> Save &amp; Suggest
            </button>
          </div>
        </>
      )}

      {mode === 'calibrating' && (
        <>
          <div className="classification-body">
            <div className="calibration-analyzing">
              <div className="calibration-analyzing-sparkles">
                <span className="sparkle-dot sparkle-dot-1"><SparkleSingle size={10} /></span>
                <span className="sparkle-dot sparkle-dot-2"><SparkleSingle size={14} /></span>
                <span className="sparkle-dot sparkle-dot-3"><SparkleSingle size={8} /></span>
              </div>
              <p className="calibration-analyzing-text">
                Calibrating model...
              </p>
            </div>
          </div>
        </>
      )}

      {mode === 're-evaluating' && (
        <>
          <div className="classification-body">
            <div className="calibration-analyzing">
              <DotSpinner />
              <p className="calibration-analyzing-text">
                Re-evaluating question...
              </p>
            </div>
          </div>
        </>
      )}

      {mode === 'verifying' && (
        <>
          <div className="classification-body">
            <div className="calibration-analyzing">
              <DotSpinner />
              <p className="calibration-analyzing-text">
                Verifying question...
              </p>
            </div>
          </div>
        </>
      )}
        </>
      )}
    </div>
  );
}

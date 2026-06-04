import { useEffect, useRef } from 'react';
import type { Classification } from '../data/questions';
import { Warning, Shield, Check, SparkleSingle, Sparkles, Code, ArrowLeft } from './Icons';

export type PanelMode =
  | 'classify'
  | 'fork-decision'
  | 'nl-input'
  | 'suggesting'
  | 'suggestion-preview'
  | 'calibrating'
  | 're-evaluating';

interface ClassificationPanelProps {
  mode: PanelMode;
  selected: Classification | null;
  saving: Classification | null;
  remainingCount: number;
  totalCount: number;
  questionClassification?: Classification;
  correction: string;
  onCorrectionChange: (next: string) => void;
  onInaccurateClick: () => void;
  onAccurateClick: () => void;
  onChangeClassification: () => void;
  onChooseCalibration: () => void;
  onSuggestCalibration: () => void;
  onBackToNlInput: () => void;
  onBackToFork: () => void;
  onApplyCalibration: () => void;
}

export function ClassificationPanel({
  mode,
  questionClassification,
  selected,
  saving,
  remainingCount,
  totalCount,
  correction,
  onCorrectionChange,
  onInaccurateClick,
  onAccurateClick,
  onChangeClassification,
  onChooseCalibration,
  onSuggestCalibration,
  onBackToNlInput,
  onBackToFork,
  onApplyCalibration,
}: ClassificationPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (mode === 'nl-input' && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [mode]);

  const completed = totalCount - remainingCount;
  const progressPct =
    totalCount > 0 ? Math.max(0, Math.min(100, (completed / totalCount) * 100)) : 0;

  return (
    <div className="classification-panel">
      <div className="classification-panel-header">Classification</div>

      <div className="classification-progress-section">
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="progress-label">
          <strong>{remainingCount} questions</strong> left to review
        </div>
      </div>

      {mode === 'classify' && (
        <div className="classification-body">
          <p className="classification-prompt">
            How would you classify the agent's response?
          </p>
          <div className="classification-cards equal-height">
            <button
              className={`classification-option inaccurate ${
                selected === 'inaccurate' ? 'selected' : ''
              }`}
              onClick={onInaccurateClick}
              disabled={Boolean(saving)}
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
              className={`classification-option accurate ${
                selected === 'accurate' ? 'selected' : ''
              }`}
              onClick={onAccurateClick}
              disabled={Boolean(saving)}
            >
              <div className="option-icon">
                <Shield size={16} />
              </div>
              <div className="option-content">
                <div className="option-title">Accurate</div>
                <div className="option-desc">
                  This response is correct and will be saved to the Golden
                  Data Set as expected query for future regression tests.
                </div>
              </div>
              {selected === 'accurate' && (
                <div className="option-check">
                  <Check size={14} />
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      {mode === 'fork-decision' && (
        <>
          <div className="inaccurate-status">
            {questionClassification === 'regression'
              ? <span className="badge-error">Regression</span>
              : <span className="badge-warning">Inaccurate</span>}
          </div>
          <div className="classification-body">
            <p className="classification-prompt">
              How would you like to resolve this inaccuracy?
            </p>
            <div className="classification-cards equal-height">
              <button
                className="classification-option fork-option"
                onClick={() => {}}
              >
                <div className="option-icon" style={{ background: 'var(--color-surface-3)', color: 'var(--color-on-surface-1)' }}>
                  <Code size={16} />
                </div>
                <div className="option-content">
                  <div className="option-title">SQL Curation</div>
                  <div className="option-desc">
                    Manually write or edit the expected SQL query.
                  </div>
                </div>
                <span className="badge coming-soon-badge">Coming soon</span>
              </button>

              <button
                className="classification-option fork-option"
                onClick={onChooseCalibration}
              >
                <div className="option-icon" style={{ background: 'var(--color-brand-95)', color: 'var(--color-brand)' }}>
                  <Sparkles size={16} />
                </div>
                <div className="option-content">
                  <div className="option-title">Calibration</div>
                  <div className="option-desc">
                    Describe the issue in natural language and let AI suggest a
                    calibration to fix it.
                  </div>
                </div>
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
          </div>
        </>
      )}

      {mode === 'nl-input' && (
        <>
          <div className="inaccurate-status">
            {questionClassification === 'regression'
              ? <span className="badge-error">Regression</span>
              : <span className="badge-warning">Inaccurate</span>}
          </div>
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
              onClick={onBackToFork}
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
          <div className="inaccurate-status">
            {questionClassification === 'regression'
              ? <span className="badge-error">Regression</span>
              : <span className="badge-warning">Inaccurate</span>}
          </div>
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
          </div>
          <div className="classification-actions">
            <button
              className="btn-pill-outline"
              onClick={onBackToNlInput}
            >
              Back
            </button>
          </div>
        </>
      )}

      {mode === 'calibrating' && (
        <>
          <div className="inaccurate-status">
            {questionClassification === 'regression'
              ? <span className="badge-error">Regression</span>
              : <span className="badge-warning">Inaccurate</span>}
          </div>
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
          <div className="inaccurate-status">
            {questionClassification === 'regression'
              ? <span className="badge-error">Regression</span>
              : <span className="badge-warning">Inaccurate</span>}
          </div>
          <div className="classification-body">
            <div className="calibration-analyzing">
              <div className="spinner" />
              <p className="calibration-analyzing-text">
                Re-evaluating question...
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

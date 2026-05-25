import { useEffect, useRef } from 'react';
import type { Classification } from '../data/questions';
import { Warning, Shield, Check, SparkleSingle, Sparkles } from './Icons';

export type PanelMode = 'classify' | 'inaccurate-input';

interface ClassificationPanelProps {
  mode: PanelMode;
  selected: Classification | null;
  saving: Classification | null;
  remainingCount: number;
  totalCount: number;
  readyForCalibrationCount: number;
  correction: string;
  onCorrectionChange: (next: string) => void;
  onInaccurateClick: () => void;
  onAccurateClick: () => void;
  onCancelInaccurate: () => void;
  onSaveInaccurate: () => void;
}

export function ClassificationPanel({
  mode,
  selected,
  saving,
  remainingCount,
  totalCount,
  readyForCalibrationCount,
  correction,
  onCorrectionChange,
  onInaccurateClick,
  onAccurateClick,
  onCancelInaccurate,
  onSaveInaccurate,
}: ClassificationPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (mode === 'inaccurate-input' && textareaRef.current) {
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

      {mode === 'classify' ? (
        <div className="classification-body">
          <p className="classification-prompt">
            How would you classify the agent's response?
          </p>
          <div className="classification-cards">
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
                  This response is correct and will be saved as expected
                  query for future agent responses.
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
      ) : (
        <>
          <div className="inaccurate-status">
            <span className="badge-warning">Inaccurate</span>
            <button
              className="link-button"
              onClick={onCancelInaccurate}
              disabled={Boolean(saving)}
            >
              Change
            </button>
          </div>
          <div className="inaccurate-body">
            <p className="inaccurate-prompt">
              Please describe what went wrong, and the desired state
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
                  disabled={Boolean(saving)}
                />
              </div>
            </div>
            <div className="alt-action">
              OR{' '}
              <button
                type="button"
                className="link-button"
                onClick={onCancelInaccurate}
                disabled={Boolean(saving)}
              >
                Classify Manually
              </button>
            </div>
          </div>
          <div className="classification-actions">
            <button
              className="btn-pill-brand"
              onClick={onSaveInaccurate}
              disabled={Boolean(saving) || correction.trim().length === 0}
            >
              Save &amp; Next
            </button>
          </div>
        </>
      )}

      {readyForCalibrationCount > 0 && (
        <div className="calibration-banner">
          <div className="calibration-banner-title">
            <Sparkles size={16} />
            <span>{readyForCalibrationCount} Question{readyForCalibrationCount > 1 ? 's' : ''} Ready for Calibration</span>
          </div>
          <p className="calibration-banner-text">
            AI can analyze inaccurate answers to find root causes and suggest model improvements.
          </p>
          <button className="link-button" type="button">
            Start Calibrating
          </button>
        </div>
      )}
    </div>
  );
}

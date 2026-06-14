import { useEffect, useRef, useState } from 'react';
import type { Classification } from '../data/questions';
import { Warning, Shield, Check, SparkleSingle, Sparkles, Code, ArrowLeft, ChevronRight } from './Icons';

export type PanelMode =
  | 'classify'
  | 'regression-analysis'
  | 'fork-decision'
  | 'nl-input'
  | 'suggesting'
  | 'suggestion-preview'
  | 'calibrating'
  | 're-evaluating'
  | 'sql-curation';

interface ClassificationPanelProps {
  mode: PanelMode;
  selected: Classification | null;
  saving: Classification | null;
  remainingCount: number;
  totalCount: number;
  questionClassification?: Classification;
  verified: boolean;
  onVerifiedChange: (v: boolean) => void;
  fromTest?: boolean;
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
  onFixRegression?: () => void;
  onSeeAnalysis?: () => void;
  onChooseSqlCuration: () => void;
  sqlCurationValue: string;
  onSqlCurationChange: (v: string) => void;
  onSqlCurationSave: () => void;
  allQuestions: { id: string; text: string; sql: string }[];
}

export function ClassificationPanel({
  mode,
  questionClassification,
  selected,
  saving,
  remainingCount,
  totalCount,
  verified,
  onVerifiedChange,
  fromTest,
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
  onFixRegression,
  onSeeAnalysis,
  onChooseSqlCuration,
  sqlCurationValue,
  onSqlCurationChange,
  onSqlCurationSave,
  allQuestions,
}: ClassificationPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (mode === 'nl-input' && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [mode]);

  const isGolden = questionClassification === 'accurate' || (fromTest && questionClassification === 'accurate');
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

      {mode === 'classify' && (
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
              className={`classification-option accurate ${
                selected === 'accurate' || isGolden ? 'selected' : ''
              } ${isGolden ? 'disabled-selected' : ''}`}
              onClick={isGolden ? undefined : onAccurateClick}
              disabled={Boolean(saving) || isGolden}
            >
              <div className="option-icon">
                <Check size={16} />
              </div>
              <div className="option-content">
                <div className="option-title">Accurate</div>
                <div className="option-desc">
                  This response is correct and will be saved as expected query for future agent responses.
                </div>
              </div>
              {(selected === 'accurate' || isGolden) && (
                <div className="option-check">
                  <Check size={14} />
                </div>
              )}
            </button>
          </div>

          {isGolden && (
            <div className="verification-toggle-section">
              <div className="verification-toggle-left">
                <div className="verification-toggle-icon">
                  <Shield size={16} />
                </div>
                <div className="verification-toggle-content">
                  <div className="verification-toggle-title">Mark as Verified</div>
                  <div className="verification-toggle-desc">This example will be saved as a verified reference to guide future agent responses.</div>
                </div>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={verified} onChange={(e) => onVerifiedChange(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
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

      {mode === 'fork-decision' && (
        <>
          <div className="inaccurate-status">
            {questionClassification === 'regression'
              ? <span className="badge-error">Regression</span>
              : <span className="badge-warning">Inaccurate</span>}
            {questionClassification === 'regression' && (
              <button className="link-button" onClick={onChangeClassification}>Change</button>
            )}
          </div>
          <div className="classification-body">
            <p className="classification-prompt">
              How would you like to resolve this inaccuracy?
            </p>
            <div className="classification-cards equal-height">
              <button
                className="classification-option fork-option"
                onClick={onChooseSqlCuration}
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

      {mode === 'sql-curation' && (
        <SqlCurationPanel
          questionClassification={questionClassification}
          sqlCurationValue={sqlCurationValue}
          onSqlCurationChange={onSqlCurationChange}
          onSqlCurationSave={onSqlCurationSave}
          onBackToFork={onBackToFork}
          allQuestions={allQuestions}
        />
      )}
    </div>
  );
}

type ValidateState = 'idle' | 'validating' | 'success' | 'error';

function getErrorExample(sql: string): { bad: string; good: string } {
  const s = sql.trim();
  const up = s.toUpperCase();
  if (!s) return {
    bad: '(empty)',
    good: "SELECT col FROM SEMANTIC_VIEW('model', ...)",
  };
  if (!up.includes('SELECT')) return {
    bad: s.split('\n')[0].slice(0, 60) || s.slice(0, 60),
    good: "SELECT product_name, total_sales FROM SEMANTIC_VIEW('sales_extended', ...)",
  };
  if (!up.includes('FROM') && !up.includes('SEMANTIC_VIEW')) return {
    bad: 'SELECT product_name, total_sales',
    good: "SELECT product_name, total_sales FROM SEMANTIC_VIEW('sales_extended', ...)",
  };
  if (up.includes('SEMANTIC_VIEW') && !up.includes("'")) return {
    bad: 'SEMANTIC_VIEW(sales_extended, ...)',
    good: "SEMANTIC_VIEW('sales_extended', ...)",
  };
  if ((s.match(/\(/g) ?? []).length !== (s.match(/\)/g) ?? []).length) return {
    bad: 'ROW_NUMBER() OVER (ORDER BY total DESC',
    good: 'ROW_NUMBER() OVER (ORDER BY total DESC)',
  };
  return {
    bad: s.split('\n')[0].slice(0, 60),
    good: "SELECT col FROM SEMANTIC_VIEW('model', DIMENSIONS ..., MEASURES ...)",
  };
}

function diagnoseSQL(sql: string): string {
  const s = sql.trim();
  const up = s.toUpperCase();
  if (!s) return 'Query is empty.';
  if (!up.includes('SELECT')) return 'Missing SELECT statement — query must start with SELECT.';
  if (!up.includes('FROM') && !up.includes('SEMANTIC_VIEW')) return 'Missing FROM clause or SEMANTIC_VIEW() source.';
  if (up.includes('SEMANTIC_VIEW') && !up.includes("'")) return "SEMANTIC_VIEW requires a quoted model name, e.g. SEMANTIC_VIEW('sales_extended', ...).";
  if ((s.match(/\(/g) ?? []).length !== (s.match(/\)/g) ?? []).length) return 'Unmatched parentheses — check opening and closing brackets.';
  if (up.includes('WHERE') && !up.includes('AND') && !up.includes('=') && !up.includes('>') && !up.includes('<')) return 'WHERE clause appears incomplete — no condition found.';
  if (up.includes('GROUP BY') && !up.includes('SELECT')) return 'GROUP BY requires a SELECT with matching columns.';
  return 'Query could not be validated — check syntax and try again.';
}
type AiDraftState = 'idle' | 'drafting' | 'done';

function SqlCurationPanel({
  questionClassification,
  sqlCurationValue,
  onSqlCurationChange,
  onSqlCurationSave,
  onBackToFork,
  allQuestions,
}: {
  questionClassification?: Classification;
  sqlCurationValue: string;
  onSqlCurationChange: (v: string) => void;
  onSqlCurationSave: () => void;
  onBackToFork: () => void;
  allQuestions: { id: string; text: string; sql: string }[];
}) {
  const [validateState, setValidateState] = useState<ValidateState>('idle');
  const [validateError, setValidateError] = useState('');
  const [copiedFrom, setCopiedFrom] = useState<{ id: string; text: string } | null>(null);
  const [preview, setPreview] = useState<{ id: string; text: string; sql: string } | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiDraftState, setAiDraftState] = useState<AiDraftState>('idle');
  const [highlightRange, setHighlightRange] = useState<{ start: number; end: number } | null>(null);

  const handleValidate = () => {
    setValidateState('validating');
    setValidateError('');
    setTimeout(() => {
      const up = sqlCurationValue.toUpperCase();
      const passes = up.includes('SELECT') && (up.includes('FROM') || up.includes('SEMANTIC_VIEW'));
      if (passes) {
        setValidateState('success');
      } else {
        setValidateError(diagnoseSQL(sqlCurationValue));
        setValidateState('error');
      }
    }, 1400);
  };

  const handleChange = (v: string) => {
    if (validateState !== 'idle') setValidateState('idle');
    if (highlightRange) setHighlightRange(null);
    onSqlCurationChange(v);
  };

  const handleInsertPreview = () => {
    if (!preview) return;
    if (validateState !== 'idle') setValidateState('idle');
    onSqlCurationChange(preview.sql);
    setCopiedFrom({ id: preview.id, text: preview.text });
    setPreview(null);
  };

  const handleAiApply = () => {
    if (!aiPrompt.trim()) return;
    setAiDraftState('drafting');
    setTimeout(() => {
      const inserted = `-- AI: "${aiPrompt.trim()}"\n`;
      const updated = inserted + sqlCurationValue;
      onSqlCurationChange(updated);
      setHighlightRange({ start: 0, end: inserted.length });
      if (validateState !== 'idle') setValidateState('idle');
      setAiDraftState('done');
    }, 1600);
  };

  return (
    <>
      <div className="inaccurate-status">
        {questionClassification === 'regression'
          ? <span className="badge-error">Regression</span>
          : <span className="badge-warning">Inaccurate</span>}
      </div>

      {/* AI prompt section */}
      <div className="ai-sql-prompt-section">
        <div className="ai-sql-prompt-header">
          <SparkleSingle size={13} />
          <span>Ask AI to edit the query</span>
        </div>
        <div className="ai-sql-prompt-input-row">
          <textarea
            className="ai-sql-prompt-textarea"
            placeholder="e.g. Filter by West region only, add a GROUP BY clause..."
            value={aiPrompt}
            rows={2}
            disabled={aiDraftState === 'drafting'}
            onChange={(e) => {
              setAiPrompt(e.target.value);
              if (aiDraftState === 'done') setAiDraftState('idle');
            }}
          />
        </div>
        <div className="ai-sql-prompt-footer">
          {aiDraftState === 'done' && (
            <span className="ai-sql-prompt-done">
              <Check size={12} /> Applied — review the query below
            </span>
          )}
          <button
            className="btn-pill-outline btn-with-icon ai-sql-apply-btn"
            disabled={!aiPrompt.trim() || aiDraftState === 'drafting'}
            onClick={handleAiApply}
          >
            {aiDraftState === 'drafting'
              ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Applying…</>
              : <><SparkleSingle size={13} /> Apply</>}
          </button>
        </div>
      </div>

      <div className="inaccurate-body">
        <p className="inaccurate-prompt">Edit the expected SQL query</p>

        <div className="sql-editor-wrap">
          {highlightRange && (
            <pre className="sql-editor-highlight-overlay" aria-hidden>
              <mark className="sql-highlight-mark">
                {sqlCurationValue.slice(highlightRange.start, highlightRange.end)}
              </mark>
              {sqlCurationValue.slice(highlightRange.end)}
            </pre>
          )}
          <textarea
            className={`sql-curation-editor${highlightRange ? ' has-highlight' : ''}`}
            value={sqlCurationValue}
            onChange={(e) => handleChange(e.target.value)}
            spellCheck={false}
          />
        </div>

        <div className="sql-curation-copy-row">
          <label className="sql-curation-copy-label">Copy query from:</label>
          <select
            className="sql-curation-select"
            value=""
            onChange={(e) => {
              const q = allQuestions.find((q) => q.id === e.target.value);
              if (q) setPreview(q);
            }}
          >
            <option value="" disabled>Select a question...</option>
            {allQuestions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.text.length > 60 ? q.text.slice(0, 57) + '...' : q.text}
              </option>
            ))}
          </select>
          {copiedFrom && !preview && (
            <div className="sql-copied-from-chip">
              <span className="sql-copied-from-icon"><Check size={11} /></span>
              <span className="sql-copied-from-text">
                Copied from: <strong>{copiedFrom.text.length > 44 ? copiedFrom.text.slice(0, 41) + '...' : copiedFrom.text}</strong>
              </span>
              <button className="sql-copied-from-clear" aria-label="Clear" onClick={() => setCopiedFrom(null)}>×</button>
            </div>
          )}
        </div>

        {preview ? (
          <div className="sql-inspect-panel">
            <div className="sql-inspect-header">
              <span className="sql-inspect-title">
                <Code size={13} />
                Inspecting: <em>{preview.text.length > 48 ? preview.text.slice(0, 45) + '...' : preview.text}</em>
              </span>
            </div>
            <pre className="sql-inspect-body">{preview.sql}</pre>
            <div className="sql-inspect-actions">
              <button className="btn-pill-outline" onClick={() => setPreview(null)}>Cancel</button>
              <button className="btn-pill-brand" onClick={handleInsertPreview}>Insert Query</button>
            </div>
          </div>
        ) : null}

        {validateState === 'validating' && (
          <div className="sql-validate-status sql-validate-validating">
            <div className="spinner sql-validate-spinner" />
            <span>Validating query...</span>
          </div>
        )}
        {validateState === 'success' && (
          <div className="sql-validate-status sql-validate-success">
            <Check size={14} />
            <span>Query is valid and returned results</span>
          </div>
        )}
        {validateState === 'error' && (
          <div className="sql-validate-error-block">
            <div className="sql-validate-error-title">
              <Warning size={13} />
              <span>Validation failed</span>
            </div>
            <p className="sql-validate-error-msg">{validateError}</p>
            <div className="sql-validate-error-example">
              <div className="sql-validate-error-example-row bad">
                <span className="sql-validate-example-badge bad">✕ Invalid</span>
                <code>{getErrorExample(sqlCurationValue).bad}</code>
              </div>
              <div className="sql-validate-error-example-row good">
                <span className="sql-validate-example-badge good">✓ Expected</span>
                <code>{getErrorExample(sqlCurationValue).good}</code>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="classification-actions">
        <button className="btn-pill-outline" onClick={onBackToFork}>Back</button>
        {!preview && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-pill-outline"
              disabled={sqlCurationValue.trim().length === 0 || validateState === 'validating'}
              onClick={handleValidate}
            >
              Validate
            </button>
            <button
              className="btn-pill-brand"
              disabled={sqlCurationValue.trim().length === 0 || validateState === 'validating'}
              onClick={onSqlCurationSave}
            >
              Save Query
            </button>
          </div>
        )}
      </div>
    </>
  );
}

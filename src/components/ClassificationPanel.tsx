import { useEffect, useRef, useState } from 'react';
import type { Classification } from '../data/questions';
import { Warning, Shield, Check, SparkleSingle, Sparkles, Code, ChevronRight } from './Icons';

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
  sqlEditActive?: boolean;
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
  fromTest: _fromTest,
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
  sqlEditActive = false,
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

      {mode === 'classify' && (
        <div className="classification-body">
          {sqlEditActive ? (
            <div className="sql-curation-guide">
              <p className="sql-curation-guide-section"><strong>Q&amp;A Preview</strong> shows the data table returned by the current query so you can validate the results at a glance.</p>
              <p className="sql-curation-guide-section"><strong>Query panel</strong> lets you fix the SQL in two ways:</p>
              <ul className="sql-curation-guide-list">
                <li><strong>Draft with AI</strong> — describe the change in plain language and let the AI rewrite the query for you.</li>
                <li><strong>Hands-on</strong> — edit the SQL directly in the editor, then click <em>Test Query</em> to validate syntax.</li>
              </ul>
              <p className="sql-curation-guide-section">Once the query looks correct, click <strong>Accurate</strong> below to approve it and move to the next question.</p>
            </div>
          ) : (
            <p className="classification-prompt">
              How would you classify the agent's response?
            </p>
          )}
          <div className="classification-cards equal-height">
            {!sqlEditActive && (
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
            )}

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
function transformSQL(sql: string, instruction: string): { sql: string; explanation: string } {
  const ins = instruction.toLowerCase().trim();
  let out = sql;
  let explanation = '';

  // ── LIMIT ──────────────────────────────────────────────────────────────
  const limitMatch = ins.match(/(?:limit|show|top|only|first)\s+(\d+)/);
  if (limitMatch) {
    const n = limitMatch[1];
    if (/^LIMIT\s+\d+/m.test(out)) {
      out = out.replace(/^(LIMIT\s+)\d+/m, `$1${n}`);
    } else {
      out = out.trimEnd() + `\nLIMIT ${n}`;
    }
    explanation = `Changed result limit to ${n} rows.`;
  }

  // ── FILTER by region ───────────────────────────────────────────────────
  const regionMatch = ins.match(/(?:filter|only|where|for)\s+(?:the\s+)?(\w+)\s+region/);
  if (regionMatch) {
    const region = regionMatch[1].charAt(0).toUpperCase() + regionMatch[1].slice(1);
    const condition = `Region.Name = '${region}'`;
    if (/WHERE/i.test(out)) {
      out = out.replace(/WHERE/i, `WHERE ${condition}\n  AND`);
    } else {
      out = out.replace(/ORDER BY/i, `WHERE ${condition}\nORDER BY`);
    }
    explanation = `Added filter for ${region} region.`;
  }

  // ── GROUP BY ───────────────────────────────────────────────────────────
  const groupMatch = ins.match(/group\s+by\s+([\w_]+(?:\s*,\s*[\w_]+)*)/);
  if (groupMatch) {
    const col = groupMatch[1].trim();
    if (/GROUP BY/i.test(out)) {
      out = out.replace(/GROUP BY\s+[\w_.]+/i, `GROUP BY ${col}`);
    } else {
      out = out.replace(/ORDER BY/i, `GROUP BY ${col}\nORDER BY`);
    }
    explanation = `Added GROUP BY ${col}.`;
  }

  // ── ORDER / SORT ───────────────────────────────────────────────────────
  const orderAscMatch = ins.match(/sort|order\s+by\s+([\w_]+)\s*(ascending|asc)?/);
  const orderDescMatch = ins.match(/sort|order\s+by\s+([\w_]+)\s*(descending|desc)/);
  if (orderDescMatch) {
    const col = orderDescMatch[1];
    out = out.replace(/ORDER BY[\s\S]*?((?:\n[A-Z]|\n\n|$))/, `ORDER BY ${col} DESC$1`);
    explanation = `Changed sort to ${col} descending.`;
  } else if (orderAscMatch && orderAscMatch[1]) {
    const col = orderAscMatch[1];
    out = out.replace(/ORDER BY[\s\S]*?((?:\n[A-Z]|\n\n|$))/, `ORDER BY ${col} ASC$1`);
    explanation = `Changed sort to ${col} ascending.`;
  }

  // ── REMOVE a column ────────────────────────────────────────────────────
  const removeColMatch = ins.match(/remove\s+(?:the\s+)?(\w+)\s+(?:column|field)?/);
  if (removeColMatch) {
    const col = removeColMatch[1];
    const re = new RegExp(`[,\\s]*\\b${col}\\b[^,\\n]*(?:,|(?=\\n))`, 'i');
    out = out.replace(re, '');
    explanation = `Removed ${col} from the query.`;
  }

  // ── ADD column ─────────────────────────────────────────────────────────
  const addColMatch = ins.match(/add\s+(?:the\s+)?(\w+(?:\.\w+)?)\s+(?:column|field)?/);
  if (addColMatch) {
    const col = addColMatch[1];
    out = out.replace(/^(SELECT\s+)/im, `$1${col},\n  `);
    explanation = `Added ${col} to SELECT.`;
  }

  // ── DATE RANGE ─────────────────────────────────────────────────────────
  if (/last\s+(month|quarter|year|week)/i.test(ins)) {
    const period = ins.match(/last\s+(month|quarter|year|week)/i)![1].toUpperCase();
    const trunc = period === 'WEEK' ? 'week' : period === 'MONTH' ? 'month' : period === 'YEAR' ? 'year' : 'quarter';
    const dateFilter = `close_date >= DATE_TRUNC('${trunc}', CURRENT_DATE) - INTERVAL '1 ${trunc}'`;
    if (/WHERE/i.test(out)) {
      out = out.replace(/WHERE/i, `WHERE ${dateFilter}\n  AND`);
    } else {
      out = out.replace(/ORDER BY/i, `WHERE ${dateFilter}\nORDER BY`);
    }
    explanation = `Added date filter for last ${trunc}.`;
  }

  // ── fallback: no rule matched ──────────────────────────────────────────
  if (!explanation) {
    explanation = `No matching transformation found for: "${instruction}". Try phrases like "limit 10", "filter by West region", "group by product_name", "sort by amount descending".`;
  }

  return { sql: out, explanation };
}

type AiDraftState = 'idle' | 'drafting' | 'done';

function SqlCurationPanel({
  questionClassification,
  sqlCurationValue,
  onSqlCurationChange,
  onSqlCurationSave,
  onBackToFork,
}: {
  questionClassification?: Classification;
  sqlCurationValue: string;
  onSqlCurationChange: (v: string) => void;
  onSqlCurationSave: () => void;
  onBackToFork: () => void;
}) {
  const [validateState, setValidateState] = useState<ValidateState>('idle');
  const [validateError, setValidateError] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiDraftState, setAiDraftState] = useState<AiDraftState>('idle');
  const [aiExplanation, setAiExplanation] = useState('');
  const [highlightRange, setHighlightRange] = useState<{ start: number; end: number } | null>(null);
  const [sqlBeforeAi, setSqlBeforeAi] = useState<string | null>(null);

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
    if (sqlBeforeAi) setSqlBeforeAi(null);
    onSqlCurationChange(v);
  };

  const handleAiRevert = () => {
    if (!sqlBeforeAi) return;
    onSqlCurationChange(sqlBeforeAi);
    setSqlBeforeAi(null);
    setAiDraftState('idle');
    setAiExplanation('');
    setHighlightRange(null);
    if (validateState !== 'idle') setValidateState('idle');
  };

  const handleAiApply = () => {
    if (!aiPrompt.trim()) return;
    setSqlBeforeAi(sqlCurationValue);
    setAiDraftState('drafting');
    setAiExplanation('');
    setTimeout(() => {
      const { sql: updated, explanation } = transformSQL(sqlCurationValue, aiPrompt.trim());
      const addedChars = updated.length - sqlCurationValue.length;
      onSqlCurationChange(updated);
      if (addedChars > 0) setHighlightRange({ start: 0, end: addedChars });
      else setHighlightRange(null);
      setAiExplanation(explanation);
      if (validateState !== 'idle') setValidateState('idle');
      setAiDraftState('done');
    }, 1200);
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
            placeholder="e.g. Show only West region, limit to 10 rows, sort by amount descending, add product_name column..."
            value={aiPrompt}
            rows={2}
            disabled={aiDraftState === 'drafting'}
            onChange={(e) => {
              setAiPrompt(e.target.value);
              if (aiDraftState === 'done') { setAiDraftState('idle'); setAiExplanation(''); }
            }}
          />
        </div>
        <div className="ai-sql-prompt-footer">
          {aiDraftState === 'done' && aiExplanation && (
            <span className={`ai-sql-prompt-done ${aiExplanation.startsWith('No matching') ? 'warn' : ''}`}>
              {aiExplanation.startsWith('No matching')
                ? <><Warning size={12} /> {aiExplanation}</>
                : <><Check size={12} /> {aiExplanation}</>}
            </span>
          )}
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            {sqlBeforeAi && (
              <button
                className="btn-pill-outline ai-sql-apply-btn"
                onClick={handleAiRevert}
              >
                Revert
              </button>
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
      </div>
    </>
  );
}

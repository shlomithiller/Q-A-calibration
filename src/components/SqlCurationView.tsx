import { useState, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Undo, Redo, SparkleSingle, Shield, Check, Warning } from './Icons';
import { ChartPreview } from './ChartPreview';
import type { Question } from '../data/questions';

// ─── Syntax highlighter ──────────────────────────────────────────────────────
const KEYWORDS = new Set(['WITH','AS','SELECT','FROM','WHERE','ORDER','BY','GROUP','OVER','DESC','ASC','NULLS','LAST','FIRST','CASE','WHEN','THEN','ELSE','END','AND','OR','NOT','IN','IS','NULL','BETWEEN','INTERVAL','HAVING','JOIN','INNER','LEFT','RIGHT','OUTER','ON','INTO','UNION','ALL','DISTINCT','LIMIT','OFFSET']);
const FUNCTIONS = new Set(['ROW_NUMBER','SUM','AVG','COUNT','MIN','MAX','SEMANTIC_VIEW','DIMENSIONS','MEASURES','DATE_TRUNC','CURRENT_DATE']);

function highlightLine(line: string): React.ReactNode {
  if (line.trimStart().startsWith('--')) {
    return <span className="scv-tok-comment">{line}</span>;
  }
  const tokens = line.split(/(\s+|[(),;])/);
  return tokens.map((t, i) => {
    if (!t) return null;
    if (KEYWORDS.has(t.toUpperCase())) return <span key={i} className="scv-tok-kw">{t}</span>;
    if (FUNCTIONS.has(t.toUpperCase())) return <span key={i} className="scv-tok-fn">{t}</span>;
    if (/^'.*'$/.test(t) || /^".*"$/.test(t)) return <span key={i} className="scv-tok-str">{t}</span>;
    if (/^\d+$/.test(t)) return <span key={i} className="scv-tok-num">{t}</span>;
    if (/^[(),;]$/.test(t)) return <span key={i} className="scv-tok-punct">{t}</span>;
    return <span key={i}>{t}</span>;
  });
}

// ─── Mock data generator ─────────────────────────────────────────────────────
interface PreviewRow { [col: string]: string | number }

function generatePreviewData(question: Question): { columns: string[]; rows: PreviewRow[] } {
  const { chartData, chartXAxisLabel, chartYAxisLabel } = question.response;
  const xCol = chartXAxisLabel || 'Category';
  const yCol = chartYAxisLabel || 'Value';

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const isMonthly = chartData.some(d => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].includes(d.label));

  const rows: PreviewRow[] = (isMonthly ? monthNames : chartData.map(d => d.label)).map((label, i) => {
    const base = isMonthly
      ? (chartData.find(d => label.startsWith(d.label)) ?? chartData[i % chartData.length])
      : chartData[i];
    const value = base?.value ?? 0;
    return {
      [xCol]: label,
      [yCol]: Math.round(value * (80 + ((i * 37) % 40))),
      'Record Count': Math.round(value * 1.4 + i * 12),
    };
  });

  return { columns: [xCol, yCol, 'Record Count'], rows };
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SqlCurationViewProps {
  question: Question;
  sqlValue: string;
  onSqlChange: (v: string) => void;
  onSave: () => void;
  onBack: () => void;
  hasVQ?: boolean;
}

export function SqlCurationView({ question, sqlValue, onSqlChange, onSave, onBack, hasVQ = false }: SqlCurationViewProps) {
  const [originalSql] = useState(sqlValue);
  const [sqlBeforeAi, setSqlBeforeAi] = useState<string | null>(null);
  const [highlightLines, setHighlightLines] = useState<number[]>([]);
  const [pendingChanges, setPendingChanges] = useState<{ before: string; after: string }[]>([]);
  const [currentChange, setCurrentChange] = useState(0);

  // Undo/redo history
  const historyRef = useRef<string[]>([sqlValue]);
  const [histIdx, setHistIdx] = useState(0);

  const pushHistory = (newSql: string) => {
    const stack = historyRef.current.slice(0, histIdx + 1);
    stack.push(newSql);
    historyRef.current = stack;
    setHistIdx(stack.length - 1);
    onSqlChange(newSql);
  };

  const handleUndo = () => {
    if (histIdx <= 0) return;
    const newIdx = histIdx - 1;
    setHistIdx(newIdx);
    onSqlChange(historyRef.current[newIdx]);
    if (highlightLines.length) setHighlightLines([]);
  };

  const handleRedo = () => {
    if (histIdx >= historyRef.current.length - 1) return;
    const newIdx = histIdx + 1;
    setHistIdx(newIdx);
    onSqlChange(historyRef.current[newIdx]);
    if (highlightLines.length) setHighlightLines([]);
  };

  // Draft with Einstein
  const [draftExpanded, setDraftExpanded] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftState, setDraftState] = useState<'idle' | 'drafting'>('idle');

  // Validate state
  const [validateState, setValidateState] = useState<'idle' | 'validating' | 'pass' | 'fail'>('idle');

  const handleValidate = () => {
    setValidateState('validating');
    setTimeout(() => {
      const upper = sqlValue.toUpperCase();
      const hasSelect = upper.includes('SELECT');
      const hasFrom = upper.includes('FROM') || upper.includes('SEMANTIC_VIEW');
      const balanced = (sqlValue.match(/\(/g) || []).length === (sqlValue.match(/\)/g) || []).length;
      setValidateState(hasSelect && hasFrom && balanced ? 'pass' : 'fail');
    }, 1000);
  };

  // Preview state
  const [previewState, setPreviewState] = useState<'idle' | 'running' | 'done'>('idle');
  const [previewData, setPreviewData] = useState<{ columns: string[]; rows: PreviewRow[] } | null>(null);
  const [lastRunTime, setLastRunTime] = useState<string>('');
  const [lastRunSql, setLastRunSql] = useState<string>('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Accept: keep current SQL as the new baseline, dismiss toolbar
  const handleAcceptChanges = () => {
    setSqlBeforeAi(null);
    setHighlightLines([]);
    setPendingChanges([]);
    setCurrentChange(0);
  };

  // Decline: revert to what it was before Einstein touched it, dismiss toolbar
  const handleDeclineChanges = () => {
    if (sqlBeforeAi !== null) {
      onSqlChange(sqlBeforeAi);
      setLastRunSql(sqlBeforeAi);
    }
    setSqlBeforeAi(null);
    setHighlightLines([]);
    setPendingChanges([]);
    setCurrentChange(0);
  };

  const runTestQuery = (sql: string) => {
    setPreviewState('running');
    setTimeout(() => {
      const data = generatePreviewData(question);
      setPreviewData(data);
      setLastRunSql(sql);
      const now = new Date();
      setLastRunTime(
        now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) +
        ', ' +
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      );
      setPreviewState('done');
    }, 1200);
  };

  const handleTestQuery = () => runTestQuery(sqlValue);

  const handleDraftWithEinstein = () => {
    const prompt = draftText.trim();
    if (!prompt) return;
    setDraftState('drafting');

    setTimeout(() => {
      const lower = prompt.toLowerCase();
      let newSql = sqlValue;

      if (lower.includes('region') || lower.includes('calculated field')) {
        newSql = sqlValue.replace(
          /^(SELECT\s*\n)/im,
          `$1  region,\n`,
        );
        if (!newSql.includes('GROUP BY')) {
          newSql = newSql.replace(/ORDER BY/i, 'GROUP BY\n  region\nORDER BY');
        }
      } else if (lower.includes('month') || lower.includes('by month')) {
        newSql = sqlValue.replace(
          /^(SELECT\s*\n)/im,
          `$1  DATE_TRUNC('month', close_date) AS month,\n`,
        );
        if (!newSql.includes('GROUP BY')) {
          newSql = newSql.replace(/ORDER BY/i, 'GROUP BY\n  month\nORDER BY');
        }
      } else if (lower.includes('limit') || lower.includes('top')) {
        const n = prompt.match(/\b(\d+)\b/)?.[1] ?? '10';
        newSql = sqlValue.includes('LIMIT')
          ? sqlValue.replace(/LIMIT\s+\d+/i, `LIMIT ${n}`)
          : sqlValue.replace(/;?\s*$/, `\nLIMIT ${n};`);
      } else if (lower.includes('count') || lower.includes('total')) {
        newSql = sqlValue.replace(/^(SELECT\s*\n)/im, `$1  COUNT(*) AS total_count,\n`);
      } else if (lower.includes('won') || lower.includes('closed won')) {
        if (!sqlValue.toUpperCase().includes("LOWER(OPPORTUNITY.WON)")) {
          newSql = sqlValue.replace(/WHERE\s+/i, `WHERE\n    LOWER(Opportunity.Won) = 'true'\n    AND `);
        }
      } else {
        // Generic: add a comment describing what was requested
        newSql = `-- Einstein: ${prompt}\n` + sqlValue;
      }

      setSqlBeforeAi(sqlValue);
      pushHistory(newSql);
      setDraftText('');
      setDraftState('idle');

      // Auto-fire Test Query with the new SQL
      runTestQuery(newSql);
    }, 1600);
  };

  const isValidated = validateState === 'pass';
  const [verified, setVerified] = useState(false);
  const [requiresReview] = useState(true);
  const [vqOverridden, setVqOverridden] = useState(false);
  const [answerPreviewExpanded, setAnswerPreviewExpanded] = useState(false);
  const hasEinsteinChanges = sqlBeforeAi !== null;
  const vqBlocked = hasVQ && !vqOverridden;
  const previewStale = previewState === 'done' && sqlValue !== lastRunSql;
  const lines = sqlValue.split('\n');
  const totalFields = previewData ? previewData.columns.length + 23 : 0;
  const totalRows = previewData ? previewData.rows.length * 224 + 43 : 0;

  return (
    <div className="scv-root">

      {/* ── Page header: breadcrumb + h1 + top actions ── */}
      <div className="scv-page-header">
        <div className="scv-breadcrumb">
          <span className="scv-breadcrumb-link" onClick={onBack}>Q&amp;A Calibration Questions</span>
          <span className="scv-breadcrumb-sep">›</span>
        </div>
        <div className="scv-page-title-row">
          <div className="scv-page-title-left">
            <button className="scv-back" onClick={onBack} aria-label="Back">
              <ArrowLeft size={18} />
            </button>
            <h1 className="scv-page-title">{question.text}</h1>
            <span className="scv-source-badge">Manual</span>
          </div>
          <div className="scv-page-header-actions">
            <button className="scv-btn-outline" onClick={onBack}>Discard</button>
            <button
              className="scv-btn-brand"
              disabled={!isValidated || vqBlocked}
              title={vqBlocked ? 'Override the existing VQ before saving' : !isValidated ? 'Validate the query before saving' : undefined}
              onClick={onSave}
            >
              Re-run Answer
            </button>
          </div>
        </div>
      </div>

      {/* ── Main scroll area ── */}
      <div className="scv-scroll-area">

        {/* ── VQ conflict error banner ── */}
        {vqBlocked && (
          <div className="scv-vq-error-banner">
            <Warning size={15} />
            <span>A Verified Question already exists for this utterance. Override the VQ to curate a new answer.</span>
            <button className="scv-vq-override-btn" onClick={() => setVqOverridden(true)}>
              Override VQ
            </button>
          </div>
        )}

        {/* ── Draft with Einstein collapsible ── */}
        <div className="scv-draft-card">
          <button
            className="scv-draft-toggle"
            onClick={() => setDraftExpanded(v => !v)}
            aria-expanded={draftExpanded}
          >
            <span className="scv-draft-toggle-icon">{draftExpanded ? '▾' : '▸'}</span>
            <span className="scv-draft-toggle-label">Draft with Einstein</span>
          </button>

          {draftExpanded && (
            <div className="scv-draft-body">
              <textarea
                className="scv-draft-textarea"
                placeholder="Example: Create a Calculated Field that shows sales per Region."
                value={draftText}
                onChange={e => setDraftText(e.target.value)}
                rows={3}
              />
              <div className="scv-draft-actions">
                <button
                  className="scv-draft-clear"
                  onClick={() => setDraftText('')}
                  disabled={!draftText || draftState === 'drafting'}
                >
                  Clear
                </button>
                <button
                  className={`scv-draft-submit${draftState === 'drafting' ? ' scv-draft-submit-loading' : ''}`}
                  disabled={!draftText.trim() || draftState === 'drafting'}
                  onClick={handleDraftWithEinstein}
                >
                  <SparkleSingle size={14} />
                  {draftState === 'drafting' ? 'Drafting…' : 'Draft with Einstein'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Workbench + Preview card ── */}
        <div className="scv-workbench-card">

          {/* ── Workbench header row ── */}
          <div className="scv-workbench-header">
            <div className="scv-workbench-left">
              <span className="scv-workbench-title">Workbench</span>
              <div className="scv-workbench-header-actions">
                <button className="scv-icon-btn-circle" aria-label="Undo" title="Undo" disabled={histIdx <= 0} onClick={handleUndo}>
                  <Undo size={13} />
                </button>
                <button className="scv-icon-btn-circle" aria-label="Redo" title="Redo" disabled={histIdx >= historyRef.current.length - 1} onClick={handleRedo}>
                  <Redo size={13} />
                </button>
                <button
                  className={`scv-validate-btn${validateState === 'pass' ? ' scv-validate-pass' : validateState === 'fail' ? ' scv-validate-fail' : ''}`}
                  disabled={!sqlValue.trim() || validateState === 'validating'}
                  onClick={handleValidate}
                >
                  {validateState === 'validating' ? (
                    <><div className="spinner" style={{ width: 11, height: 11, borderWidth: 2 }} /> Validating…</>
                  ) : validateState === 'pass' ? (
                    <><Check size={12} /> Valid</>
                  ) : validateState === 'fail' ? (
                    <><Warning size={12} /> Invalid</>
                  ) : (
                    <><Shield size={12} /> Validate</>
                  )}
                </button>
                <button
                  className={`scv-test-query-btn${previewState === 'running' ? ' scv-test-query-running' : ''}`}
                  disabled={!sqlValue.trim() || previewState === 'running'}
                  onClick={handleTestQuery}
                >
                  <Play size={11} />
                  {previewState === 'running' ? 'Running…' : 'Test Query'}
                </button>
              </div>
            </div>

            {/* Preview header — right half of the same row */}
            <div className="scv-preview-header">
              <span className="scv-preview-title">Preview</span>
              {previewState === 'done' && (
                <span className="scv-preview-meta">Last run on {lastRunTime}</span>
              )}
              {previewStale && (
                <span className="scv-preview-stale">Query changed — test query to update</span>
              )}
              {previewState === 'done' && !previewStale && (
                <span className="scv-preview-counts">{totalFields} fields {totalRows.toLocaleString()} rows</span>
              )}
            </div>
          </div>

          {/* ── Split body ── */}
          <div className="scv-body">

            {/* Editor */}
            <div className="scv-editor-pane">
              <div className="scv-editor-wrap" style={{ position: 'relative' }}>
                <div className="scv-line-numbers" aria-hidden>
                  {lines.map((_, i) => (
                    <div key={i} className={highlightLines.includes(i + 1) ? 'scv-ln-highlighted' : ''}>
                      {i + 1}
                    </div>
                  ))}
                </div>
                <div className="scv-code-overlay" aria-hidden>
                  {lines.map((line, i) => (
                    <div key={i} className={`scv-code-line${highlightLines.includes(i + 1) ? ' scv-line-highlighted' : ''}`}>
                      {highlightLine(line) || ' '}
                    </div>
                  ))}
                </div>
                <textarea
                  ref={textareaRef}
                  className="scv-textarea"
                  value={sqlValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    onSqlChange(val);
                    if (highlightLines.length) setHighlightLines([]);
                    if (validateState !== 'idle') setValidateState('idle');
                    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
                    historyTimerRef.current = setTimeout(() => pushHistory(val), 500);
                  }}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>

              {/* Review toolbar — shown only while Einstein changes are pending review */}
              {hasEinsteinChanges && (
                <div className="scv-review-toolbar-row">
                  <div className="scv-review-toolbar">
                    <div className="scv-review-buttons">
                      <button className="scv-review-btn scv-review-decline" onClick={handleDeclineChanges}>
                        Decline Changes
                      </button>
                      <button className="scv-review-btn scv-review-accept" onClick={handleAcceptChanges}>
                        Accept Changes
                      </button>
                    </div>
                    <div className="scv-review-pages">
                      <button className="scv-review-nav" aria-label="Previous" disabled={currentChange === 0} onClick={() => setCurrentChange(c => Math.max(0, c - 1))}>
                        <ChevronLeft size={14} />
                      </button>
                      <span className="scv-review-counter">{currentChange + 1} of {Math.max(1, pendingChanges.length)}</span>
                      <button className="scv-review-nav" aria-label="Next" disabled={currentChange >= pendingChanges.length - 1} onClick={() => setCurrentChange(c => Math.min(pendingChanges.length - 1, c + 1))}>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Preview pane */}
            <div className="scv-preview-pane">
              {previewState === 'idle' && (
                <div className="scv-preview-empty">
                  <div className="scv-preview-empty-icon">
                    <Play size={22} />
                  </div>
                  <p className="scv-preview-empty-text">Click <strong>Test Query</strong> to preview results</p>
                </div>
              )}

              {previewState === 'running' && (
                <div className="scv-preview-empty">
                  <div className="scv-preview-spinner" />
                  <p className="scv-preview-empty-text">Running query…</p>
                </div>
              )}

              {previewState === 'done' && previewData && (
                <div className="scv-preview-table-wrap">
                  <table className="scv-preview-table">
                    <thead>
                      <tr>
                        {previewData.columns.map((col, ci) => (
                          <th key={col}>
                            <div className="scv-preview-th-inner">
                              <span className="scv-preview-th-group">
                                {ci === 0 ? 'Date' : ci === 1 ? question.response.chartYAxisLabel : 'Metrics'}
                              </span>
                              <span className="scv-preview-th-name">{col}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.map((row, i) => (
                        <tr key={i}>
                          {previewData.columns.map((col) => (
                            <td key={col}>
                              {typeof row[col] === 'number' ? (row[col] as number).toLocaleString() : row[col]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>{/* end scv-body */}
        </div>{/* end scv-workbench-card */}

        {/* ── Answer Preview card ── */}
        {previewState === 'done' && (
          <div className="scv-answer-preview-card">
            <button
              className="scv-draft-toggle"
              onClick={() => setAnswerPreviewExpanded(v => !v)}
              aria-expanded={answerPreviewExpanded}
            >
              <span className="scv-draft-toggle-icon">{answerPreviewExpanded ? '▾' : '▸'}</span>
              <span className="scv-draft-toggle-label">Answer Preview</span>
              <span className="scv-answer-preview-hint">Full agent response for "{question.text}"</span>
            </button>

            {answerPreviewExpanded && (
              <div className="scv-answer-preview-body">
                <div className="scv-answer-preview-agent">
                  <img className="avatar" src="/avatars/header-avatar.svg" alt="Agent" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                  <div className="scv-answer-preview-bubble">
                    <p className="scv-answer-preview-summary">{question.response.summary}</p>
                    <div className="scv-answer-preview-chart">
                      <ChartPreview
                        data={question.response.chartData}
                        yAxisLabel={question.response.chartYAxisLabel}
                        xAxisLabel={question.response.chartXAxisLabel}
                      />
                    </div>
                    <p className="scv-answer-preview-followup">{question.response.followUp}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>{/* end scv-scroll-area */}
    </div>
  );
}

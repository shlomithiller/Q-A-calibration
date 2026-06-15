import { useState, useRef } from 'react';
import { ArrowLeft, Check, Warning, ThumbsUp, ThumbsDown, SparkleSingle, ChevronLeft, ChevronRight } from './Icons';
import type { Classification, Question } from '../data/questions';

// ─── SQL transformation engine ────────────────────────────────────────────────
function transformSQL(sql: string, instruction: string): { sql: string; explanation: string } {
  const ins = instruction.toLowerCase().trim();
  let out = sql;
  let explanation = '';

  const limitMatch = ins.match(/(?:limit|show|top|only|first)\s+(\d+)/);
  if (limitMatch) {
    const n = limitMatch[1];
    if (/^LIMIT\s+\d+/m.test(out)) out = out.replace(/^(LIMIT\s+)\d+/m, `$1${n}`);
    else out = out.trimEnd() + `\nLIMIT ${n}`;
    explanation = `Changed result limit to ${n} rows.`;
  }

  const regionMatch = ins.match(/(?:filter|only|where|for)\s+(?:the\s+)?(\w+)\s+region/);
  if (regionMatch) {
    const region = regionMatch[1].charAt(0).toUpperCase() + regionMatch[1].slice(1);
    const condition = `Region.Name = '${region}'`;
    if (/WHERE/i.test(out)) out = out.replace(/WHERE/i, `WHERE ${condition}\n  AND`);
    else out = out.replace(/ORDER BY/i, `WHERE ${condition}\nORDER BY`);
    explanation = `Added filter for ${region} region.`;
  }

  const groupMatch = ins.match(/group\s+by\s+([\w_]+(?:\s*,\s*[\w_]+)*)/);
  if (groupMatch) {
    const col = groupMatch[1].trim();
    if (/GROUP BY/i.test(out)) out = out.replace(/GROUP BY\s+[\w_.]+/i, `GROUP BY ${col}`);
    else out = out.replace(/ORDER BY/i, `GROUP BY ${col}\nORDER BY`);
    explanation = `Added GROUP BY ${col}.`;
  }

  const orderDescMatch = ins.match(/(?:sort|order)\s+by\s+([\w_]+)\s*(descending|desc)/);
  const orderAscMatch = ins.match(/(?:sort|order)\s+by\s+([\w_]+)/);
  if (orderDescMatch) {
    const col = orderDescMatch[1];
    out = out.replace(/ORDER BY[\s\S]*?((?:\n[A-Z]|\n\n|$))/, `ORDER BY ${col} DESC$1`);
    explanation = `Changed sort to ${col} descending.`;
  } else if (orderAscMatch && orderAscMatch[1] && !explanation) {
    const col = orderAscMatch[1];
    out = out.replace(/ORDER BY[\s\S]*?((?:\n[A-Z]|\n\n|$))/, `ORDER BY ${col} ASC$1`);
    explanation = `Changed sort to ${col} ascending.`;
  }

  const removeColMatch = ins.match(/remove\s+(?:the\s+)?(\w+)\s+(?:column|field)?/);
  if (removeColMatch) {
    const col = removeColMatch[1];
    const re = new RegExp(`[,\\s]*\\b${col}\\b[^,\\n]*(?:,|(?=\\n))`, 'i');
    out = out.replace(re, '');
    explanation = `Removed ${col} from the query.`;
  }

  const addColMatch = ins.match(/add\s+(?:the\s+)?(\w+(?:\.\w+)?)\s+(?:column|field)?/);
  if (addColMatch) {
    const col = addColMatch[1];
    out = out.replace(/^(SELECT\s+)/im, `$1${col},\n  `);
    explanation = `Added ${col} to SELECT.`;
  }

  if (/last\s+(month|quarter|year|week)/i.test(ins)) {
    const period = ins.match(/last\s+(month|quarter|year|week)/i)![1];
    const trunc = period.toLowerCase();
    const dateFilter = `close_date >= DATE_TRUNC('${trunc}', CURRENT_DATE) - INTERVAL '1 ${trunc}'`;
    if (/WHERE/i.test(out)) out = out.replace(/WHERE/i, `WHERE ${dateFilter}\n  AND`);
    else out = out.replace(/ORDER BY/i, `WHERE ${dateFilter}\nORDER BY`);
    explanation = `Added date filter for last ${trunc}.`;
  }

  if (!explanation) {
    explanation = `No match for: "${instruction}". Try: "limit 10", "filter by West region", "sort by amount descending", "add revenue column".`;
  }

  return { sql: out, explanation };
}

// ─── Syntax highlighter ───────────────────────────────────────────────────────
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

// ─── Props ────────────────────────────────────────────────────────────────────
interface SqlCurationViewProps {
  question: Question;
  sqlValue: string;
  onSqlChange: (v: string) => void;
  onSave: () => void;
  onBack: () => void;
}

export function SqlCurationView({
  question,
  sqlValue,
  onSqlChange,
  onSave,
  onBack,
}: SqlCurationViewProps) {
  const [originalSql] = useState(sqlValue);
  const [sqlBeforeAi, setSqlBeforeAi] = useState<string | null>(null);
  const [highlightLines, setHighlightLines] = useState<number[]>([]);
  const [pendingChanges, setPendingChanges] = useState<{ before: string; after: string }[]>([]);
  const [currentChange, setCurrentChange] = useState(0);
  const [validateState, setValidateState] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = (userText: string) => {
    if (!userText.trim()) return;
    const beforeSql = sqlValue;
    setSqlBeforeAi(beforeSql);

    setTimeout(() => {
      const { sql: updated } = transformSQL(sqlValue, userText);
      const oldLines = beforeSql.split('\n');
      const newLines = updated.split('\n');
      const changed: number[] = [];
      newLines.forEach((line, i) => {
        if (line !== oldLines[i]) changed.push(i + 1);
      });
      setHighlightLines(changed);
      onSqlChange(updated);
      setPendingChanges([{ before: beforeSql, after: updated }]);
      setCurrentChange(0);
      if (validateState !== 'idle') setValidateState('idle');
    }, 1200);
  };

  const handleAcceptChanges = () => {
    setPendingChanges([]);
    setHighlightLines([]);
    setSqlBeforeAi(null);
  };

  const handleDeclineChanges = () => {
    if (sqlBeforeAi) onSqlChange(sqlBeforeAi);
    setPendingChanges([]);
    setHighlightLines([]);
    setSqlBeforeAi(null);
  };

  const handleRevert = () => {
    if (!sqlBeforeAi) return;
    onSqlChange(sqlBeforeAi);
    setSqlBeforeAi(null);
    setHighlightLines([]);
    setPendingChanges([]);
    setValidateState('idle');
  };

  const handleValidate = () => {
    setValidateState('validating');
    setTimeout(() => {
      const up = sqlValue.toUpperCase();
      const passes = up.includes('SELECT') && (up.includes('FROM') || up.includes('SEMANTIC_VIEW'));
      setValidateState(passes ? 'success' : 'error');
    }, 1400);
  };

  const lines = sqlValue.split('\n');

  return (
    <div className="scv-root">
      {/* ── Header ── */}
      <div className="scv-header">
        <div className="scv-breadcrumb">
          <span className="scv-breadcrumb-link" onClick={onBack}>Q&A Calibration</span>
          <span className="scv-breadcrumb-sep">›</span>
        </div>
        <div className="scv-topbar">
          <button className="scv-back" onClick={onBack} aria-label="Back">
            <ArrowLeft size={15} />
          </button>
          <div className="scv-topbar-title-group">
            <span className="scv-topbar-question">{question.text}</span>
            {question.classification === 'regression'
              ? <span className="badge-error">Regression</span>
              : <span className="badge-warning scv-badge-inaccurate"><Warning size={12} /> Inaccurate</span>}
          </div>
          <div className="scv-topbar-actions">
            <button
              className="scv-btn-outline"
              disabled={!sqlValue.trim() || validateState === 'validating'}
              onClick={handleValidate}
            >
              {validateState === 'validating' ? 'Validating…' : 'Validate'}
            </button>
            <button
              className="scv-btn-brand"
              disabled={!sqlValue.trim()}
              onClick={onSave}
            >
              Save Query
            </button>
          </div>
        </div>
        <div className="scv-meta-row">
          <span className="scv-meta-item">
            <span className="scv-meta-label">Classified by</span>
            <span className="scv-meta-value">Samantha Adams</span>
          </span>
          <span className="scv-meta-item">
            <span className="scv-meta-label">Classified at</span>
            <span className="scv-meta-value">{question.lastModified}</span>
          </span>
          <span className="scv-meta-item">
            <span className="scv-meta-label">Source</span>
            <span className="scv-meta-value">{question.source}</span>
          </span>
          <span className="scv-meta-item">
            <span className="scv-meta-label">Rating</span>
            <span className="scv-meta-value scv-meta-rating">
              <ThumbsUp size={13} /> {question.thumbsUp}
              <ThumbsDown size={13} /> {question.thumbsDown}
            </span>
          </span>
          <span className="scv-meta-item">
            <span className="scv-meta-label">Model</span>
            <span className="scv-meta-value">{question.semanticModel} Model</span>
          </span>
        </div>
      </div>

      {/* ── Validate status bar ── */}
      {validateState === 'success' && (
        <div className="scv-status-bar scv-status-success">
          <Check size={13} /> Query is valid and returned results
        </div>
      )}
      {validateState === 'error' && (
        <div className="scv-status-bar scv-status-error">
          <Warning size={13} /> Query validation failed — check for missing SELECT or FROM clause
        </div>
      )}

      {/* ── Main body ── */}
      <div className="scv-body">
        {/* ── Editor ── */}
        <div className="scv-editor-pane">
          <div className="scv-editor-header">
            <span className="scv-editor-tab active">Query</span>
          </div>
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
                  {highlightLine(line) || ' '}
                </div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              className="scv-textarea"
              value={sqlValue}
              onChange={(e) => {
                onSqlChange(e.target.value);
                if (highlightLines.length) setHighlightLines([]);
                if (validateState !== 'idle') setValidateState('idle');
              }}
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          {/* ── Review toolbar ── */}
          {sqlValue !== originalSql && (
            <div className="scv-review-toolbar-row">
              <div className="scv-review-toolbar">
                <div className="scv-review-buttons">
                  <button className="scv-review-btn scv-review-reset" onClick={() => {
                    onSqlChange(originalSql);
                    setSqlBeforeAi(null);
                    setHighlightLines([]);
                    setPendingChanges([]);
                    setValidateState('idle');
                  }}>
                    Reset
                  </button>
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

      </div>
    </div>
  );
}

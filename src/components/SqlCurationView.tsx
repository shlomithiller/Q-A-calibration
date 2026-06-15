import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Check, Warning, SparkleSingle, AgentAstro, ChevronLeft, ChevronRight } from './Icons';
import type { Classification } from '../data/questions';

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

// ─── Chat message type ────────────────────────────────────────────────────────
interface ChatMessage {
  id: number;
  role: 'user' | 'agent';
  text: string;
  isThinking?: boolean;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SqlCurationViewProps {
  questionClassification?: Classification;
  questionText: string;
  sqlValue: string;
  onSqlChange: (v: string) => void;
  onSave: () => void;
  onBack: () => void;
}

export function SqlCurationView({
  questionClassification,
  questionText,
  sqlValue,
  onSqlChange,
  onSave,
  onBack,
}: SqlCurationViewProps) {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, role: 'agent', text: 'Hi! Describe what you want to change in the query and I\'ll update the SQL for you.' },
  ]);
  const [idCounter, setIdCounter] = useState(1);
  const [sqlBeforeAi, setSqlBeforeAi] = useState<string | null>(null);
  const [highlightLines, setHighlightLines] = useState<number[]>([]);
  const [pendingChanges, setPendingChanges] = useState<{ before: string; after: string }[]>([]);
  const [currentChange, setCurrentChange] = useState(0);
  const [validateState, setValidateState] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    const userText = chatInput.trim();
    const userId = idCounter;
    const thinkingId = idCounter + 1;
    setIdCounter(c => c + 3);
    setChatInput('');

    setMessages(prev => [
      ...prev,
      { id: userId, role: 'user', text: userText },
      { id: thinkingId, role: 'agent', text: '', isThinking: true },
    ]);

    const beforeSql = sqlValue;
    setSqlBeforeAi(beforeSql);

    setTimeout(() => {
      const { sql: updated, explanation } = transformSQL(sqlValue, userText);

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

      setMessages(prev => prev.map(m =>
        m.id === thinkingId
          ? { ...m, text: explanation, isThinking: false }
          : m
      ));
    }, 1200);
  };

  const handleAcceptChanges = () => {
    setPendingChanges([]);
    setHighlightLines([]);
    setSqlBeforeAi(null);
    setMessages(prev => [...prev, { id: idCounter, role: 'agent', text: 'Changes accepted.' }]);
    setIdCounter(c => c + 1);
  };

  const handleDeclineChanges = () => {
    if (sqlBeforeAi) onSqlChange(sqlBeforeAi);
    setPendingChanges([]);
    setHighlightLines([]);
    setSqlBeforeAi(null);
    setMessages(prev => [...prev, { id: idCounter, role: 'agent', text: 'Changes declined — query restored.' }]);
    setIdCounter(c => c + 1);
  };

  const handleRevert = () => {
    if (!sqlBeforeAi) return;
    onSqlChange(sqlBeforeAi);
    setSqlBeforeAi(null);
    setHighlightLines([]);
    setPendingChanges([]);
    setValidateState('idle');
    setMessages(prev => [...prev, { id: idCounter, role: 'agent', text: 'Reverted to the previous query.' }]);
    setIdCounter(c => c + 1);
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
      {/* ── Top bar ── */}
      <div className="scv-topbar">
        <button className="scv-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={15} />
        </button>
        <div className="scv-topbar-title">
          <span className="scv-topbar-label">SQL Curation</span>
          <span className="scv-topbar-sep">·</span>
          <span className="scv-topbar-question">{questionText.length > 72 ? questionText.slice(0, 69) + '…' : questionText}</span>
        </div>
        <div className="scv-topbar-badge">
          {questionClassification === 'regression'
            ? <span className="badge-error">Regression</span>
            : <span className="badge-warning">Inaccurate</span>}
        </div>
        <div className="scv-topbar-actions">
          {sqlBeforeAi && (
            <button className="scv-btn-outline" onClick={handleRevert}>Revert</button>
          )}
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

            {/* ── Accept / Decline floating toolbar ── */}
            {pendingChanges.length > 0 && (
              <div className="scv-review-toolbar">
                <div className="scv-review-buttons">
                  <button className="scv-review-btn scv-review-accept" onClick={handleAcceptChanges}>
                    Accept Changes
                  </button>
                  <button className="scv-review-btn scv-review-decline" onClick={handleDeclineChanges}>
                    Decline Changes
                  </button>
                </div>
                <div className="scv-review-pages">
                  <button className="scv-review-nav" aria-label="Previous" disabled={currentChange === 0} onClick={() => setCurrentChange(c => Math.max(0, c - 1))}>
                    <ChevronLeft size={14} />
                  </button>
                  <span className="scv-review-counter">{currentChange + 1} of {pendingChanges.length}</span>
                  <button className="scv-review-nav" aria-label="Next" disabled={currentChange >= pendingChanges.length - 1} onClick={() => setCurrentChange(c => Math.min(pendingChanges.length - 1, c + 1))}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Agent chat panel ── */}
        <div className="scv-chat-pane">
          <div className="scv-chat-header">
            <AgentAstro size={18} className="scv-chat-icon" />
            <span className="scv-chat-title">Agentforce</span>
          </div>

          <div className="scv-chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`scv-msg scv-msg-${msg.role}`}>
                {msg.role === 'agent' && (
                  <div className="scv-msg-avatar">
                    <AgentAstro size={14} />
                  </div>
                )}
                <div className="scv-msg-bubble">
                  {msg.isThinking
                    ? <span className="scv-thinking"><span /><span /><span /></span>
                    : msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="scv-chat-input-area">
            <textarea
              className="scv-chat-input"
              placeholder="Add your question or response..."
              value={chatInput}
              rows={2}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="scv-chat-input-footer">
              <button
                className="scv-chat-send"
                disabled={!chatInput.trim()}
                onClick={handleSend}
                aria-label="Send"
              >
                <SparkleSingle size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

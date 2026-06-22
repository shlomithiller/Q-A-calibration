import type { Classification, Question } from '../data/questions';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Database,
  Code,
  ThumbsUp,
  ThumbsDown,
  Check,
  Warning,
  VerifiedCheck,
  CircleCheck,
  Undo,
  Redo,
  Play,
  SparkleSingle,
} from './Icons';
import { QueryPanel, highlightLine } from './QueryPanel';
import { ChartPreview } from './ChartPreview';
import { useState, useRef } from 'react';

export interface QuestionDetailProps {
  question: Question;
  loading: boolean;
  saving: Classification | null;
  onBack: () => void;
  reEvaluating?: boolean;
  verified?: boolean;
  fromTest?: boolean;
  sqlEditMode?: boolean;
  sqlEditValue?: string;
  onSqlEditChange?: (v: string) => void;
  onSqlCurationSave?: () => void;
  onNextQuestion?: () => void;
  hasNextQuestion?: boolean;
}

type RightTab = 'sources' | 'query';

export function QuestionDetail({
  question,
  loading,
  saving,
  onBack,
  reEvaluating,
  verified,
  fromTest,
  sqlEditMode = false,
  sqlEditValue = '',
  onSqlEditChange,
  onSqlCurationSave,
  onNextQuestion,
  hasNextQuestion = false,
}: QuestionDetailProps) {
  const [rightTab, setRightTab] = useState<RightTab>('query');
  const [splitPct, setSplitPct] = useState(50);
  const evalCardRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartPct = useRef(50);

  const handlePanelDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartPct.current = splitPct;
    const onMove = (ev: MouseEvent) => {
      if (!evalCardRef.current) return;
      const cardW = evalCardRef.current.offsetWidth;
      const delta = ev.clientX - dragStartX.current;
      const newPct = Math.min(75, Math.max(25, dragStartPct.current + (delta / cardW) * 100));
      setSplitPct(newPct);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const mirrorRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<string[]>([sqlEditValue]);
  const [histIdx, setHistIdx] = useState(0);
  const histTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [testQueryState, setTestQueryState] = useState<'idle' | 'running' | 'done'>('idle');
  const [syntaxOk, setSyntaxOk] = useState(false);
  const [sqlDirty, setSqlDirty] = useState(false);
  const [draftExpanded, setDraftExpanded] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftState, setDraftState] = useState<'idle' | 'drafting'>('idle');

  const pushHistory = (val: string) => {
    const stack = historyRef.current.slice(0, histIdx + 1);
    stack.push(val);
    historyRef.current = stack;
    setHistIdx(stack.length - 1);
  };

  const handleSqlChange = (val: string) => {
    onSqlEditChange?.(val);
    if (testQueryState === 'done') setTestQueryState('idle');
    setSqlDirty(true);
    if (histTimerRef.current) clearTimeout(histTimerRef.current);
    histTimerRef.current = setTimeout(() => pushHistory(val), 500);
  };

  const handleUndo = () => {
    if (histIdx <= 0) return;
    const newIdx = histIdx - 1;
    setHistIdx(newIdx);
    onSqlEditChange?.(historyRef.current[newIdx]);
    setTestQueryState('idle');
    setSyntaxOk(false);
    setSqlDirty(true);
  };

  const handleRedo = () => {
    if (histIdx >= historyRef.current.length - 1) return;
    const newIdx = histIdx + 1;
    setHistIdx(newIdx);
    onSqlEditChange?.(historyRef.current[newIdx]);
    setTestQueryState('idle');
    setSyntaxOk(false);
    setSqlDirty(true);
  };

  const handleTestQuery = () => {
    setTestQueryState('running');
    setSyntaxOk(false);
    setSqlDirty(false);
    setTimeout(() => {
      const upper = sqlEditValue.toUpperCase();
      const ok =
        upper.includes('SELECT') &&
        (upper.includes('FROM') || upper.includes('SEMANTIC_VIEW')) &&
        (sqlEditValue.match(/\(/g) || []).length === (sqlEditValue.match(/\)/g) || []).length;
      setSyntaxOk(ok);
      setTestQueryState('done');
    }, 1200);
  };

  return (
    <div className="detail-view">
      <header className="authoring">
        <div className="breadcrumb">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onBack();
            }}
          >
            Q&amp;A Calibration Questions
          </a>
          <ChevronRight size={10} />
        </div>
        <div className="authoring-title-row">
          <button
            className="icon-btn-bordered back-arrow"
            onClick={onBack}
            aria-label="Back to questions"
          >
            <ArrowLeft size={14} />
          </button>
          {question.classification === 'accurate' && verified && (
            <VerifiedCheck size={20} className="title-verified-badge" />
          )}
          <h2 className="question-title">{question.text}</h2>
          {question.classification !== 'new' && (
            <button className="btn-pill-outline">Test Question</button>
          )}
          {hasNextQuestion && !sqlEditMode && (
            <button className="btn-pill-brand" onClick={onNextQuestion}>
              Next Question
            </button>
          )}
          <button
            className="icon-btn-bordered"
            aria-label="More actions"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </header>

      <div className="details-bar">
        <div className="meta-item">
          <span className="meta-label">Classified by:</span>
          <span className="meta-value muted">N/A</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Classified at</span>
          <span className="meta-value muted">N/A</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Source:</span>
          <span className="meta-value">{question.source}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Rating:</span>
          <span className="rating">
            <span>
              <ThumbsUp size={12} /> {question.thumbsUp}
            </span>
            <span>
              <ThumbsDown size={12} /> {question.thumbsDown}
            </span>
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Model:</span>
          <span className="meta-value">{question.semanticModel} Model</span>
        </div>
      </div>

      <div className={question.classification === 'regression' ? 'regression-card-wrapper' : question.classification === 'accurate' && fromTest ? 'passed-card-wrapper' : question.classification === 'accurate' ? 'snapshot-card-wrapper' : 'evaluation-card-wrapper'}>
        {question.classification === 'regression' && (
          <div className="regression-scoped-notification">
            <Warning size={16} />
            <span>This answer was previously classified as Accurate but has failed at 4/12/2026 05:30 PM during regression testing.</span>
          </div>
        )}
        {question.classification === 'accurate' && fromTest && (
          <div className="passed-notification">
            <div className="passed-notification-left">
              <Check size={14} />
              <span>Passed regression testing at 4/12/2026 05:30 PM. It remains classified as Accurate.</span>
            </div>
          </div>
        )}
        {question.classification === 'accurate' && !fromTest && (
          <div className="snapshot-notification">
            <div className="snapshot-notification-left">
              <span className="snapshot-notification-icon">i</span>
              <span>Viewing a past response snapshot from 4/12/2026 05:30 PM. Data may no longer be current.</span>
            </div>
            <button className="snapshot-notification-link">Test Question</button>
          </div>
        )}
      <div className="evaluation-card" ref={evalCardRef} style={sqlEditMode ? { gridTemplateColumns: `${splitPct}fr 6px ${100 - splitPct}fr` } : undefined}>
        <section className="eval-panel">
          <div className="eval-panel-header">
            <span className="eval-panel-title">Q&amp;A Preview</span>
          </div>
          <div className={`eval-panel-body${sqlEditMode ? ' eval-panel-body-flex' : ''}`}>
            {loading ? (
              <div className="message">
                <div className="avatar-sm agent">
                  <img src="/avatars/agent-avatar.svg" alt="" className="avatar-img" />
                </div>
                <div className="body">
                  <div className="author">Agent</div>
                  <div className="agent-progress">
                    <div className="done"><Check size={12} /> Understanding your request</div>
                    <div className="done"><Check size={12} /> Identifying next steps</div>
                    <div className="working"><DotsLoader /> Working</div>
                  </div>
                </div>
              </div>
            ) : sqlEditMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
                {sqlDirty && (
                  <div className="qa-preview-stale-banner">
                    <Warning size={13} /> Query has unsaved changes — run Test Query to update preview
                  </div>
                )}
                <div className={`qa-preview-table-card${sqlDirty ? ' qa-preview-table-card-stale' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div className="qa-preview-table-header">
                    <div className="qa-preview-table-header-left">
                      <span className="qa-preview-table-title">Preview</span>
                      <span className="qa-preview-table-meta">Last run on 06/04/2025, 09:42 AM</span>
                    </div>
                    <span className="qa-preview-table-counts">2 fields {question.response.chartData.length} rows</span>
                  </div>
                  <div className="qa-preview-table-divider" />
                  <div className="scv-preview-table-wrap" style={{ flex: 1, minHeight: 0 }}>
                    <table className="scv-preview-table">
                      <thead>
                        <tr>
                          <th><div className="scv-preview-th-inner"><span className="scv-preview-th-group">Date</span><span className="scv-preview-th-name">Month</span></div></th>
                          <th><div className="scv-preview-th-inner"><span className="scv-preview-th-group">Orders</span><span className="scv-preview-th-name">Total Orders</span></div></th>
                        </tr>
                      </thead>
                      <tbody>
                        {question.response.chartData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.label}</td>
                            <td>{row.value.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="message">
                <div className="avatar-sm agent">
                  <img src="/avatars/agent-avatar.svg" alt="" className="avatar-img" />
                </div>
                <div className="body">
                  <div className="author">Agent</div>
                  <div className="text" style={{ marginBottom: 8 }}>{question.response.summary}</div>
                  <div className="text" style={{ color: 'var(--color-on-surface-1)' }}>{question.response.followUp}</div>
                  <ChartPreview
                    data={question.response.chartData}
                    yAxisLabel={question.response.chartYAxisLabel}
                    xAxisLabel={question.response.chartXAxisLabel}
                  />
                  <button className="show-sources">
                    <ChevronRight size={12} /> Show sources
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {sqlEditMode && (
          <div className="eval-panel-drag-handle" onMouseDown={handlePanelDragStart} />
        )}

        <section className="eval-panel relative">
          <div className="eval-panel-header">
            {sqlEditMode ? (
              <div className="sql-combined-bar">
                <div className="sql-combined-bar-left">
                  <span className="sql-query-badge"><Code size={12} /> Query</span>
                </div>
                <div className="sql-edit-toolbar-actions">
                  {testQueryState === 'done' && syntaxOk && (
                    <span className="sql-syntax-ok-icon" title="Syntax valid">
                      <CircleCheck size={22} />
                    </span>
                  )}
                  <button className="sql-edit-icon-btn" aria-label="Undo" disabled={histIdx <= 0} onClick={handleUndo}>
                    <Undo size={13} />
                  </button>
                  <button className="sql-edit-icon-btn" aria-label="Redo" disabled={histIdx >= historyRef.current.length - 1} onClick={handleRedo}>
                    <Redo size={13} />
                  </button>
                  <button
                    className={`sql-edit-test-btn${testQueryState === 'running' ? ' running' : ''}`}
                    disabled={!sqlEditValue.trim() || testQueryState === 'running'}
                    onClick={handleTestQuery}
                  >
                    {testQueryState === 'running'
                      ? <><div className="spinner" style={{ width: 10, height: 10, borderWidth: 2, borderTopColor: '#fff' }} /> Running…</>
                      : <><Play size={11} /> Test Query</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="panel-tabs">
                <button
                  className={`panel-tab ${rightTab === 'query' ? 'active' : ''}`}
                  onClick={() => setRightTab('query')}
                >
                  <Code size={14} />
                  Query
                </button>
              </div>
            )}
          </div>
          <div className="eval-panel-body no-pad">
            {loading ? (
              <div className="spinner-overlay" style={{ padding: 24 }}>
                <div className="spinner" />
              </div>
            ) : sqlEditMode ? (
                <div className="sql-edit-wrap">
                  <div className="scv-draft-card" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', flexShrink: 0 }}>
                    <button
                      className="scv-draft-toggle"
                      onClick={() => setDraftExpanded(v => !v)}
                      aria-expanded={draftExpanded}
                    >
                      <span className="scv-draft-toggle-icon">{draftExpanded ? '▾' : '▸'}</span>
                      <span className="scv-draft-toggle-label">Draft with AI</span>
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
                            onClick={() => {
                              setDraftState('drafting');
                              setTimeout(() => {
                                const aiSql = `-- AI-drafted based on: "${draftText}"\nSELECT\n  order_month,\n  COUNT(order_id) AS total_orders\nFROM\n  SEMANTIC_VIEW(\n    'sales_extended',\n    DIMENSIONS\n      DATE_TRUNC('month', Order.Created_Date) AS order_month,\n    MEASURES\n      COUNT(Order.Id) AS total_orders\n  )\nGROUP BY\n  order_month\nORDER BY\n  order_month ASC`;
                                onSqlEditChange?.(aiSql);
                                setTestQueryState('idle');
                                setSyntaxOk(false);
                                setSqlDirty(true);
                                setDraftState('idle');
                                setDraftText('');
                              }, 1600);
                            }}
                          >
                            <SparkleSingle size={14} />
                            {draftState === 'drafting' ? 'Drafting…' : 'Draft with AI'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={`sql-editor-highlight-wrap${sqlDirty ? ' sql-wrap-dirty' : ''}`}>
                    <div className="sql-editor-highlight-mirror code-editor" ref={mirrorRef}>
                      <div className="line-numbers">
                        {sqlEditValue.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
                      </div>
                      <div className="code">
                        {sqlEditValue.split('\n').map((line, i) => (
                          <div key={i}>{highlightLine(line) || ' '}</div>
                        ))}
                      </div>
                    </div>
                    <textarea
                      className="sql-edit-textarea sql-edit-textarea-over"
                      value={sqlEditValue}
                      onChange={e => handleSqlChange(e.target.value)}
                      onScroll={e => {
                        if (mirrorRef.current) {
                          mirrorRef.current.scrollTop = e.currentTarget.scrollTop;
                          mirrorRef.current.scrollLeft = e.currentTarget.scrollLeft;
                        }
                      }}
                      spellCheck={false}
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                </div>
            ) : (
              <QueryPanel sql={question.response.sql} />
            )}

          </div>
        </section>

        {saving && (
          <div className="saving-blanket">
            <div className="spinner" />
            <div>Saving Classification...</div>
          </div>
        )}
      </div>
      </div>

      {reEvaluating && (
        <div className="re-evaluating-blanket">
          <div className="spinner" />
          <div className="re-evaluating-text">Re-evaluating question with updated model...</div>
        </div>
      )}
    </div>
  );
}

function DotsLoader() {
  return (
    <span
      style={{
        display: 'inline-flex',
        gap: 3,
        alignItems: 'center',
        marginRight: 4,
      }}
    >
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
    </span>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      style={{
        width: 4,
        height: 4,
        borderRadius: '50%',
        background: 'var(--color-brand)',
        display: 'inline-block',
        animation: `dot-pulse 0.9s ${delay}ms infinite ease-in-out`,
      }}
    />
  );
}

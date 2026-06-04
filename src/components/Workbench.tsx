import { useState } from 'react';
import type { Question } from '../data/questions';
import {
  Search,
  Refresh,
  FilterIcon,
  Sparkles,
  Plus,
  Upload,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  SparkleSingle,
  Warning,
} from './Icons';

export type TabKey = 'triage' | 'golden';

interface WorkbenchProps {
  questions: Question[];
  onOpenQuestion: (id: string) => void;
  initialTab?: TabKey;
  onRunTest?: () => void;
}

export function Workbench({ questions, onOpenQuestion, initialTab = 'triage', onRunTest }: WorkbenchProps) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = questions.filter((q) => {
    if (tab === 'triage' && q.classification !== 'new') return false;
    if (tab === 'golden' && q.classification !== 'accurate' && q.classification !== 'regression') return false;
    if (!search) return true;
    return q.text.toLowerCase().includes(search.toLowerCase());
  });

  const triageCount = questions.filter((q) => q.classification === 'new').length;
  const goldenCount = questions.filter((q) => q.classification === 'accurate' || q.classification === 'regression').length;
  const regressionCount = questions.filter((q) => q.classification === 'regression').length;

  const allChecked = filtered.length > 0 && filtered.every((q) => selected.has(q.id));
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(filtered.map((q) => q.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const overallHealth = goldenCount > 0
    ? Math.round(((goldenCount - regressionCount) / goldenCount) * 100)
    : 100;

  return (
    <div className="workbench-layout">
      <div className="workbench-page-header">
        <h1 className="workbench-page-title">All Questions</h1>
        <div className="workbench-metrics">
          <div className="wb-metric-card">
            <span className="wb-metric-label">Golden Data Set</span>
            <span className="wb-metric-value">{goldenCount} questions</span>
          </div>
          <div className="wb-metric-card">
            <span className="wb-metric-label">Regression</span>
            <span className={`wb-metric-value ${regressionCount > 0 ? 'wb-metric-danger' : ''}`}>
              {regressionCount}
            </span>
          </div>
          <div className="wb-metric-card">
            <span className="wb-metric-label">Overall Health</span>
            <span className={`wb-metric-value ${overallHealth < 90 ? 'wb-metric-warn' : overallHealth === 100 ? 'wb-metric-success' : ''}`}>
              {overallHealth}%
            </span>
          </div>
        </div>
      </div>
      <div className="workbench-tabs-standalone">
        <button
          className={`workbench-tab ${tab === 'triage' ? 'active' : ''}`}
          onClick={() => setTab('triage')}
        >
          Triage ({triageCount})
        </button>
        <button
          className={`workbench-tab ${tab === 'golden' ? 'active' : ''}`}
          onClick={() => setTab('golden')}
        >
          Golden Data Set ({goldenCount})
        </button>
      </div>

      <div className="workbench-card">
      <div className="workbench-toolbar">
        <span className="count">{filtered.length} questions</span>
        <div className="toolbar-tools">
          <button className="select">
            Any classification <ChevronDown size={14} className="chevron" />
          </button>
          <button className="select">
            Any model <ChevronDown size={14} className="chevron" />
          </button>
          <div className="search">
            <Search size={14} />
            <input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="btn-group-icon">
            <button className="btn-group-icon-item" aria-label="Refresh">
              <Refresh size={14} />
            </button>
            <button className="btn-group-icon-item" aria-label="Filter">
              <FilterIcon size={14} />
            </button>
          </div>
        </div>
        <div className="toolbar-actions">
          {tab === 'golden' ? (
            <button
              className="btn btn-brand"
              onClick={onRunTest}
            >
              Run Test
            </button>
          ) : (
            <>
              <div className="btn-group">
                <button className="btn-group-item">
                  <Sparkles size={14} /> Generate
                </button>
                <button className="btn-group-item">
                  <Plus size={14} /> Add
                </button>
                <button className="btn-group-item">
                  <Upload size={14} /> Import
                </button>
              </div>
              <button
                className="btn btn-brand"
                disabled={filtered.length === 0}
                onClick={() => filtered[0] && onOpenQuestion(filtered[0].id)}
              >
                Review
              </button>
            </>
          )}
        </div>
      </div>

      {tab === 'golden' && regressionCount > 0 && (
        <div className="workbench-regression-alert">
          <Warning size={16} />
          <span>{regressionCount} question{regressionCount > 1 ? 's' : ''} failed regression testing. Calibrate the model to resolve.</span>
          <button className="workbench-regression-link" onClick={() => filtered.find(q => q.classification === 'regression') && onOpenQuestion(filtered.find(q => q.classification === 'regression')!.id)}>
            Calibrate
          </button>
        </div>
      )}

      {tab === 'triage' && filtered.length === 0 ? (
        <div className="workbench-empty-state">
          <img
            src="/illustrations/all-caught-up.svg"
            alt=""
            className="done-panel-illo"
          />
          <h3 className="done-panel-title">You're all caught up</h3>
          <p className="done-panel-text">
            Every question in this batch has been classified. Check the Golden Data Set or pick up the next batch.
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="questions-table">
            <thead>
              <tr>
                <th className="col-check">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                <th>Question</th>
                <th>Source</th>
                <th>Rating</th>
                <th>Semantic Model</th>
                <th>Last Modified</th>
                <th>Classification</th>
                <th className="col-action" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <tr key={q.id} onClick={() => onOpenQuestion(q.id)}>
                  <td className="col-check" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(q.id)}
                      onChange={() => toggleOne(q.id)}
                      aria-label={`Select ${q.text}`}
                    />
                  </td>
                  <td className="col-question">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenQuestion(q.id);
                      }}
                    >
                      {q.text.length > 90 ? q.text.slice(0, 87) + '...' : q.text}
                    </a>
                  </td>
                  <td>{q.source}</td>
                  <td>
                    <span className="rating">
                      <span>
                        <ThumbsUp size={12} /> {q.thumbsUp}
                      </span>
                      <span>
                        <ThumbsDown size={12} /> {q.thumbsDown}
                      </span>
                    </span>
                  </td>
                  <td>{q.semanticModel}</td>
                  <td>{q.lastModified}</td>
                  <td>
                    <span className={`badge ${q.classification}`}>
                      {q.classification === 'new'
                        ? 'New'
                        : q.classification === 'accurate'
                          ? 'Accurate'
                          : q.classification === 'regression'
                            ? 'Regression'
                            : 'Inaccurate'}
                    </span>
                  </td>
                  <td className="col-action">
                    <ChevronRight size={14} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: 'center',
                      padding: '64px 0',
                      color: 'var(--color-on-surface-1)',
                    }}
                  >
                    Nothing here yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}

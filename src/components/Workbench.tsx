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
} from './Icons';

export type TabKey = 'review' | 'inaccurate' | 'accurate';

interface WorkbenchProps {
  questions: Question[];
  onOpenQuestion: (id: string) => void;
  initialTab?: TabKey;
  calibrating?: boolean;
  onStartCalibrating?: () => void;
}

export function Workbench({ questions, onOpenQuestion, initialTab = 'review', calibrating, onStartCalibrating }: WorkbenchProps) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = questions.filter((q) => {
    if (tab === 'review' && q.classification !== 'new') return false;
    if (tab === 'inaccurate' && q.classification !== 'inaccurate') return false;
    if (tab === 'accurate' && q.classification !== 'accurate') return false;
    if (!search) return true;
    return q.text.toLowerCase().includes(search.toLowerCase());
  });

  const reviewCount = questions.filter((q) => q.classification === 'new').length;
  const inaccurateCount = questions.filter((q) => q.classification === 'inaccurate').length;
  const accurateCount = questions.filter((q) => q.classification === 'accurate').length;

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

  return (
    <div className="workbench-card">
      <div className="workbench-header">
        <h1 className="workbench-title">All Questions</h1>
      </div>
      <div className="workbench-tabs">
        <button
          className={`workbench-tab ${tab === 'review' ? 'active' : ''}`}
          onClick={() => setTab('review')}
        >
          Need Review ({reviewCount})
        </button>
        <button
          className={`workbench-tab ${tab === 'inaccurate' ? 'active' : ''}`}
          onClick={() => setTab('inaccurate')}
        >
          Ready for Calibration ({inaccurateCount})
        </button>
        <button
          className={`workbench-tab ${tab === 'accurate' ? 'active' : ''}`}
          onClick={() => setTab('accurate')}
        >
          Accurate ({accurateCount})
        </button>
      </div>

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
          {tab === 'inaccurate' ? (
            <button
              className={`btn btn-agentic ${calibrating ? 'btn-agentic-active' : 'btn-brand'}`}
              disabled={filtered.length === 0}
              onClick={onStartCalibrating}
            >
              <SparkleSingle size={14} /> {calibrating ? 'Calibrating...' : 'Start Calibrating'}
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
    </div>
  );
}

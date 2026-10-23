import { useEffect, useRef, useState } from 'react';
import type { Question } from '../data/questions';
import {
  Search,
  Refresh,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Warning,
  VerifiedCheck,
  Sparkles,
  Upload,
} from './Icons';

interface WorkbenchProps {
  questions: Question[];
  onOpenQuestion: (id: string) => void;
  onAddQuestion: () => void;
  onGenerateQuestion: () => void;
  onUploadCsv: () => void;
}

export function Workbench({ questions, onOpenQuestion, onAddQuestion, onGenerateQuestion, onUploadCsv }: WorkbenchProps) {
  const [search, setSearch] = useState('');
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const [passRate, setPassRate] = useState('all');
  const [agent, setAgent] = useState('any');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const agents = [...new Set(questions.map((q) => q.semanticModel))];

  const filtered = questions.filter((q) => {
    if (search && !q.text.toLowerCase().includes(search.toLowerCase())) return false;
    if (passRate === 'passed' && q.classification !== 'accurate') return false;
    if (passRate === 'failed' && q.classification !== 'regression' && q.classification !== 'inaccurate') return false;
    if (agent !== 'any' && q.semanticModel !== agent) return false;
    return true;
  });

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

  const resetFilters = () => {
    setSearch('');
    setPassRate('all');
    setAgent('any');
  };

  useEffect(() => {
    if (!addMenuOpen) return;
    const close = (event: MouseEvent) => {
      if (!addMenuRef.current?.contains(event.target as Node)) setAddMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [addMenuOpen]);

  return (
    <div className="workbench-layout">
      <div className="workbench-page-header">
        <div className="workbench-page-header-row">
          <h1 className="workbench-page-title">All Questions</h1>
          <div className="add-questions" ref={addMenuRef}>
            <div className="add-questions-group">
              <button type="button" className="add-questions-main" onClick={onAddQuestion}>
                Add Questions
              </button>
              <button
                type="button"
                className="add-questions-toggle"
                aria-label="More ways to add questions"
                aria-expanded={addMenuOpen}
                onClick={() => setAddMenuOpen((open) => !open)}
              >
                <ChevronDown size={14} />
              </button>
            </div>
            {addMenuOpen && (
              <div className="add-questions-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAddMenuOpen(false);
                    onGenerateQuestion();
                  }}
                >
                  <Sparkles size={16} />
                  Generate Question
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAddMenuOpen(false);
                    onUploadCsv();
                  }}
                >
                  <Upload size={16} />
                  Upload CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {regressionCount > 0 && (
        <div className="workbench-regression-alert">
          <Warning size={16} />
          <span>{regressionCount} question{regressionCount > 1 ? 's' : ''} failed regression testing. Calibrate the model to resolve.</span>
          <button className="workbench-regression-link" onClick={() => filtered.find(q => q.classification === 'regression') && onOpenQuestion(filtered.find(q => q.classification === 'regression')!.id)}>
            Calibrate
          </button>
        </div>
      )}

      <div className="workbench-card">
      <div className="workbench-toolbar">
        <span className="count">{filtered.length} questions</span>
        <div className="toolbar-tools">
          <label className="select">
            <select aria-label="Pass Rate" value={passRate} onChange={(e) => setPassRate(e.target.value)}>
              <option value="all">Pass Rate</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </select>
            <ChevronDown size={12} className="chevron" />
          </label>
          <label className="select">
            <select aria-label="Agent" value={agent} onChange={(e) => setAgent(e.target.value)}>
              <option value="any">Any agent</option>
              {agents.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <ChevronDown size={12} className="chevron" />
          </label>
          <div className="search">
            <Search size={14} />
            <input
              placeholder="Search..."
              aria-label="Search questions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="wb-refresh" aria-label="Refresh" onClick={resetFilters}>
            <Refresh size={14} />
          </button>
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
              {filtered.map((q, idx) => (
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
                    <span className="col-question-content">
                      {q.classification !== 'new' && (
                        <span className="verified-icon-wrap" data-tooltip={q.classification !== 'regression' && idx % 4 !== 3 ? `Verified by admin · May ${10 + (idx % 18)}, 2026 at 2:${String(10 + idx).padStart(2, '0')} PM` : undefined}>
                          {q.classification !== 'regression' && idx % 4 !== 3 ? (
                            <VerifiedCheck size={14} className="verified-icon" />
                          ) : (
                            <span className="verified-icon-placeholder" />
                          )}
                        </span>
                      )}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          onOpenQuestion(q.id);
                        }}
                      >
                        {q.text.length > 90 ? q.text.slice(0, 87) + '...' : q.text}
                      </a>
                    </span>
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
                          ? 'Verified'
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
      </div>
    </div>
  );
}

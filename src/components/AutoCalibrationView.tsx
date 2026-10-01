import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Close, Info, Search, SparkleSingle } from './Icons';

type ScoreTone = 'success' | 'warning';
type SuggestionKind = 'preference' | 'calculated' | 'description';
type ModelStatus = 'idle' | 'processing' | 'ready' | 'outdated';

interface Suggestion {
  id: string;
  name: string;
  model: string;
  issue: string;
  solution: string;
  kind: SuggestionKind;
}

interface ModelCard {
  id: string;
  name: string;
  created: string;
  lastRun: string;
  score: number;
  tone: ScoreTone;
  suggestions: Suggestion[];
}

const MODELS: ModelCard[] = [
  {
    id: 'sales',
    name: 'Sales',
    created: '2 hours ago',
    lastRun: '2 hours ago',
    score: 80,
    tone: 'success',
    suggestions: [
      {
        id: 'sales-pref',
        name: 'Add Business Preference',
        model: 'C360',
        issue: 'Missing Business Preference',
        solution: "Add: What's the total opportunity amount by opportunity stage for this quarter",
        kind: 'preference',
      },
      {
        id: 'sales-calc',
        name: 'Add Calculated Field',
        model: 'C360',
        issue: 'Count (x)',
        solution: 'Replace : Count (y)',
        kind: 'calculated',
      },
      {
        id: 'sales-desc',
        name: 'Add Description to Data Object',
        model: 'C360',
        issue: 'Data Object “Account” is missing description',
        solution: "Add: What's the total opportunity amount by opportunity stage for this quarter",
        kind: 'description',
      },
    ],
  },
  {
    id: 'c360',
    name: 'C360',
    created: '5 hours ago',
    lastRun: '5 hours ago',
    score: 50,
    tone: 'warning',
    suggestions: [
      {
        id: 'c360-calc',
        name: 'Add Calculated Field',
        model: 'C360',
        issue: 'Missing CSAT measure',
        solution: 'Add: Relationship CSAT Percentage',
        kind: 'calculated',
      },
      {
        id: 'c360-pref',
        name: 'Add Business Preference',
        model: 'C360',
        issue: 'Missing preferred account grain',
        solution: 'Add: average NPS of customers with critical tickets and open pipeline',
        kind: 'preference',
      },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    created: '1 day ago',
    lastRun: '1 day ago',
    score: 95,
    tone: 'success',
    suggestions: [
      {
        id: 'mkt-desc',
        name: 'Add Description to Data Object',
        model: 'Marketing',
        issue: 'Data Object “Campaign” is missing description',
        solution: 'Add: Campaign performance, channel, and spend for the current quarter',
        kind: 'description',
      },
    ],
  },
];

const STALE_AFTER_MS = 20_000;

const FORMULA =
  'ROUND(COUNT(IF[sample - Superstore].[Discount]>= 4 THEN 1 END)*100.0 /\nCOUNT ([sample - Superstore_Orders]), 2)';

interface AutoCalibrationViewProps {
  onBack: () => void;
  onApplied?: (modelName: string) => void;
}

export function AutoCalibrationView({ onBack, onApplied }: AutoCalibrationViewProps) {
  const [status, setStatus] = useState<Record<string, ModelStatus>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [jobs, setJobs] = useState<{ id: string; phase: 'running' }[]>([]);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [query, setQuery] = useState('');
  const [modelFilter, setModelFilter] = useState('any');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [review, setReview] = useState<{ modelId: string; suggestionId: string } | null>(null);
  const [popoverFor, setPopoverFor] = useState<string | null>(null);
  const timers = useRef<Record<string, number>>({});
  const readyAt = useRef<Record<string, number>>({});

  useEffect(() => {
    const active = timers.current;
    return () => {
      Object.values(active).forEach((id) => window.clearInterval(id));
    };
  }, []);

  const visible = useMemo(() => {
    return MODELS.filter((model) => {
      if (modelFilter !== 'any' && model.id !== modelFilter) return false;
      if (scoreFilter === 'high' && model.score < 80) return false;
      if (scoreFilter === 'low' && model.score >= 80) return false;
      if (query.trim() && !model.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [modelFilter, scoreFilter, query]);

  const generationRunning = jobs.length > 0;

  const startGenerate = (modelId: string) => {
    window.clearInterval(timers.current[modelId]);
    setReview(null);
    delete readyAt.current[modelId];
    setStatus((prev) => ({ ...prev, [modelId]: 'processing' }));
    setProgress((prev) => ({ ...prev, [modelId]: 8 }));
    setSelected((prev) => ({ ...prev, [modelId]: [] }));
    setPopoverFor(null);
    setJobs((prev) => {
      const rest = prev.filter((job) => job.id !== modelId);
      return [...rest, { id: modelId, phase: 'running' }];
    });

    let value = 8;
    const step = modelId === 'c360' ? 4 : 8;
    timers.current[modelId] = window.setInterval(() => {
      value = Math.min(100, value + step);
      setProgress((prev) => ({ ...prev, [modelId]: value }));
      if (value < 100) return;
      window.clearInterval(timers.current[modelId]);
      readyAt.current[modelId] = Date.now();
      setStatus((current) => ({ ...current, [modelId]: 'ready' }));
      setJobs((current) => current.filter((job) => job.id !== modelId));
    }, 220);
  };

  const stopGenerate = (modelId: string) => {
    window.clearInterval(timers.current[modelId]);
    delete readyAt.current[modelId];
    setStatus((prev) => ({ ...prev, [modelId]: 'idle' }));
    setProgress((prev) => ({ ...prev, [modelId]: 0 }));
    setJobs((prev) => prev.filter((job) => job.id !== modelId));
  };

  const toggleRow = (modelId: string, suggestionId: string) => {
    setSelected((prev) => {
      const current = prev[modelId] ?? [];
      const next = current.includes(suggestionId)
        ? current.filter((id) => id !== suggestionId)
        : [...current, suggestionId];
      return { ...prev, [modelId]: next };
    });
  };

  const toggleAll = (model: ModelCard) => {
    setSelected((prev) => {
      const current = prev[model.id] ?? [];
      const all = model.suggestions.map((item) => item.id);
      const next = current.length === all.length ? [] : all;
      return { ...prev, [model.id]: next };
    });
  };

  const applySuggestions = (model: ModelCard) => {
    const picked = selected[model.id] ?? [];
    const applied = picked.length > 0 ? picked : model.suggestions.map((item) => item.id);
    setSelected((prev) => ({ ...prev, [model.id]: applied }));
    const generatedAt = readyAt.current[model.id] ?? Date.now();
    const stale = Date.now() - generatedAt >= STALE_AFTER_MS;
    if (stale) {
      setStatus((prev) => ({ ...prev, [model.id]: 'outdated' }));
      setPopoverFor(model.id);
    }
    onApplied?.(model.name);
  };

  const reviewModel = review ? MODELS.find((model) => model.id === review.modelId) : undefined;
  const reviewItems = reviewModel?.suggestions ?? [];
  const reviewIndex = reviewItems.findIndex((item) => item.id === review?.suggestionId);
  const reviewItem = reviewIndex >= 0 ? reviewItems[reviewIndex] : undefined;

  const openReview = (modelId: string, suggestionId: string) => {
    if (generationRunning) return;
    setReview({ modelId, suggestionId });
  };

  const advanceReview = (checkCurrent: boolean) => {
    if (!review || !reviewModel || !reviewItem) {
      setReview(null);
      return;
    }
    if (checkCurrent) {
      setSelected((prev) => {
        const current = prev[review.modelId] ?? [];
        if (current.includes(reviewItem.id)) return prev;
        return { ...prev, [review.modelId]: [...current, reviewItem.id] };
      });
    }
    const next = reviewItems[reviewIndex + 1];
    if (next) setReview({ modelId: review.modelId, suggestionId: next.id });
    else setReview(null);
  };

  return (
    <div className="ac-page">
      <div className="ac-title-row">
        <button className="icon-btn-bordered back-arrow" onClick={onBack} aria-label="Back">
          <ArrowLeft size={14} />
        </button>
        <h1 className="ac-title">Auto Calibration</h1>
      </div>

      <section className="ac-panel">
        <div className="ac-toolbar">
          <span className="ac-toolbar-title">{MODELS.length} Auto Calibration Suggestions</span>
          <div className="ac-tools">
            <label className="ac-select">
              <span className="sr-only">Generalization score</span>
              <select value={scoreFilter} onChange={(e) => setScoreFilter(e.target.value)} aria-label="Generalization score">
                <option value="all">Generalization score</option>
                <option value="high">80% and above</option>
                <option value="low">Below 80%</option>
              </select>
              <ChevronDown size={12} />
            </label>
            <label className="ac-select">
              <span className="sr-only">Model</span>
              <select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)} aria-label="Model">
                <option value="any">Any model</option>
                {MODELS.map((model) => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
              <ChevronDown size={12} />
            </label>
            <label className="ac-search">
              <Search size={14} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                aria-label="Search models"
              />
            </label>
          </div>
        </div>

        <div className="ac-cards">
          {visible.map((model) => {
            const state = status[model.id] ?? 'idle';
            const picked = selected[model.id] ?? [];
            const showTable = state === 'ready' || state === 'outdated';
            return (
              <article key={model.id} id={`ac-model-${model.id}`} className="ac-card">
                <div className="ac-card-head">
                  <div>
                    <h2>Model Name : {model.name}</h2>
                    <div className="ac-meta">
                      {state === 'idle' || state === 'processing' ? (
                        <span><span className="ac-meta-label">Created:</span> {model.created}</span>
                      ) : (
                        <span><span className="ac-meta-label">Last Run:</span> {state === 'ready' ? '1 minute ago' : model.lastRun}</span>
                      )}
                      <span className="ac-meta-score">
                        <span className="ac-meta-label">Generalization Score:</span>
                        {state === 'outdated' ? (
                          <span className="ac-outdated-wrap">
                            <span className="ac-badge ac-badge-neutral">Outdated</span>
                            <button
                              className="ac-info-btn"
                              aria-label="Why this model is outdated"
                              aria-expanded={popoverFor === model.id}
                              onClick={() => setPopoverFor((current) => (current === model.id ? null : model.id))}
                            >
                              <Info size={14} />
                            </button>
                            {popoverFor === model.id && (
                              <div className="ac-popover" role="dialog">
                                <strong>Model Outdated</strong>
                                <p>This semantic model changed after these suggestions were generated. Generate suggestions again before applying.</p>
                              </div>
                            )}
                          </span>
                        ) : (
                          <span className={`ac-badge ac-badge-${model.tone}`}>{model.score}%</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-neutral-blue ac-generate"
                    onClick={() => startGenerate(model.id)}
                    disabled={state === 'processing' || showTable}
                  >
                    {state === 'processing' ? 'Generating...' : 'Generate Suggestions'}
                  </button>
                </div>

                {showTable && (
                  <>
                    <div className="ac-table-wrap">
                      <table className="ac-table">
                        <thead>
                          <tr>
                            <th className="ac-check">
                              <input
                                type="checkbox"
                                aria-label={`Select all suggestions for ${model.name}`}
                                checked={picked.length === model.suggestions.length && model.suggestions.length > 0}
                                onChange={() => toggleAll(model)}
                                disabled={state === 'outdated'}
                              />
                            </th>
                            <th>Calibration Suggestions</th>
                            <th>Model Name</th>
                            <th>Issue</th>
                            <th>Suggested Solution</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {model.suggestions.map((item) => (
                            <tr key={item.id}>
                              <td className="ac-check">
                                <input
                                  type="checkbox"
                                  aria-label={item.name}
                                  checked={picked.includes(item.id)}
                                  onChange={() => toggleRow(model.id, item.id)}
                                  disabled={state === 'outdated'}
                                />
                              </td>
                              <td>{item.name}</td>
                              <td>{item.model}</td>
                              <td>{item.issue}</td>
                              <td className="ac-solution">{item.solution}</td>
                              <td>
                                {!generationRunning && (
                                  <button
                                    className="ac-review"
                                    onClick={() => openReview(model.id, item.id)}
                                    disabled={state === 'outdated'}
                                  >
                                    Review
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="ac-card-footer">
                      <button
                        className="btn btn-brand"
                        disabled={state === 'outdated' || generationRunning}
                        onClick={() => applySuggestions(model)}
                      >
                        Apply
                      </button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
          {visible.length === 0 && (
            <p className="ac-empty">No models match these filters.</p>
          )}
        </div>
      </section>

      {jobs.length > 0 && (
        <aside className="ac-jobs" aria-live="polite" aria-label="Suggestion generation">
          {jobs.map((job) => {
            const model = MODELS.find((item) => item.id === job.id);
            if (!model) return null;
            const percent = progress[job.id] ?? 0;
            return (
              <div key={job.id} className="ac-job">
                <p>Generating suggestions for {model.name}</p>
                <div className="ac-job-row">
                  <div className="ac-progress-track">
                    <div className="ac-progress-fill" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="ac-job-percent">{percent}%</span>
                  <button type="button" className="ac-job-stop" onClick={() => stopGenerate(job.id)}>Stop</button>
                </div>
              </div>
            );
          })}
        </aside>
      )}

      {reviewItem && reviewModel && !generationRunning && (
        <ReviewModal
          item={reviewItem}
          canGoBack={reviewIndex > 0}
          onClose={() => setReview(null)}
          onBack={() => {
            const prev = reviewItems[reviewIndex - 1];
            if (prev) setReview({ modelId: reviewModel.id, suggestionId: prev.id });
          }}
          onSkip={() => advanceReview(false)}
          onSaveNext={() => advanceReview(true)}
        />
      )}
    </div>
  );
}

function ReviewModal({
  item,
  canGoBack,
  onClose,
  onBack,
  onSkip,
  onSaveNext,
}: {
  item: Suggestion;
  canGoBack: boolean;
  onClose: () => void;
  onBack: () => void;
  onSkip: () => void;
  onSaveNext: () => void;
}) {
  const title =
    item.kind === 'calculated'
      ? 'Calibrations Suggestions - Calculated Field'
      : item.kind === 'preference'
        ? 'Calibrations Suggestions - Business Preference'
        : 'Calibrations Suggestions - Data Object';

  const banner =
    item.kind === 'calculated'
      ? 'Applying this calibration will enable the agent to answer correctly questions such as “What is the relationship CSAT per region”.'
      : item.kind === 'preference'
        ? 'Applying this calibration will teach the agent the preferred phrasing for this business question.'
        : 'Applying this calibration adds the missing description so the agent can use this data object.';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="ac-modal" role="dialog" aria-labelledby="ac-review-title" onClick={(e) => e.stopPropagation()}>
        <button className="ac-modal-close" aria-label="Close" onClick={onClose}>
          <Close size={14} />
        </button>
        <h2 id="ac-review-title">{title}</h2>
        <div className="ac-modal-banner">
          <Info size={16} />
          <p>{banner}</p>
        </div>

        {item.kind === 'calculated' ? (
          <CalculatedFieldBody />
        ) : (
          <div className="ac-simple-review">
            <label>
              Issue
              <input readOnly value={item.issue} />
            </label>
            <label>
              Suggested solution
              <textarea readOnly value={item.solution} rows={4} />
            </label>
          </div>
        )}

        <footer className="ac-modal-footer">
          <button className="btn btn-outlined" onClick={onBack} disabled={!canGoBack}>Back</button>
          <div className="ac-modal-footer-right">
            <button className="btn btn-outlined" onClick={onSkip}>Skip</button>
            <button className="btn btn-brand" onClick={onSaveNext}>Save &amp; Next</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function CalculatedFieldBody() {
  const [tab, setTab] = useState<'fields' | 'functions'>('fields');
  const [draftOpen, setDraftOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  return (
    <div className="ac-calc">
      <aside className="ac-calc-nav">
        <div className="ac-calc-tabs">
          <button className={tab === 'fields' ? 'active' : ''} onClick={() => setTab('fields')}>Fields</button>
          <button className={tab === 'functions' ? 'active' : ''} onClick={() => setTab('functions')}>Functions</button>
        </div>
        <label className="ac-search ac-search-block">
          <Search size={14} />
          <input placeholder="Search..." aria-label="Search fields" />
        </label>
        <ul className="ac-tree">
          {(tab === 'fields'
            ? ['Data Objects (4)', 'Account (8)', 'Account Name (12)', 'Campaign (3)', 'Campaign Name (1)']
            : ['ROUND', 'COUNT', 'IF', 'SUM', 'AVG']
          ).map((label, index) => (
            <li key={label}>
              <ChevronRight size={12} />
              <span className={index === 0 ? 'ac-tree-root' : ''}>{label}</span>
            </li>
          ))}
        </ul>
        <button className="btn btn-neutral-blue ac-insert">
          Insert <ChevronRight size={12} />
        </button>
      </aside>
      <div className="ac-calc-form">
        <button className="ac-collapse" onClick={() => setDraftOpen((open) => !open)}>
          <ChevronRight size={12} className={draftOpen ? 'ac-chevron-open' : ''} />
          Draft with Einstein
          <SparkleSingle size={12} />
        </button>
        {draftOpen && (
          <p className="ac-draft-hint">Einstein drafted Relationship CSAT Percentage from failed CSAT questions in this model.</p>
        )}
        <div className="ac-field-row">
          <label>
            Field Type <span aria-hidden>*</span>
            <select defaultValue="Measure" aria-label="Field type">
              <option>Measure</option>
              <option>Dimension</option>
            </select>
          </label>
          <label>
            Data Type <span aria-hidden>*</span>
            <select defaultValue="Number" aria-label="Data type">
              <option>Number</option>
              <option>Text</option>
              <option>Date</option>
            </select>
          </label>
        </div>
        <label>
          <span className="ac-required">Name</span>
          <input defaultValue="Relationship CSAT Percentage" />
        </label>
        <label>
          Description <span aria-hidden>*</span>
          <input defaultValue="Calculates the percentage of survey responses with a rating of 4 or higher, rounded to two decimal places." />
        </label>
        <button className="ac-collapse" onClick={() => setAdvancedOpen((open) => !open)}>
          <ChevronRight size={12} className={advancedOpen ? 'ac-chevron-open' : ''} />
          Advanced
        </button>
        {advancedOpen && <p className="ac-draft-hint">Aggregation: Average. Display format: Percent, 2 decimal places.</p>}
        <button className="ac-collapse ac-collapse-open" onClick={() => setFiltersOpen((open) => !open)}>
          <ChevronDown size={12} className={filtersOpen ? '' : 'ac-chevron-closed'} />
          Filters <span className="ac-count">3</span>
        </button>
        <div className="ac-formula">
          <div className="ac-formula-label">Formula <Info size={12} /></div>
          <div className="ac-formula-tools" aria-hidden>
            {['+', '−', '*', '/', '^', '(', ')'].map((symbol) => (
              <span key={symbol}>{symbol}</span>
            ))}
            <SparkleSingle size={12} />
          </div>
          <pre>{FORMULA}</pre>
        </div>
      </div>
    </div>
  );
}

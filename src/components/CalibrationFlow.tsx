import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Ban, ChevronDown, ChevronRight, Close, Info, Search, SparkleSingle, VerifiedCheck } from './Icons';

type Impact = 'High' | 'Medium' | 'Low';
type ScoreTone = 'warning' | 'success' | 'error';

interface Suggestion {
  id: string;
  type: string;
  expression: string;
  reasoning: string;
  impact: Impact;
  kind: 'calculated' | 'preference' | 'description' | 'other';
}

interface CalibrationModel {
  id: string;
  name: string;
  score: number;
  tone: ScoreTone;
  suggestions: Suggestion[];
}

const MODELS: CalibrationModel[] = [
  {
    id: 'sales',
    name: 'Sales',
    score: 40,
    tone: 'warning',
    suggestions: [
      { id: 'pref', type: 'Add Business Preference', expression: 'Default Aggregation: AVG([CSAT Score])', reasoning: 'Missing Business Preference', impact: 'High', kind: 'preference' },
      { id: 'calc', type: 'Add Calculated Field', expression: 'SUM([Profit]) / SUM([Sales])', reasoning: 'Count (x)', impact: 'Medium', kind: 'calculated' },
      { id: 'desc', type: 'Add Description to Data Object', expression: 'The date the contract was fully signed. Use t...', reasoning: 'Data Object “Account” is missing description...', impact: 'Low', kind: 'description' },
      { id: 's1', type: 'Calibration Suggestion', expression: 'Suggest Solution', reasoning: 'Sales', impact: 'Low', kind: 'other' },
      { id: 's2', type: 'Calibration Suggestion', expression: 'Suggest Solution', reasoning: 'Sales', impact: 'Low', kind: 'other' },
      { id: 's3', type: 'Calibration Suggestion', expression: 'Suggest Solution', reasoning: 'Marketing', impact: 'Low', kind: 'other' },
      { id: 's4', type: 'Calibration Suggestion', expression: 'Suggest Solution', reasoning: 'C360', impact: 'Low', kind: 'other' },
      { id: 's5', type: 'Calibration Suggestion', expression: 'Suggest Solution', reasoning: 'C360', impact: 'Low', kind: 'other' },
    ],
  },
  {
    id: 'c360',
    name: 'C360',
    score: 80,
    tone: 'success',
    suggestions: [
      { id: 'c360-calc', type: 'Add Calculated Field', expression: 'Relationship CSAT Percentage', reasoning: 'Missing CSAT measure', impact: 'High', kind: 'calculated' },
      { id: 'c360-pref', type: 'Add Business Preference', expression: 'Average NPS of customers with critical tickets', reasoning: 'Missing preferred account grain', impact: 'Medium', kind: 'preference' },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    score: 80,
    tone: 'success',
    suggestions: [
      { id: 'mkt-desc', type: 'Add Description to Data Object', expression: 'Campaign performance, channel, and spend', reasoning: 'Data Object “Campaign” is missing description', impact: 'Low', kind: 'description' },
    ],
  },
  {
    id: 'service',
    name: 'Service',
    score: 20,
    tone: 'error',
    suggestions: [
      { id: 'svc-pref', type: 'Add Business Preference', expression: 'Open cases by priority', reasoning: 'Missing case priority preference', impact: 'High', kind: 'preference' },
    ],
  },
];

interface VqRow {
  question: string;
  match: number;
  classification: 'Verified' | 'Regression';
}

const VQS: VqRow[] = [
  { question: 'What is the average NPS score of all customers that have critical tickets and open pipeline?', match: 40, classification: 'Verified' },
  { question: 'Compare lead conversion rate in the prior month for different sources, when responding I do not want you to include sources marked as other', match: 80, classification: 'Verified' },
  { question: 'What is our average days to close?', match: 80, classification: 'Verified' },
  { question: 'Show me the total sales amount and opportunity type for closed won deals', match: 40, classification: 'Verified' },
  { question: 'How does the average deal size of opportunities for new business compare to existing?', match: 80, classification: 'Verified' },
  { question: 'Compare the average deal size for each lead source.', match: 50, classification: 'Verified' },
  { question: "What's the total opportunity amount by opportunity stage for this quarter", match: 80, classification: 'Verified' },
  { question: 'Total opportunity amount between aug 1 2024 and dec 1 2024 , by closed date and stage', match: 40, classification: 'Regression' },
  { question: 'Whats the Average Deal Size this Quarter?', match: 10, classification: 'Regression' },
  { question: 'List unconverted leads grouped by rating level and acquisition channel', match: 80, classification: 'Verified' },
  { question: 'Compare lead conversion rate in the prior month for different sources, when responding I do not want you to include sources marked as other', match: 80, classification: 'Verified' },
  { question: "What's the total opportunity amount by opportunity stage for this quarter", match: 80, classification: 'Verified' },
  { question: 'Which lead sources are generating the highest number of converted leads this quarter?', match: 80, classification: 'Verified' },
];

function toneFor(score: number): ScoreTone {
  if (score >= 80) return 'success';
  if (score >= 40) return 'warning';
  return 'error';
}

function matchClass(match: number): string {
  if (match >= 80) return 'ac-badge-success';
  if (match >= 40) return 'ac-badge-warning';
  return 'cal-score-low';
}

interface CalibrationFlowProps {
  onBack: () => void;
  onSaved: (message: string) => void;
}

const CALIBRATE_MS = 4500;

export function CalibrationFlow({ onBack, onSaved }: CalibrationFlowProps) {
  const [reviewModelId, setReviewModelId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(MODELS.map((model) => [model.id, model.score])),
  );
  const [progress, setProgress] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const frame = useRef(0);
  const models = MODELS.map((model) => {
    const score = scores[model.id] ?? model.score;
    return { ...model, score, tone: toneFor(score) };
  });
  const reviewModel = models.find((model) => model.id === reviewModelId);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const calibrateAll = () => {
    if (progress != null) return;
    setReviewModelId(null);
    const starts = { ...scores };
    const begin = Date.now();
    const step = () => {
      const elapsedMs = Date.now() - begin;
      const t = Math.min(1, elapsedMs / CALIBRATE_MS);
      setProgress(t);
      setElapsed(elapsedMs);
      setScores(() =>
        Object.fromEntries(
          MODELS.map((model) => [model.id, Math.round(starts[model.id] + (100 - starts[model.id]) * t)]),
        ),
      );
      if (t < 1) {
        frame.current = requestAnimationFrame(step);
      } else {
        onSaved('Calibrations applied');
      }
    };
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(step);
  };

  const calibrating = progress != null && progress < 1;
  const elapsedSeconds = Math.floor(elapsed / 1000);
  const remainingSeconds = calibrating ? Math.max(0, Math.ceil((CALIBRATE_MS - elapsed) / 1000)) : 0;

  if (reviewModel) {
    return <ModelVqPage model={reviewModel} onBack={() => setReviewModelId(null)} onSaved={onSaved} onCalibrateAll={calibrateAll} />;
  }

  return (
    <div className="cal-page">
      <div className="sm-title-row">
        <button className="icon-btn-bordered back-arrow" onClick={onBack} aria-label="Back to test">
          <ArrowLeft size={14} />
        </button>
        <h1 className="sm-title">Calibration</h1>
      </div>

      {progress != null && (
        <div className="rt-meta-progress">
          <div className="rt-progress-labels">
            <span><strong>Processing:</strong> {Math.round(progress * 100)}% ({elapsedSeconds}s elapsed)</span>
            <span>Estimated Remaining: ~{remainingSeconds}s</span>
          </div>
          <div className="rt-progress-bar">
            <div className="rt-progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      )}

      <section className="cal-card">
        {models.map((model) => (
          <article key={model.id} className="cal-model">
            <div>
              <h2>Model Name : {model.name}</h2>
              <div className="cal-meta">
                <span><span className="ac-meta-label">Created:</span> 2 hours ago</span>
                <span className="cal-score">
                  SDM match VQ
                  <span className={`ac-badge ac-badge-${model.tone === 'error' ? 'warning' : model.tone} ${model.tone === 'error' ? 'cal-score-low' : ''}`}>{model.score}%</span>
                </span>
              </div>
            </div>
            <button type="button" className="btn btn-outlined" onClick={() => setReviewModelId(model.id)} disabled={calibrating}>Review</button>
          </article>
        ))}
        <div className="cal-footer">
          <button
            type="button"
            className="btn btn-brand"
            onClick={calibrateAll}
            disabled={progress != null}
          >
            Calibrate All
          </button>
        </div>
      </section>
    </div>
  );
}

const IMPACTED_ROWS = {
  calculated: [7, 8],
  preference: [0, 3],
} as const;

function ModelVqPage({ model, onBack, onSaved, onCalibrateAll }: { model: CalibrationModel; onBack: () => void; onSaved: (message: string) => void; onCalibrateAll: () => void }) {
  const [impacted, setImpacted] = useState<'calculated' | 'preference' | null>(null);
  const [panel, setPanel] = useState<'hidden' | 'loading' | 'ready'>('hidden');
  const highlighted = impacted ? IMPACTED_ROWS[impacted] : [];

  const suggest = () => {
    setPanel('loading');
    window.setTimeout(() => setPanel('ready'), 1200);
  };

  return (
    <div className="vq-page">
      <div className="vq-title-row">
        <div className="vq-title">
          <button className="icon-btn-bordered back-arrow" onClick={onBack} aria-label="Back to models">
            <ArrowLeft size={14} />
          </button>
          <h1>Model Name - {model.name}</h1>
        </div>
        <button type="button" className="btn btn-brand" onClick={suggest} disabled={panel === 'loading'}>
          {panel === 'loading' ? 'Suggesting...' : 'Suggest Calibrations'}
        </button>
      </div>

      <div className="vq-details">
        <span><strong>Model match VQ:</strong> <span className={`ac-badge ${matchClass(model.score)}`}>{model.score}%</span></span>
        <span><strong>Run Time:</strong> 20 seconds</span>
        <span><strong>Last Modified</strong> A week ago</span>
      </div>

      <div className={`vq-split ${panel !== 'hidden' ? 'vq-split-open' : ''}`}>
      <div className="ts-table-card">
        <table className="ts-table vq-table">
          <thead>
            <tr>
              <th>Representative Questions</th>
              <th>Model Match VQ</th>
              <th>Classification</th>
            </tr>
          </thead>
          <tbody>
            {VQS.map((row, index) => (
              <tr key={`${row.question}-${index}`} className={highlighted.includes(index) ? 'vq-row-impacted' : undefined}>
                <td className="vq-question">{row.question}</td>
                <td><span className={`ac-badge ${matchClass(row.match)}`}>{row.match}%</span></td>
                <td>
                  {row.classification === 'Regression' ? (
                    <span className="rt-badge rt-badge-class-regression"><Ban size={12} /> Regression</span>
                  ) : (
                    <span className="rt-badge rt-badge-class-verified"><VerifiedCheck size={12} /> Verified</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {panel !== 'hidden' && (
        <SuggestionPanel
          loading={panel === 'loading'}
          onClose={() => setPanel('hidden')}
          onCalibrate={(label) => onSaved(`${label} applied on ${model.name}`)}
          onCalibrateAll={onCalibrateAll}
          impacted={impacted}
          onImpacted={setImpacted}
        />
      )}
      </div>
    </div>
  );
}

function SuggestionPanel({
  loading,
  onClose,
  onCalibrate,
  onCalibrateAll,
  impacted,
  onImpacted,
}: {
  loading: boolean;
  onClose: () => void;
  onCalibrate: (label: string) => void;
  onCalibrateAll: () => void;
  impacted: 'calculated' | 'preference' | null;
  onImpacted: (value: 'calculated' | 'preference' | null) => void;
}) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [step, setStep] = useState<'calculated' | 'preference' | null>(null);
  const showCalculated = typeFilter === 'all' || typeFilter === 'calculated';
  const showPreference = typeFilter === 'all' || typeFilter === 'preference';

  return (
    <aside className="calibration-side-panel vq-suggest-panel">
      <div className="calibration-side-panel-header">
        <span className="calibration-side-panel-title">Calibration Suggestions</span>
        <button type="button" className="calibration-side-panel-close" onClick={onClose} aria-label="Close">
          <Close size={14} />
        </button>
      </div>
      <div className="calibration-side-panel-content">
        {loading ? (
          <div className="calibration-analyzing">
            <div className="calibration-analyzing-sparkles">
              <span className="sparkle-dot sparkle-dot-1"><SparkleSingle size={10} /></span>
              <span className="sparkle-dot sparkle-dot-2"><SparkleSingle size={14} /></span>
              <span className="sparkle-dot sparkle-dot-3"><SparkleSingle size={8} /></span>
            </div>
            <p className="calibration-analyzing-text">Generating calibration suggestions...</p>
          </div>
        ) : (
          <>
            <div className="vq-filters">
              <label className="ac-select">
                <span className="sr-only">Calibration type</span>
                <select
                  aria-label="Calibration type"
                  value={typeFilter}
                  onChange={(event) => {
                    const next = event.target.value;
                    setTypeFilter(next);
                    if (next === 'calculated' && impacted === 'preference') onImpacted(null);
                    if (next === 'preference' && impacted === 'calculated') onImpacted(null);
                    if (next === 'description') onImpacted(null);
                  }}
                >
                  <option value="all">All Calibrations Types</option>
                  <option value="calculated">Calculated Field</option>
                  <option value="preference">Business Preference</option>
                  <option value="description">Description</option>
                </select>
                <ChevronDown size={12} />
              </label>
              <label className="ac-select">
                <span className="sr-only">Impact</span>
                <select aria-label="Impact" defaultValue="all">
                  <option value="all">Impact</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
                <ChevronDown size={12} />
              </label>
            </div>
            <div className="analysis-summary">
              <div className="analysis-summary-header">
                <SparkleSingle size={16} className="analysis-summary-icon" />
                <span className="analysis-summary-title">Analysis Summary</span>
              </div>
              <p className="analysis-summary-body">
                Based on your feedback, the agent confirmed a mismatch between your intent and the semantic routing: the system mapped the query to a standard platform metric (<strong>Opportunity.Amount</strong>), overlooking your specific custom data definitions. To resolve this, we recommend applying the following calibration:
              </p>
            </div>
            {showCalculated && <div className="calibration-card">
              <span className="calibration-card-badge"><SparkleSingle size={10} /> Suggested Calibration</span>
              <div className="calibration-card-header">
                <span className="calibration-card-icon description" />
                <span className="calibration-card-title">Add Calculated Field</span>
              </div>
              <p className="calibration-card-body">
                Adding a business preference will explicitly instruct the model to bypass standard mapping and default to <strong>Opportunity.Expected</strong> for future queries involving revenue, ensuring the agent strictly follows your local business logic.
              </p>
              <div className="calibration-card-actions">
                <button type="button" className="btn btn-brand btn-with-icon" onClick={() => setStep('calculated')}>
                  <SparkleSingle size={14} /> Calibrate
                </button>
                <label className="vq-impacted">
                  <input
                    type="checkbox"
                    checked={impacted === 'calculated'}
                    onChange={() => onImpacted(impacted === 'calculated' ? null : 'calculated')}
                  />
                  Impacted Questions
                </label>
              </div>
            </div>}
            {showPreference && <div className="calibration-card">
              <span className="calibration-card-badge"><SparkleSingle size={10} /> Suggested Calibration</span>
              <div className="calibration-card-header">
                <span className="calibration-card-icon description" />
                <span className="calibration-card-title">Add Business Preference</span>
              </div>
              <p className="calibration-card-body">
                Adding a business preference will explicitly instruct the model to bypass standard mapping and default to
              </p>
              <div className="calibration-card-actions">
                <button type="button" className="btn btn-brand btn-with-icon" onClick={() => onCalibrate('Add Business Preference')}>
                  <SparkleSingle size={14} /> Calibrate
                </button>
                <label className="vq-impacted">
                  <input
                    type="checkbox"
                    checked={impacted === 'preference'}
                    onChange={() => onImpacted(impacted === 'preference' ? null : 'preference')}
                  />
                  Impacted Questions
                </label>
              </div>
            </div>}
          </>
        )}
      </div>
      {!loading && (
        <div className="vq-panel-footer">
          <button type="button" className="btn btn-outlined" onClick={onCalibrateAll}>Calibrate All</button>
        </div>
      )}
      {step === 'calculated' && (
        <CalculatedFieldModal
          onClose={() => setStep(null)}
          onSave={() => {
            setStep(null);
            onCalibrate('Add Calculated Field');
          }}
          onSaveNext={() => {
            onCalibrate('Add Calculated Field');
            setStep('preference');
          }}
        />
      )}
      {step === 'preference' && (
        <PreferenceModal
          onClose={() => setStep(null)}
          onAdd={() => {
            setStep(null);
            onCalibrate('Add Business Preference');
          }}
        />
      )}
    </aside>
  );
}

const CALC_FORMULA = 'ROUND(COUNT(IF[sample - Superstore].[Discount]>= 4 THEN 1 END)*100.0 /\nCOUNT ([sample - Superstore_Orders]), 2)';

function CalculatedFieldModal({ onClose, onSave, onSaveNext }: { onClose: () => void; onSave: () => void; onSaveNext: () => void }) {
  const [tab, setTab] = useState<'fields' | 'functions'>('fields');
  const [draftOpen, setDraftOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="ac-modal" role="dialog" aria-labelledby="calc-field-title" onClick={(event) => event.stopPropagation()}>
        <button className="ac-modal-close" aria-label="Close" onClick={onClose}>
          <Close size={14} />
        </button>
        <h2 id="calc-field-title">Calibrations Suggestions - Calculated Field</h2>
        <div className="ac-modal-banner">
          <SparkleSingle size={16} />
          <p><strong>Impact: High</strong> - Designed to help the agent answer accurately questions like: “What is the relationship CSAT per region?”</p>
        </div>
        <div className="ac-calc">
          <aside className="ac-calc-nav">
            <div className="ac-calc-tabs">
              <button type="button" className={tab === 'fields' ? 'active' : ''} onClick={() => setTab('fields')}>Fields</button>
              <button type="button" className={tab === 'functions' ? 'active' : ''} onClick={() => setTab('functions')}>Functions</button>
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
            <button type="button" className="btn btn-neutral-blue ac-insert">
              Insert <ChevronRight size={12} />
            </button>
          </aside>
          <div className="ac-calc-form">
            <button type="button" className="ac-collapse" onClick={() => setDraftOpen((open) => !open)}>
              <ChevronRight size={12} className={draftOpen ? 'ac-chevron-open' : ''} />
              Draft with Einstein
              <SparkleSingle size={12} />
            </button>
            {draftOpen && <p className="ac-draft-hint">Einstein drafted Relationship CSAT Percentage from failed CSAT questions in this model.</p>}
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
              <input defaultValue="Relationship CSAT Percentage" aria-label="Field name" />
            </label>
            <label>
              Description <span aria-hidden>*</span>
              <input defaultValue="Calculates the percentage of survey responses with a rating of 4 or higher, rounded to two decimal places." aria-label="Description" />
            </label>
            <button type="button" className="ac-collapse" onClick={() => setAdvancedOpen((open) => !open)}>
              <ChevronRight size={12} className={advancedOpen ? 'ac-chevron-open' : ''} />
              Advanced
            </button>
            {advancedOpen && <p className="ac-draft-hint">Aggregation: Average. Display format: Percent, 2 decimal places.</p>}
            <button type="button" className="ac-collapse ac-collapse-open" onClick={() => setFiltersOpen((open) => !open)}>
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
              <pre>{CALC_FORMULA}</pre>
            </div>
          </div>
        </div>
        <footer className="ac-modal-footer">
          <button type="button" className="btn btn-outlined" onClick={onClose}>Back</button>
          <div className="ac-modal-footer-right">
            <button type="button" className="btn btn-outlined" onClick={onClose}>Skip</button>
            <button type="button" className="btn btn-outlined" onClick={onSave}>Save</button>
            <button type="button" className="btn btn-brand" onClick={onSaveNext}>Save &amp; Next (1)</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function PreferenceModal({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const [label, setLabel] = useState('Products');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="ac-modal pref-modal" role="dialog" aria-labelledby="pref-title" onClick={(event) => event.stopPropagation()}>
        <button className="ac-modal-close" aria-label="Close" onClick={onClose}>
          <Close size={14} />
        </button>
        <h2 id="pref-title">Add Preference</h2>
        <div className="ac-modal-banner">
          <SparkleSingle size={16} />
          <p><strong>Impact: High</strong> - Designed to help the agent categorize which model to choose</p>
        </div>
        <div className="pref-body">
          <label>
            Describe your preference
            <textarea defaultValue="The total discount cannot exceed 30% of the product's list price" rows={3} />
          </label>
          <label>
            Assign a label
            <span className="pref-search">
              <input placeholder="Search or create a new one..." aria-label="Assign a label" />
              <Search size={14} />
            </span>
          </label>
          {label && (
            <button type="button" className="pref-pill" onClick={() => setLabel('')}>
              {label} <Close size={12} />
            </button>
          )}
          <p className="pref-hint"><Info size={12} /> Press Enter to create a new one.</p>
          <div className="pref-examples">
            <strong>Examples of compliant preferences :</strong>
            <ul>
              <li>Products are ‘in stock’ when the quantity_on_hand field is positive</li>
              <li>When asking about sales performance, group by region</li>
              <li>Limit results to 100 rows</li>
            </ul>
            <p>Learn about <a href="#" onClick={(event) => event.preventDefault()}>Best Practices</a></p>
          </div>
        </div>
        <footer className="ac-modal-footer">
          <span />
          <div className="ac-modal-footer-right">
            <button type="button" className="btn btn-outlined" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-brand" onClick={onAdd}>Add Preference</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

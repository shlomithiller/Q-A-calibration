import { useEffect, useState } from 'react';
import { Close, Sparkles, SparkleSingle } from './Icons';

type CalibrationState = 'analyzing' | 'generating' | 'results';

interface CalibrationCard {
  id: string;
  badge?: string;
  icon: 'description' | 'agent_session';
  title: string;
  body: string;
  action: string;
}

const MOCK_CARDS: CalibrationCard[] = [
  {
    id: '1',
    badge: 'Most recommended',
    icon: 'description',
    title: 'Update Field Metadata',
    body: 'The field <strong>Apm_L1_Cloud1</strong> may not clearly reflect its intended meaning. Updating its name or description can help improve clarity and accuracy.',
    action: 'Review & fix',
  },
  {
    id: '2',
    icon: 'agent_session',
    title: 'Add Business Preference',
    body: 'The metric <strong>"Average Deal Size"</strong> lacks a defined business logic. Adding a business preference will ensure consistent interpretation across queries.',
    action: 'Calibrate',
  },
];

interface CalibrationPanelProps {
  onClose: () => void;
}

export function CalibrationPanel({ onClose }: CalibrationPanelProps) {
  const [state, setState] = useState<CalibrationState>('analyzing');

  useEffect(() => {
    const t1 = setTimeout(() => setState('generating'), 1800);
    const t2 = setTimeout(() => setState('results'), 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="calibration-side-panel">
      <div className="calibration-side-panel-header">
        <span className="calibration-side-panel-icon">
          <SparkleSingle size={18} />
        </span>
        <span className="calibration-side-panel-title">Calibration Suggestions</span>
        <button
          className="calibration-side-panel-close"
          onClick={onClose}
          aria-label="Close"
        >
          <Close size={14} />
        </button>
      </div>

      <div className="calibration-side-panel-content">
        {state !== 'results' ? (
          <div className="calibration-analyzing">
            <div className="calibration-analyzing-sparkles">
              <span className="sparkle-dot sparkle-dot-1"><SparkleSingle size={10} /></span>
              <span className="sparkle-dot sparkle-dot-2"><SparkleSingle size={14} /></span>
              <span className="sparkle-dot sparkle-dot-3"><SparkleSingle size={8} /></span>
            </div>
            <p className="calibration-analyzing-text">
              {state === 'analyzing'
                ? 'Analyzing Semantic Data...'
                : 'Generating calibration suggestions...'}
            </p>
          </div>
        ) : (
          <div className="calibration-results">
            <div className="calibration-one-click">
              <div className="calibration-one-click-header">
                <Sparkles size={16} />
                <span>1-Click Calibration</span>
              </div>
              <p className="calibration-one-click-body">
                Based on the inaccurate responses in this batch, the agent identified
                unclear field metadata and missing business logic as root causes. Apply
                the suggested calibrations below, or let the agent fix everything in one click.
              </p>
              <div className="calibration-one-click-actions">
                <button className="btn btn-brand">Review Plan</button>
                <button className="link-button">Dismiss</button>
              </div>
            </div>

            {MOCK_CARDS.map((card) => (
              <div key={card.id} className="calibration-card">
                {card.badge && (
                  <span className="calibration-card-badge">
                    <SparkleSingle size={10} />
                    {card.badge}
                  </span>
                )}
                <div className="calibration-card-header">
                  <span className={`calibration-card-icon ${card.icon}`} />
                  <span className="calibration-card-title">{card.title}</span>
                </div>
                <p
                  className="calibration-card-body"
                  dangerouslySetInnerHTML={{ __html: card.body }}
                />
                <div className="calibration-card-actions">
                  <button className="btn btn-brand">{card.action}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import type { Classification, Question } from '../data/questions';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Code,
  ThumbsUp,
  ThumbsDown,
  Check,
  Warning,
  VerifiedCheck,
  SparkleSingle,
} from './Icons';
import { QueryPanel } from './QueryPanel';
import { ChartPreview } from './ChartPreview';
import { DotSpinner } from './DotSpinner';
import { useState } from 'react';

export interface QuestionDetailProps {
  question: Question;
  loading: boolean;
  saving: Classification | null;
  onBack: () => void;
  reEvaluating?: boolean;
  verifying?: boolean;
  verified?: boolean;
  fromTest?: boolean;
  onNextQuestion?: () => void;
  hasNextQuestion?: boolean;
  onSkipVerifying?: () => void;
}

type RightTab = 'sources' | 'query';

export function QuestionDetail({
  question,
  loading,
  saving,
  onBack,
  reEvaluating,
  verifying,
  verified,
  fromTest,
  onNextQuestion,
  hasNextQuestion = false,
  onSkipVerifying,
}: QuestionDetailProps) {
  const [rightTab, setRightTab] = useState<RightTab>('query');
  const isChecking = loading || verifying || reEvaluating;

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
            <button className="btn-pill-outline" disabled={isChecking}>Test Question</button>
          )}
          {hasNextQuestion && (
            <button className="btn-pill-outline" onClick={onNextQuestion} disabled={isChecking}>
              Re-run
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
        {verifying && (
          <div className="comparing-banner">
            <div className="comparing-banner-main">
              <div className="comparing-banner-toprow">
                <span className="comparing-banner-title">
                  Verifying Curated Query
                  <span className="comparing-banner-sparkles" aria-hidden>
                    <SparkleSingle size={9} />
                    <SparkleSingle size={9} />
                    <SparkleSingle size={9} />
                  </span>
                </span>
                <span className="comparing-banner-eta">Estimated time: ~2 sec</span>
              </div>
              <p className="comparing-banner-text">
                Comparing agent response to the expected verified query
              </p>
              <div className="comparing-banner-row">
                <div className="comparing-banner-track">
                  <div className="comparing-banner-fill" />
                </div>
                <button
                  type="button"
                  className="comparing-banner-stop"
                  onClick={onSkipVerifying}
                  aria-label="Skip verification"
                >
                  <span className="comparing-banner-stop-icon" />
                </button>
              </div>
            </div>
          </div>
        )}
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
      <div className="evaluation-card">
        <section className="eval-panel">
          <div className="eval-panel-header">
            <span className="eval-panel-title">Q&amp;A Preview</span>
          </div>
          <div className="eval-panel-body">
            {loading ? (
              <div className="message">
                <div className="avatar-sm agent">
                  <img src={`${import.meta.env.BASE_URL}avatars/agent-avatar.svg`} alt="" className="avatar-img" />
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
            ) : (
              <div className="message">
                <div className="avatar-sm agent">
                  <img src={`${import.meta.env.BASE_URL}avatars/agent-avatar.svg`} alt="" className="avatar-img" />
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

        <section className="eval-panel relative">
          <div className="eval-panel-header">
            <div className="panel-tabs">
              <button
                className={`panel-tab ${rightTab === 'query' ? 'active' : ''}`}
                onClick={() => setRightTab('query')}
                disabled={isChecking}
              >
                <Code size={14} />
                Query
              </button>
            </div>
          </div>
          <div className="eval-panel-body no-pad">
            {loading ? (
              <div className="spinner-overlay" style={{ padding: 24 }}>
                <div className="spinner" />
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
          <DotSpinner />
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

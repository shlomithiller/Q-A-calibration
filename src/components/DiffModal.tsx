import { useRef, useState, useCallback } from 'react';
import { Close, Sparkles, Database, Code } from './Icons';

interface DiffModalProps {
  onClose: () => void;
}

const XIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#b60554" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckCircle = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#22683e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const goldenLines = [
  { text: 'WITH ranked_products AS (', diff: null },
  { text: '  SELECT', diff: null },
  { text: '    pipeline_Value,', diff: null },
  { text: '    total_sales_amount,', diff: 'add' },
  { text: '    ROW_NUMBER() OVER (', diff: null },
  { text: '      ORDER BY', diff: null },
  { text: '        total_sales_amount DESC NULLS LAST,', diff: 'add' },
  { text: '        product_name', diff: null },
  { text: '    ) AS rn', diff: null },
  { text: '  FROM', diff: null },
  { text: "    SEMANTIC_VIEW(", diff: null },
  { text: "      'sales_extended',", diff: null },
  { text: '      DIMENSIONS', diff: null },
  { text: '        Goods_Product.Product_Name AS product_name,', diff: 'add' },
  { text: '      MEASURES', diff: null },
  { text: '        SUM(Opportunity_Product.Total_Price_Amount)', diff: 'add' },
  { text: '          AS total_sales_amount,', diff: 'add' },
  { text: '      WHERE', diff: null },
  { text: "        LOWER(Opportunity.Won) = 'true'", diff: null },
  { text: "        AND LOWER(Opportunity.Closed) = 'true'", diff: null },
  { text: '        AND Opportunity.Close_Date >=', diff: null },
  { text: "          DATE_TRUNC('quarter', CURRENT_DATE)", diff: null },
  { text: "          + INTERVAL '3 months'", diff: 'add' },
  { text: '        AND Opportunity.Close_Date <', diff: null },
  { text: "          DATE_TRUNC('quarter', CURRENT_DATE)", diff: null },
  { text: "          + INTERVAL '6 months'", diff: 'add' },
  { text: '    )', diff: null },
  { text: ')', diff: null },
  { text: 'SELECT', diff: null },
  { text: '  product_name AS "ProductName__c",', diff: null },
  { text: '  total_sales_amount AS "TotalSalesAmt__c"', diff: 'add' },
  { text: 'FROM', diff: null },
  { text: '  ranked_products', diff: null },
  { text: 'WHERE', diff: null },
  { text: '  rn = 1', diff: 'add' },
  { text: 'ORDER BY', diff: null },
  { text: '  total_sales_amount DESC', diff: null },
  { text: 'LIMIT 25', diff: 'add' },
  { text: 'OFFSET 0;', diff: null },
  { text: '', diff: null },
  { text: '-- Validated against production data', diff: 'add' },
  { text: '-- Last verified: 04/22/2025', diff: 'add' },
  { text: '-- Reviewer: Harry Anderson', diff: null },
  { text: '-- Confidence: High', diff: null },
];

const actualLines = [
  { text: 'WITH ranked_products AS (', diff: null },
  { text: '  SELECT', diff: null },
  { text: '    pipeline_Value,', diff: null },
  { text: '    ROUND(total_sales_amount / 1000) AS total_sales_k,', diff: 'del' },
  { text: '    ROW_NUMBER() OVER (', diff: null },
  { text: '      ORDER BY', diff: null },
  { text: '        total_sales_amount DESC,', diff: 'del' },
  { text: '        product_name', diff: null },
  { text: '    ) AS rn', diff: null },
  { text: '  FROM', diff: null },
  { text: "    SEMANTIC_VIEW(", diff: null },
  { text: "      'sales_extended',", diff: null },
  { text: '      DIMENSIONS', diff: null },
  { text: '        Goods_Product.Name AS product_name,', diff: 'del' },
  { text: '      MEASURES', diff: null },
  { text: '        SUM(Opportunity_Product.Price_Amount)', diff: 'del' },
  { text: '          AS total_sales_amount,', diff: null },
  { text: '      WHERE', diff: null },
  { text: "        LOWER(Opportunity.Won) = 'true'", diff: null },
  { text: "        AND LOWER(Opportunity.Closed) = 'true'", diff: null },
  { text: '        AND Opportunity.Close_Date >=', diff: null },
  { text: "          DATE_TRUNC('quarter', CURRENT_DATE)", diff: null },
  { text: "          + INTERVAL '1 month'", diff: 'del' },
  { text: '        AND Opportunity.Close_Date <', diff: null },
  { text: "          DATE_TRUNC('quarter', CURRENT_DATE)", diff: null },
  { text: "          + INTERVAL '4 months'", diff: 'del' },
  { text: '    )', diff: null },
  { text: ')', diff: null },
  { text: 'SELECT', diff: null },
  { text: '  product_name AS "ProductName__c",', diff: null },
  { text: "  total_sales_k || 'k' AS \"TotalSalesAmt__c\"", diff: 'del' },
  { text: 'FROM', diff: null },
  { text: '  ranked_products', diff: null },
  { text: 'WHERE', diff: null },
  { text: '  rn <= 10', diff: 'del' },
  { text: 'ORDER BY', diff: null },
  { text: '  total_sales_amount DESC', diff: null },
  { text: 'LIMIT 10', diff: 'del' },
  { text: 'OFFSET 0;', diff: null },
  { text: '', diff: null },
  { text: '-- Generated by agent runtime', diff: 'del' },
  { text: '-- Execution: 04/24/2025', diff: 'del' },
  { text: '-- Reviewer: N/A', diff: 'del' },
  { text: '-- Confidence: Medium', diff: 'del' },
];

type DiffTab = 'preview' | 'query';

export function DiffModal({ onClose }: DiffModalProps) {
  const totalLines = Math.max(goldenLines.length, actualLines.length);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);
  const [viewportTop, setViewportTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(40);
  const [activeTab, setActiveTab] = useState<DiffTab>('query');

  const updateViewport = useCallback((el: HTMLDivElement) => {
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight) {
      setViewportTop(0);
      setViewportHeight(100);
      return;
    }
    setViewportTop((scrollTop / scrollHeight) * 100);
    setViewportHeight((clientHeight / scrollHeight) * 100);
  }, []);

  const handleLeftScroll = useCallback(() => {
    const left = leftPanelRef.current;
    const right = rightPanelRef.current;
    if (!left || !right || isSyncing.current) return;
    isSyncing.current = true;
    const pct = left.scrollTop / (left.scrollHeight - left.clientHeight || 1);
    right.scrollTop = pct * (right.scrollHeight - right.clientHeight);
    updateViewport(left);
    isSyncing.current = false;
  }, [updateViewport]);

  const handleRightScroll = useCallback(() => {
    const left = leftPanelRef.current;
    const right = rightPanelRef.current;
    if (!left || !right || isSyncing.current) return;
    isSyncing.current = true;
    const pct = right.scrollTop / (right.scrollHeight - right.clientHeight || 1);
    left.scrollTop = pct * (left.scrollHeight - left.clientHeight);
    updateViewport(right);
    isSyncing.current = false;
  }, [updateViewport]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="diff-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close">
          <Close size={14} />
        </button>

        <div className="diff-modal-header">
          <h2 className="diff-modal-title">Review Differences</h2>
        </div>

        <div className="diff-modal-content">
          <div className="diff-panel">
            <div className="diff-panel-header">
              <span className="diff-icon-oval diff-icon-oval-green"><CheckCircle size={12} /></span>
              <span>Golden Dataset</span>
            </div>
            <div className="diff-panel-timestamp">Classified on 04/22/2025 at 12:14 PM PST</div>
            <div className="diff-panel-tabs">
              <span className={`diff-tab ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}><span className="diff-tab-icon"><Database size={12} /></span>Preview</span>
              <span className={`diff-tab ${activeTab === 'query' ? 'active' : ''}`} onClick={() => setActiveTab('query')}><span className="diff-tab-icon"><Code size={12} /></span>Query</span>
            </div>
            {activeTab === 'query' ? (
              <div className="diff-panel-code" ref={leftPanelRef} onScroll={handleLeftScroll}>
                <div className="diff-code-editor">
                  <div className="diff-line-numbers">
                    {goldenLines.map((_, i) => <div key={i}>{i + 1}</div>)}
                  </div>
                  <div className="diff-code-content">
                    {goldenLines.map((line, i) => (
                      <div key={i} className={`diff-code-line ${line.diff === 'add' ? 'diff-add' : ''}`}>
                        {line.text || ' '}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="diff-panel-preview">
                <div className="diff-preview-message">
                  <div className="diff-preview-avatar user" />
                  <div className="diff-preview-body">
                    <div className="diff-preview-author">Samantha Adams</div>
                    <div className="diff-preview-text">Show me total orders by month</div>
                  </div>
                </div>
                <div className="diff-preview-message">
                  <div className="diff-preview-avatar agent" />
                  <div className="diff-preview-body">
                    <div className="diff-preview-author">Agent</div>
                    <div className="diff-preview-text">I found a table called Orders, and here is the Total Orders by Month.</div>
                    <div className="diff-preview-text muted">Would you like to make any changes? You can preview the Orders table, add other data tables, or change the visualization. Or investigate something different.</div>
                    <div className="diff-preview-chart">
                      {[38, 42, 49, 45, 51, 47, 50, 52, 48].map((v, i) => (
                        <div key={i} className="diff-preview-bar" style={{ height: `${(v / 52) * 100}%` }} />
                      ))}
                    </div>
                    <div className="diff-preview-labels">
                      {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep'].map((m, i) => (
                        <span key={i}>{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {activeTab === 'query' && (
            <div className="diff-scrollbar">
              <div className="diff-scrollbar-track">
                {goldenLines.map((line, i) => line.diff === 'add' ? (
                  <div key={`a${i}`} className="diff-scrollbar-add" style={{ top: `${(i / totalLines) * 100}%`, height: `${(1 / totalLines) * 100}%` }} />
                ) : null)}
                {actualLines.map((line, i) => line.diff === 'del' ? (
                  <div key={`d${i}`} className="diff-scrollbar-del" style={{ top: `${(i / totalLines) * 100}%`, height: `${(1 / totalLines) * 100}%` }} />
                ) : null)}
                <div
                  className="diff-scrollbar-viewport"
                  style={{ top: `${viewportTop}%`, height: `${viewportHeight}%` }}
                />
              </div>
            </div>
          )}

          <div className="diff-panel">
            <div className="diff-panel-header">
              <span className="diff-icon-oval diff-icon-oval-red"><XIcon size={12} /></span>
              <span>Actual Answer</span>
            </div>
            <div className="diff-panel-timestamp">Generated on 04/24/2025 at 9:41 AM PST</div>
            <div className="diff-panel-tabs">
              <span className={`diff-tab ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}><span className="diff-tab-icon"><Database size={12} /></span>Preview</span>
              <span className={`diff-tab ${activeTab === 'query' ? 'active' : ''}`} onClick={() => setActiveTab('query')}><span className="diff-tab-icon"><Code size={12} /></span>Query</span>
            </div>
            {activeTab === 'query' ? (
              <div className="diff-panel-code" ref={rightPanelRef} onScroll={handleRightScroll}>
                <div className="diff-code-editor">
                  <div className="diff-line-numbers">
                    {actualLines.map((_, i) => <div key={i}>{i + 1}</div>)}
                  </div>
                  <div className="diff-code-content">
                    {actualLines.map((line, i) => (
                      <div key={i} className={`diff-code-line ${line.diff === 'del' ? 'diff-del' : ''}`}>
                        {line.text || ' '}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="diff-panel-preview">
                <div className="diff-preview-message">
                  <div className="diff-preview-avatar user" />
                  <div className="diff-preview-body">
                    <div className="diff-preview-author">Samantha Adams</div>
                    <div className="diff-preview-text">Show me total orders by month</div>
                  </div>
                </div>
                <div className="diff-preview-message">
                  <div className="diff-preview-avatar agent" />
                  <div className="diff-preview-body">
                    <div className="diff-preview-author">Agent</div>
                    <div className="diff-preview-text">I found a table called Orders, and here is the Total Orders by Month.</div>
                    <div className="diff-preview-text muted">Would you like to make any changes? You can preview the Orders table, add other data tables, or change the visualization. Or investigate something different.</div>
                    <div className="diff-preview-chart">
                      {[38, 42, 49, 45, 51, 47, 50, 52, 48].map((v, i) => (
                        <div key={i} className="diff-preview-bar diff-preview-bar-red" style={{ height: `${(v / 52) * 100}%` }} />
                      ))}
                    </div>
                    <div className="diff-preview-labels">
                      {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep'].map((m, i) => (
                        <span key={i}>{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="diff-modal-footer">
          <div className="diff-footer-analysis">
            <div className="ai-analysis-header">
              <Sparkles size={14} />
              <span className="ai-analysis-title">Response Deviation Analysis</span>
            </div>
            <p className="ai-analysis-body">
              The agent correctly identified the ranking logic but used abbreviated number formatting (k-notation via ROUND/1000) instead of exact currency values. It also dropped NULLS LAST from the ORDER BY and used a different column path for the measure (Price_Amount vs Total_Price_Amount), causing a data mismatch.
            </p>
          </div>
          <div className="diff-footer-metrics">
            <div className="diff-metric-row">
              <span className="diff-metric-label">Response Type</span>
              <span className="diff-badge diff-badge-success">Same</span>
            </div>
            <div className="diff-metric-row">
              <span className="diff-metric-label">Data Response</span>
              <span className="diff-badge diff-badge-warning">Variance</span>
            </div>
            <div className="diff-metric-row">
              <span className="diff-metric-label">Query Logic</span>
              <span className="diff-badge diff-badge-warning">Variance</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

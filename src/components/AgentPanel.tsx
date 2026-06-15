import { useState } from 'react';
import { SparkleSingle, Send, AgentAstro } from './Icons';

export function AgentPanel() {
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="agent-panel">
      <div className="agent-panel-header">
        <SparkleSingle size={16} className="agent-panel-header-icon" />
        <span className="agent-panel-header-title">Calibration Assistant</span>
      </div>

      <div className="agent-panel-body">
        <div className="agent-panel-messages">
          <div className="agent-msg-row">
            <div className="agent-avatar">
              <AgentAstro size={20} />
            </div>
            <div className="agent-msg-bubble">
              <p className="agent-msg-text">Hi! Describe what you want to change in the query and I'll update the SQL for you.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="agent-panel-footer">
        <div className="agent-input-box">
          <input
            className="agent-input-text"
            placeholder="Describe the issue in more detail..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <div className="agent-input-footer-row">
            <button className="agent-input-send" aria-label="Send" disabled={!inputValue.trim()}>
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

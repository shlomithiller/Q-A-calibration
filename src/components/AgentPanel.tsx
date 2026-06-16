import { useEffect, useRef, useState } from 'react';
import { SparkleSingle, Send, AgentAstro } from './Icons';

interface Message {
  role: 'agent' | 'user';
  text: string;
}

interface AgentPanelProps {
  sqlValue?: string;
  onSqlChange?: (sql: string) => void;
}

type SqlTransform = (sql: string) => string;

interface AgentReply {
  text: string;
  transform?: SqlTransform;
}

function buildReply(userText: string, currentSql: string): AgentReply {
  const lower = userText.toLowerCase();

  if (lower.includes('limit') || lower.includes('row') || lower.includes('result')) {
    const match = userText.match(/\b(\d+)\b/);
    const n = match ? parseInt(match[1], 10) : 10;
    return {
      text: `Got it — I'll update the query to return ${n} rows instead.`,
      transform: (sql) => sql.replace(/LIMIT\s+\d+/i, `LIMIT ${n}`),
    };
  }

  if (lower.includes('last month') || lower.includes('previous month') || lower.includes('prior month')) {
    return {
      text: "Updated the date filter to scope the results to last month.",
      transform: (sql) =>
        sql.replace(
          /DATE_TRUNC\('quarter',\s*CURRENT_DATE\)\s*\+\s*INTERVAL\s*'\d+ months'/gi,
          (m, _offset, str) => {
            if (str.indexOf(m) < str.lastIndexOf(m)) {
              return `DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'`;
            }
            return `DATE_TRUNC('month', CURRENT_DATE)`;
          },
        ),
    };
  }

  if (lower.includes('this quarter') || lower.includes('current quarter')) {
    return {
      text: "Scoped the date filter to the current quarter.",
      transform: (sql) =>
        sql
          .replace(/DATE_TRUNC\('month'[^)]*\)\s*-\s*INTERVAL\s*'[^']+'/gi, `DATE_TRUNC('quarter', CURRENT_DATE)`)
          .replace(/DATE_TRUNC\('month'[^)]*\)/gi, `DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months'`),
    };
  }

  if (lower.includes('won') || lower.includes('closed won')) {
    return {
      text: "Added a filter to include only Closed Won opportunities.",
      transform: (sql) =>
        currentSql.toUpperCase().includes("LOWER(OPPORTUNITY.WON)")
          ? sql
          : sql.replace(/WHERE\s+/i, `WHERE\n    LOWER(Opportunity.Won) = 'true'\n    AND `),
    };
  }

  if (lower.includes('order') && (lower.includes('asc') || lower.includes('ascending'))) {
    return {
      text: "Changed the sort order to ascending.",
      transform: (sql) => sql.replace(/ORDER BY\s+(\S+)\s+DESC/i, 'ORDER BY $1 ASC'),
    };
  }

  if (lower.includes('order') && (lower.includes('desc') || lower.includes('descending'))) {
    return {
      text: "Changed the sort order to descending.",
      transform: (sql) => sql.replace(/ORDER BY\s+(\S+)\s+ASC/i, 'ORDER BY $1 DESC'),
    };
  }

  if (lower.includes('group by') || lower.includes('group') || lower.includes('segment')) {
    const col = lower.includes('type') ? 'opportunity_type'
      : lower.includes('source') ? 'source'
      : lower.includes('region') ? 'region'
      : 'segment';
    return {
      text: `I've added a GROUP BY on \`${col}\` to the query.`,
      transform: (sql) =>
        sql.includes('GROUP BY') ? sql : sql.replace(/ORDER BY/i, `GROUP BY\n  ${col}\nORDER BY`),
    };
  }

  if (lower.includes('add') && lower.includes('count')) {
    return {
      text: "Added a COUNT(*) column to the SELECT clause.",
      transform: (sql) => sql.replace(/^(SELECT\s+)/im, '$1COUNT(*) AS record_count,\n  '),
    };
  }

  if (lower.includes('remove') || lower.includes('delete') || lower.includes('drop')) {
    return {
      text: "I can help remove a clause, but please be more specific about which part to remove (e.g. \"remove the WHERE filter\" or \"remove the LIMIT\").",
    };
  }

  return {
    text: `I understand you want to: "${userText}". Here's what I can help with:\n\n• Change LIMIT / row count\n• Filter by date (last month, this quarter)\n• Change sort order (ASC/DESC)\n• Add or modify a GROUP BY\n• Filter for Closed Won deals\n\nCould you rephrase your request using one of those patterns?`,
  };
}

export function AgentPanel({ sqlValue = '', onSqlChange }: AgentPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'agent', text: 'Hi! Describe what you want to change in the query and I\'ll update the SQL for you.' },
  ]);
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setThinking(true);

    setTimeout(() => {
      const reply = buildReply(text, sqlValue);
      setThinking(false);
      setMessages((prev) => [...prev, { role: 'agent', text: reply.text }]);
      if (reply.transform && onSqlChange) {
        const updated = reply.transform(sqlValue);
        if (updated !== sqlValue) onSqlChange(updated);
      }
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="agent-panel">
      <div className="agent-panel-header">
        <SparkleSingle size={16} className="agent-panel-header-icon" />
        <span className="agent-panel-header-title">Calibration Assistant</span>
      </div>

      <div className="agent-panel-body">
        <div className="agent-panel-messages">
          {messages.map((msg, i) =>
            msg.role === 'agent' ? (
              <div key={i} className="agent-msg-row">
                <div className="agent-avatar">
                  <AgentAstro size={20} />
                </div>
                <div className="agent-msg-bubble">
                  <p className="agent-msg-text">{msg.text}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="agent-msg-row agent-msg-row-user" style={{ justifyContent: 'flex-end' }}>
                <div className="agent-msg-bubble" style={{ background: 'var(--color-brand)', maxWidth: '85%' }}>
                  <p className="agent-msg-text" style={{ color: '#fff' }}>{msg.text}</p>
                </div>
              </div>
            )
          )}
          {thinking && (
            <div className="agent-msg-row">
              <div className="agent-avatar">
                <AgentAstro size={20} />
              </div>
              <div className="agent-msg-bubble">
                <div className="agent-thinking">
                  <span className="thinking-dots">
                    <span>·</span><span>·</span><span>·</span>
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="agent-panel-footer">
        <div className="agent-input-box">
          <input
            className="agent-input-text"
            placeholder="Describe the issue in more detail..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="agent-input-footer-row">
            <button
              className="agent-input-send"
              aria-label="Send"
              disabled={!inputValue.trim() || thinking}
              onClick={handleSend}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

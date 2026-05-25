interface QueryPanelProps {
  sql: string;
}

const KEYWORDS = new Set([
  'WITH',
  'AS',
  'SELECT',
  'FROM',
  'WHERE',
  'ORDER',
  'BY',
  'GROUP',
  'OVER',
  'DESC',
  'ASC',
  'NULLS',
  'LAST',
  'FIRST',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'AND',
  'OR',
  'NOT',
  'IN',
  'IS',
  'NULL',
  'BETWEEN',
  'INTERVAL',
  'HAVING',
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'OUTER',
  'ON',
  'INTO',
  'UNION',
  'ALL',
  'DISTINCT',
  'LIMIT',
  'OFFSET',
]);

const FUNCTIONS = new Set([
  'ROW_NUMBER',
  'SUM',
  'AVG',
  'COUNT',
  'MIN',
  'MAX',
  'SEMANTIC_VIEW',
  'DIMENSIONS',
  'MEASURES',
  'DATE_TRUNC',
  'CURRENT_DATE',
]);

function highlight(line: string): React.ReactNode {
  const tokens = line.split(/(\s+|[(),;])/);
  return tokens.map((t, i) => {
    if (!t) return null;
    if (KEYWORDS.has(t.toUpperCase())) {
      return (
        <span key={i} className="kw">
          {t}
        </span>
      );
    }
    if (FUNCTIONS.has(t.toUpperCase())) {
      return (
        <span key={i} className="fn">
          {t}
        </span>
      );
    }
    if (/^'.*'$/.test(t) || /^".*"$/.test(t)) {
      return (
        <span key={i} className="str">
          {t}
        </span>
      );
    }
    if (/^\d+$/.test(t)) {
      return (
        <span key={i} className="num">
          {t}
        </span>
      );
    }
    if (/^[(),;]$/.test(t)) {
      return (
        <span key={i} className="punct">
          {t}
        </span>
      );
    }
    return <span key={i}>{t}</span>;
  });
}

export function QueryPanel({ sql }: QueryPanelProps) {
  const lines = sql.split('\n');
  return (
    <div className="code-editor">
      <div className="line-numbers">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <div className="code">
        {lines.map((line, i) => (
          <div key={i}>{highlight(line) || '\u00a0'}</div>
        ))}
      </div>
    </div>
  );
}

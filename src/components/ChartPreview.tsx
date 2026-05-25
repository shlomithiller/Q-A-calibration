import type { ChartPoint } from '../data/questions';

interface ChartPreviewProps {
  data: ChartPoint[];
  yAxisLabel: string;
  xAxisLabel: string;
}

export function ChartPreview({ data, yAxisLabel, xAxisLabel }: ChartPreviewProps) {
  const max = Math.max(...data.map((d) => d.value));
  const ticks = 5;
  const stepValue = Math.ceil(max / ticks / 5) * 5 || 1;
  const tickValues: number[] = [];
  for (let i = 0; i <= ticks; i++) tickValues.push(i * stepValue);
  const chartMax = tickValues[tickValues.length - 1] || 1;

  return (
    <div className="chart">
      <div style={{ position: 'relative', paddingLeft: 8 }}>
        <div className="chart-canvas">
          {tickValues.map((v) => {
            const pct = (v / chartMax) * 100;
            return (
              <div
                key={v}
                className="y-tick"
                style={{ bottom: `${pct}%` }}
              >
                {v}
              </div>
            );
          })}
          <div
            className="chart-y-label"
            style={{
              position: 'absolute',
              left: -32,
              top: '50%',
              transform: 'translateY(-50%) rotate(-90deg)',
              transformOrigin: 'center',
            }}
          >
            {yAxisLabel} ↓
          </div>
          {data.map((d) => (
            <div
              key={d.label}
              className="chart-bar"
              style={{ height: `${(d.value / chartMax) * 100}%` }}
              title={`${d.label}: ${d.value}`}
            />
          ))}
        </div>
        <div className="chart-x-axis">
          {data.map((d) => (
            <span key={d.label}>{d.label}</span>
          ))}
        </div>
        <div
          style={{
            textAlign: 'center',
            paddingLeft: 32,
            marginTop: 4,
            fontSize: 12,
            color: 'var(--color-on-surface-1)',
          }}
        >
          {xAxisLabel} ↓
        </div>
      </div>
    </div>
  );
}

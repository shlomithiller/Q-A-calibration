import { Plus } from './Icons';

interface TestSuite {
  id: string;
  name: string;
  description: string;
  agent: string;
  lastRun: string;
  passRate: number;
  status: 'Completed' | 'Processing';
}

const MOCK_SUITES: TestSuite[] = [
  { id: 'ts1', name: 'Q4 Revenue Regression', description: 'Revenue metrics accuracy test', agent: 'Concierge Sales', lastRun: '2 hours ago', passRate: 100, status: 'Completed' },
  { id: 'ts2', name: 'Lead Funnel Accuracy', description: 'Lead conversion and funnel queries', agent: 'Concierge Sales', lastRun: '5 hours ago', passRate: 94, status: 'Completed' },
  { id: 'ts3', name: 'Customer 360 Baseline', description: 'Core C360 model queries', agent: 'Concierge Sales', lastRun: '1 day ago', passRate: 100, status: 'Completed' },
  { id: 'ts4', name: 'Marketing Metrics', description: 'Campaign and channel attribution', agent: 'Concierge Sales', lastRun: '2 days ago', passRate: 100, status: 'Completed' },
  { id: 'ts5', name: 'Support KPIs', description: 'Ticket resolution and SLA queries', agent: 'Concierge Sales', lastRun: '3 days ago', passRate: 87, status: 'Completed' },
];

interface TestSuitesListProps {
  onOpenSuite: (id: string) => void;
  onNewTest: () => void;
  recentTestId?: string;
  recentTestName?: string;
}

function getPassRateClass(rate: number): string {
  if (rate === 100) return 'ts-pass-rate-full';
  if (rate >= 90) return 'ts-pass-rate-high';
  return 'ts-pass-rate-low';
}

export function TestSuitesList({ onOpenSuite, onNewTest, recentTestId, recentTestName }: TestSuitesListProps) {
  const suites: TestSuite[] = recentTestId
    ? [{ id: recentTestId, name: recentTestName || 'My Batch Test', description: 'Regression test for selected questions', agent: 'Concierge Sales', lastRun: 'Just now', passRate: 80, status: 'Completed' }, ...MOCK_SUITES]
    : MOCK_SUITES;

  return (
    <div className="test-suites-list">
      <div className="ts-header">
        <h1 className="ts-title">Q&A Calibration Test Suites</h1>
        <button className="btn btn-brand" onClick={onNewTest}>
          <Plus size={14} /> New Test
        </button>
      </div>

      <div className="ts-table-card">
        <div className="ts-toolbar">
          <span>{suites.length} test suites</span>
        </div>
        <div className="ts-table-wrap">
          <table className="ts-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Agent</th>
                <th>Last Run</th>
                <th>Pass Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {suites.map((s) => (
                <tr key={s.id} onClick={() => onOpenSuite(s.id)}>
                  <td className="ts-col-name">
                    <a href="#" onClick={(e) => { e.preventDefault(); onOpenSuite(s.id); }}>
                      {s.name}
                    </a>
                  </td>
                  <td className="ts-col-desc">{s.description}</td>
                  <td>{s.agent}</td>
                  <td>{s.lastRun}</td>
                  <td>
                    <span className={`ts-pass-rate ${getPassRateClass(s.passRate)}`}>
                      {s.passRate}%
                    </span>
                  </td>
                  <td className="ts-col-status">
                    {s.status === 'Processing' && <span className="ts-spinner" />}
                    <span>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

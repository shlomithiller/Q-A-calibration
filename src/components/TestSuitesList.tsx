import { useMemo, useState } from 'react';
import { ChevronDown, FilterIcon, Refresh, Search } from './Icons';

interface TestSuite {
  id: string;
  name: string;
  description: string;
  agent: string;
  endRun: string;
  runBy: string;
  passed: number;
  status: 'Completed' | 'In progress';
}

const MOCK_SUITES: TestSuite[] = [
  { id: 'my-batch', name: 'My Batch Test', description: 'Lorem ipsum dolor sit amet, consectetur a...', agent: 'Concierge Sales', endRun: 'Just now', runBy: 'Harry Anderson', passed: 80, status: 'Completed' },
  { id: 'docutaggin', name: 'DocuTaggin Evaluator', description: 'Aliquam pulvinar vestibulum blandit. Done...', agent: 'Concierge Sales', endRun: '2 hours ago', runBy: 'Yolanda Singh', passed: 80, status: 'Completed' },
  { id: 'flowpilot', name: 'FlowPilot AI', description: 'Donec sed erat ut magna suscipit mattis. A...', agent: 'Concierge Marketing', endRun: '4 hours ago', runBy: 'Samantha Adams', passed: 95, status: 'Completed' },
  { id: 'conversational', name: 'Conversationalnten', description: 'Lorem ipsum dolor sit amet, consectetur a...', agent: 'Concierge Marketing', endRun: '1 days ago', runBy: 'Gary Krompart', passed: 100, status: 'Completed' },
  { id: 'relevia', name: 'Relevia.ai', description: 'In a laoreet purus. Integer turpis quam, lao...', agent: 'Concierge Sales', endRun: '2 days ago', runBy: 'Gary Krompart', passed: 45, status: 'Completed' },
  { id: 'insight', name: 'InsightMatter.ai', description: 'Lorem ipsum dolor sit amet, consectetur a...', agent: 'Concierge Marketing', endRun: '3 days ago', runBy: 'Samantha Adams', passed: 50, status: 'Completed' },
  { id: 'chainlift', name: 'ChainLift AI', description: 'Vestibulum eu quam nec neque pellentesq...', agent: 'Concierge', endRun: '1 days ago', runBy: 'Harry Anderson', passed: 0, status: 'Completed' },
];

const AVATAR_COLOR: Record<string, string> = {
  'Harry Anderson': '#7F8CED',
  'Yolanda Singh': '#0B827C',
  'Samantha Adams': '#9050E9',
  'Gary Krompart': '#E3066A',
};

interface TestSuitesListProps {
  onOpenSuite: (id: string) => void;
  onNewTest: () => void;
  onAutoCalibrate?: () => void;
  recentTestId?: string;
  recentTestName?: string;
}

function passClass(passed: number): string {
  if (passed >= 80) return 'ts-pass-rate-full';
  if (passed >= 40) return 'ts-pass-rate-high';
  return 'ts-pass-rate-low';
}

export function TestSuitesList({ onOpenSuite, onNewTest, recentTestId, recentTestName }: TestSuitesListProps) {
  const [removed, setRemoved] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [agent, setAgent] = useState('any');

  const suites = useMemo(() => {
    const created: TestSuite[] = recentTestId
      ? [{
          id: recentTestId,
          name: recentTestName || 'My Batch Test',
          description: 'Regression test for selected questions',
          agent: 'Concierge Sales',
          endRun: 'Just now',
          runBy: 'Harry Anderson',
          passed: 80,
          status: 'Completed',
        }]
      : [];
    return [...created, ...MOCK_SUITES].filter((suite) => !removed.includes(suite.id));
  }, [recentTestId, recentTestName, removed]);

  const visible = suites.filter((suite) => {
    if (agent !== 'any' && suite.agent !== agent) return false;
    if (query.trim() && !suite.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  const completed = suites.filter((suite) => suite.status === 'Completed').length;
  const inProgress = suites.length - completed;
  const allChecked = visible.length > 0 && visible.every((suite) => selected.includes(suite.id));

  const toggle = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const deleteSelected = () => {
    if (selected.length === 0) return;
    setRemoved((current) => [...current, ...selected]);
    setSelected([]);
  };

  return (
    <div className="test-suites-list">
      <div className="ts-crumb">Home <span aria-hidden>›</span> Page</div>
      <div className="ts-header">
        <h1 className="ts-title">All Test Suites</h1>
        <div className="ts-header-actions">
          <button type="button" className="btn btn-outlined" onClick={deleteSelected} disabled={selected.length === 0}>
            Delete Suite
          </button>
          <button type="button" className="btn btn-brand" onClick={onNewTest}>
            New Test
          </button>
        </div>
      </div>

      <div className="ts-table-card">
        <div className="ts-toolbar">
          <span>{suites.length} tests Suites • {completed} completed • {inProgress} in progress</span>
          <div className="ts-tools">
            <label className="ac-select">
              <span className="sr-only">Agent</span>
              <select value={agent} onChange={(e) => setAgent(e.target.value)} aria-label="Agent">
                <option value="any">Any agent</option>
                <option>Concierge Sales</option>
                <option>Concierge Marketing</option>
                <option>Concierge</option>
              </select>
              <ChevronDown size={12} />
            </label>
            <label className="ac-search">
              <Search size={14} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." aria-label="Search test suites" />
            </label>
            <button type="button" className="ts-icon-btn" aria-label="Refresh" onClick={() => { setQuery(''); setAgent('any'); }}>
              <Refresh size={14} />
            </button>
            <button type="button" className="ts-icon-btn" aria-label="Filter">
              <FilterIcon size={14} />
            </button>
          </div>
        </div>
        <div className="ts-table-wrap">
          <table className="ts-table">
            <thead>
              <tr>
                <th className="ts-check">
                  <input
                    type="checkbox"
                    aria-label="Select all test suites"
                    checked={allChecked}
                    onChange={() => setSelected(allChecked ? [] : visible.map((suite) => suite.id))}
                  />
                </th>
                <th>Test Name</th>
                <th>Description</th>
                <th>Agent</th>
                <th>Run by</th>
                <th>End Run</th>
                <th>Pass Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((suite) => (
                <tr key={suite.id}>
                  <td className="ts-check">
                    <input
                      type="checkbox"
                      aria-label={`Select ${suite.name}`}
                      checked={selected.includes(suite.id)}
                      onChange={() => toggle(suite.id)}
                    />
                  </td>
                  <td className="ts-col-name">
                    <a href="#" onClick={(e) => { e.preventDefault(); onOpenSuite(suite.id); }}>
                      {suite.name}
                    </a>
                  </td>
                  <td className="ts-col-desc">{suite.description}</td>
                  <td>{suite.agent}</td>
                  <td className="ts-col-user">
                    <span className="ts-user-cell">
                      <span className="ts-user-avatar" style={{ background: AVATAR_COLOR[suite.runBy] ?? '#7F8CED' }}>
                        {suite.runBy.split(' ').map((part) => part[0]).join('')}
                      </span>
                      <span>{suite.runBy}</span>
                    </span>
                  </td>
                  <td>{suite.endRun}</td>
                  <td>
                    <span className={`ts-pass-rate ${passClass(suite.passed)}`}>{suite.passed}/100</span>
                  </td>
                  <td>{suite.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

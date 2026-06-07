import { useState } from 'react';
import type { Question } from '../data/questions';
import { Close, Search, ArrowLeft } from './Icons';

type Step = 'select-questions' | 'configure';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface CreateTestModalProps {
  questions: Question[];
  onClose: () => void;
  onCreate: (name: string, description: string, questionIds: string[]) => void;
}

export function CreateTestModal({ questions, onClose, onCreate }: CreateTestModalProps) {
  const [step, setStep] = useState<Step>('select-questions');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [testName, setTestName] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [frequency, setFrequency] = useState(1);
  const [frequencyUnit, setFrequencyUnit] = useState<'day' | 'week' | 'month'>('week');
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set([4]));
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);

  const filtered = questions.filter((q) => {
    if (!search) return true;
    return q.text.toLowerCase().includes(search.toLowerCase());
  });

  const allChecked = filtered.length > 0 && filtered.every((q) => selected.has(q.id));

  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(filtered.map((q) => q.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleDay = (idx: number) => {
    const next = new Set(activeDays);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setActiveDays(next);
  };

  const handleNext = () => {
    setStep('configure');
  };

  const handleCreate = () => {
    onCreate(testName, testDescription, Array.from(selected));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close">
          <Close size={14} />
        </button>

        <div className="modal-header">
          <h2 className="modal-title">Create Test Suite</h2>
        </div>

        {step === 'select-questions' && (
          <>
            <div className="modal-body">
              <p className="modal-section-title">Add questions from the Golden Dataset to test</p>
              <div className="modal-table-container">
                <div className="modal-filter-bar">
                  <div className="modal-filters-left">
                    <div className="modal-filter-group">
                      <label className="modal-filter-label">Source</label>
                      <select className="modal-select">
                        <option>All Sources</option>
                      </select>
                    </div>
                    <div className="modal-filter-group">
                      <label className="modal-filter-label">Semantic Model</label>
                      <select className="modal-select">
                        <option>All Semantic Models</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-search">
                    <Search size={14} />
                    <input
                      placeholder="Search questions..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-table-scroll">
                  <table className="modal-table">
                    <thead>
                      <tr>
                        <th className="col-check">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={toggleAll}
                          />
                        </th>
                        <th>Questions</th>
                        <th>Source</th>
                        <th>Semantic Model</th>
                        <th>Last Modified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((q) => (
                        <tr
                          key={q.id}
                          className={selected.has(q.id) ? 'row-selected' : ''}
                          onClick={() => toggleOne(q.id)}
                        >
                          <td className="col-check" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected.has(q.id)}
                              onChange={() => toggleOne(q.id)}
                            />
                          </td>
                          <td className="col-question-text">{q.text}</td>
                          <td>{q.source}</td>
                          <td>{q.semanticModel}</td>
                          <td>{q.lastModified}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            {selected.size > 0 && (
              <div className="modal-selection-banner">
                <span className="selection-count">{selected.size} Selected</span>
                <span className="selection-action">Show Selected</span>
                <span className="selection-action" onClick={() => setSelected(new Set())}>Clear Selection</span>
              </div>
            )}
            <div className="modal-footer">
              <button className="btn-pill-outline" onClick={onClose}>Cancel</button>
              <button
                className="btn-pill-brand"
                disabled={selected.size === 0}
                onClick={handleNext}
              >
                Next
              </button>
            </div>
          </>
        )}

        {step === 'configure' && (
          <>
            <div className="modal-body">
              <div className="modal-config-card">
                <div className="modal-config-card-header">
                  <p className="modal-config-card-title">Test Information</p>
                  <p className="modal-config-card-subtitle">Enter a test name and enter a description that outlines the purpose of your test.</p>
                </div>
                <div className="modal-config-card-body">
                  <div className="modal-field">
                    <label className="modal-field-label">Test Name</label>
                    <input
                      className="modal-input"
                      placeholder="My Batch Test"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                    />
                  </div>
                  <div className="modal-field">
                    <label className="modal-field-label">Description</label>
                    <textarea
                      className="modal-textarea"
                      placeholder="Enter a description..."
                      value={testDescription}
                      onChange={(e) => setTestDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-config-card">
                <div className="modal-config-card-row">
                  <div className="modal-config-card-header">
                    <p className="modal-config-card-title">Scheduling</p>
                    <p className="modal-config-card-subtitle">Automatically run this test on a recurring schedule to catch regressions early.</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={scheduleEnabled}
                      onChange={(e) => setScheduleEnabled(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
                {scheduleEnabled && (
                  <div className="modal-config-card-body">
                    <div className="scheduler-section">
                      <div className="scheduler-row">
                        <label>Repeat every</label>
                        <input
                          type="number"
                          className="scheduler-number-input"
                          value={frequency}
                          min={1}
                          onChange={(e) => setFrequency(Number(e.target.value))}
                        />
                        <select
                          className="scheduler-frequency-select"
                          value={frequencyUnit}
                          onChange={(e) => setFrequencyUnit(e.target.value as 'day' | 'week' | 'month')}
                        >
                          <option value="day">day</option>
                          <option value="week">week</option>
                          <option value="month">month</option>
                        </select>
                      </div>
                      {frequencyUnit === 'week' && (
                        <div className="scheduler-row">
                          <label>Repeat on</label>
                          <div className="scheduler-days">
                            {DAYS.map((day, idx) => (
                              <button
                                key={idx}
                                type="button"
                                className={`scheduler-day ${activeDays.has(idx) ? 'active' : ''}`}
                                onClick={() => toggleDay(idx)}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="scheduler-row">
                        <label>Time</label>
                        <input
                          type="number"
                          className="scheduler-number-input"
                          value={hour}
                          min={0}
                          max={23}
                          onChange={(e) => setHour(Number(e.target.value))}
                        />
                        <span className="scheduler-colon">:</span>
                        <input
                          type="number"
                          className="scheduler-number-input"
                          value={minute.toString().padStart(2, '0')}
                          min={0}
                          max={59}
                          step={5}
                          onChange={(e) => setMinute(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer modal-footer-split">
              <div className="modal-footer-left">
                <button className="btn-pill-outline" onClick={() => setStep('select-questions')}>
                  <ArrowLeft size={14} /> Back
                </button>
              </div>
              <div className="modal-footer-right">
                <button className="btn-pill-outline" onClick={onClose}>Cancel</button>
                <button
                  className="btn-pill-brand"
                  disabled={testName.trim().length === 0}
                  onClick={handleCreate}
                >
                  Create
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

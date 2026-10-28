import { useEffect, useRef, useState } from 'react';
import { Close, Database, Upload } from './Icons';
import { parseQuestionCsv, type ParsedQuestionRow, type QuestionCsvParseResult } from '../lib/parseQuestionCsv';
import { semanticModels } from '../data/semanticModels';
import type { Question } from '../data/questions';

interface UploadQuestionsModalProps {
  questions: Question[];
  onClose: () => void;
  onInsert: (rows: ParsedQuestionRow[], duplicateCount: number) => void;
}

export function UploadQuestionsModal({ questions, onClose, onInsert }: UploadQuestionsModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const headerCheckRef = useRef<HTMLInputElement>(null);
  const ignoreBackdropUntil = useRef(0);
  const [modelId, setModelId] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileText, setFileText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<QuestionCsvParseResult | null>(null);
  const [deselected, setDeselected] = useState<Set<number>>(new Set());

  const selectedModel = semanticModels.find((model) => model.id === modelId);
  const rows = result?.rows ?? [];
  const visibleRows = rows.filter((row) => row.status !== 'failed');
  const readyRows = rows.filter((row) => row.status === 'ready');
  const duplicateCount = rows.filter((row) => row.status === 'duplicate').length;
  const readyLines = readyRows.map((row) => row.line);
  const isReadyChecked = (line: number) => !deselected.has(line);
  const selectedReadyCount = readyLines.filter((line) => isReadyChecked(line)).length;
  const allReadyChecked = readyLines.length > 0 && selectedReadyCount === readyLines.length;

  useEffect(() => {
    if (headerCheckRef.current) {
      headerCheckRef.current.indeterminate = selectedReadyCount > 0 && !allReadyChecked;
    }
  }, [selectedReadyCount, allReadyChecked]);

  const openPicker = () => {
    if (!selectedModel) return;
    ignoreBackdropUntil.current = Date.now() + 1500;
    fileRef.current?.click();
  };

  const previewCsv = (text: string, displayName: string) => {
    const parsed = parseQuestionCsv(
      text,
      questions.map((question) => ({ text: question.text, semanticModel: question.semanticModel })),
      displayName,
    );
    const usable = parsed.rows.some((row) => row.status !== 'failed');
    if (parsed.error || !usable) {
      setResult(parsed.error ? parsed : { ...parsed, error: 'The file has no question rows.' });
      return;
    }
    setResult(parsed);
    setDeselected(new Set());
  };

  const takeFile = async (file: File) => {
    if (!selectedModel) return;
    ignoreBackdropUntil.current = Date.now() + 600;
    const text = await file.text();
    setFileName(file.name);
    setFileText(text);
    previewCsv(text, selectedModel.displayName);
  };

  const toggleAllReady = () => {
    setDeselected(allReadyChecked ? new Set(readyLines) : new Set());
  };

  const toggleReady = (line: number) => {
    setDeselected((current) => {
      const next = new Set(current);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  };

  const addSelected = () => {
    const chosen = readyRows.filter((row) => isReadyChecked(row.line));
    if (chosen.length === 0) return;
    onInsert(chosen, duplicateCount);
    onClose();
  };

  const showReview = Boolean(result && !result.error && visibleRows.length > 0);

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (Date.now() < ignoreBackdropUntil.current) return;
        onClose();
      }}
    >
      <div className={`upload-modal ${showReview ? 'is-review' : ''}`} onClick={(event) => event.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close" type="button">
          <Close size={14} />
        </button>
        {showReview ? (
          <>
            <h2 className="upload-modal-title">Select Questions</h2>
            <div className="upload-modal-rule" />
            <div className="csv-review">
              <div className="csv-review-card">
                <p className="csv-review-model">Model - {selectedModel?.displayName}</p>
                <p className="csv-review-summary">
                  {readyRows.length} ready · {duplicateCount} duplicates
                </p>
                <div className="csv-review-scroll">
                <table className="csv-review-table">
                  <thead>
                    <tr>
                      <th className="col-check">
                        <input
                          ref={headerCheckRef}
                          type="checkbox"
                          aria-label="Select all ready questions"
                          checked={allReadyChecked}
                          disabled={readyLines.length === 0}
                          onChange={toggleAllReady}
                        />
                      </th>
                      <th>Questions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => {
                      const alreadyExists = row.status === 'duplicate';
                      const locked = alreadyExists;
                      const checked = alreadyExists || (row.status === 'ready' && isReadyChecked(row.line));
                      return (
                        <tr key={row.line} className={locked ? 'is-locked' : undefined} title={row.reason}>
                          <td className="col-check">
                            <input
                              type="checkbox"
                              aria-label={row.utterance || `Row ${row.line}`}
                              checked={checked}
                              disabled={locked}
                              onChange={() => {
                                if (!locked) toggleReady(row.line);
                              }}
                            />
                          </td>
                          <td>{row.utterance || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
            <div className="upload-modal-footer">
              <button type="button" className="btn-pill-outline" onClick={() => setResult(null)}>Back</button>
              <div className="upload-modal-footer-actions">
                <button type="button" className="btn-pill-outline" onClick={onClose}>Cancel</button>
                <button type="button" className="btn-pill-brand" disabled={selectedReadyCount === 0} onClick={addSelected}>
                  Add
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="upload-modal-title">Upload Questions</h2>
            <p className="upload-modal-subtitle">
              Ensure your CSV file includes an <strong>Utterance</strong> column. Questions are added to the semantic model you select.
            </p>
            <div className="upload-modal-rule" />
            <div className="upload-modal-body">
              <label className="upload-model-field">
                <span>Semantic Model</span>
                <span className={`upload-model-select ${selectedModel ? 'has-icon' : ''}`}>
                  {selectedModel && (
                    <span className="upload-model-icon" aria-hidden>
                      <Database size={12} />
                    </span>
                  )}
                  <select
                    value={modelId}
                    onChange={(event) => setModelId(event.target.value)}
                    aria-label="Semantic Model"
                  >
                    <option value="">Select Model</option>
                    {semanticModels.map((model) => (
                      <option key={model.id} value={model.id}>{model.displayName}</option>
                    ))}
                  </select>
                </span>
              </label>
              <div
                className={`upload-dropzone ${dragging ? 'is-dragging' : ''} ${selectedModel ? '' : 'is-disabled'}`}
                onDragOver={(event) => {
                  if (!selectedModel) return;
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  if (!selectedModel) return;
                  const file = event.dataTransfer.files?.[0];
                  if (file) void takeFile(file);
                }}
              >
                <button type="button" className="upload-csv-btn" disabled={!selectedModel} onClick={openPicker}>
                  <Upload size={14} />
                  Upload CSV
                </button>
                <p>{fileName || 'or drop CSV'}</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void takeFile(file);
                    event.target.value = '';
                  }}
                />
              </div>
              {result?.error && <p className="upload-questions-error">{result.error}</p>}
            </div>
            <div className="upload-modal-footer">
              <button type="button" className="btn-pill-outline" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="btn-pill-brand"
                disabled={!selectedModel || !fileText}
                onClick={() => {
                  if (selectedModel && fileText) previewCsv(fileText, selectedModel.displayName);
                }}
              >
                Upload
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

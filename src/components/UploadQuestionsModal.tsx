import { useEffect, useRef, useState } from 'react';
import { Close, Copy, Database, Upload } from './Icons';
import { parseQuestionCsv, type ParsedQuestionRow, type QuestionCsvParseResult } from '../lib/parseQuestionCsv';
import { semanticModels } from '../data/semanticModels';
import type { Question } from '../data/questions';

interface UploadQuestionsModalProps {
  questions: Question[];
  onClose: () => void;
  onInsert: (rows: ParsedQuestionRow[]) => void;
}

export function UploadQuestionsModal({ questions, onClose, onInsert }: UploadQuestionsModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const headerCheckRef = useRef<HTMLInputElement>(null);
  const ignoreBackdropUntil = useRef(0);
  const [fileName, setFileName] = useState('');
  const [fileText, setFileText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [showLookup, setShowLookup] = useState(false);
  const [lookupId, setLookupId] = useState('');
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<QuestionCsvParseResult | null>(null);
  const [deselected, setDeselected] = useState<Set<number>>(new Set());

  const rows = result?.rows ?? [];
  const readyRows = rows.filter((row) => row.status === 'ready');
  const failedCount = rows.filter((row) => row.status === 'failed').length;
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
    ignoreBackdropUntil.current = Date.now() + 1500;
    fileRef.current?.click();
  };

  const previewCsv = (text: string) => {
    const parsed = parseQuestionCsv(
      text,
      questions.map((question) => ({ text: question.text, semanticModel: question.semanticModel })),
    );
    if (parsed.error || parsed.rows.length === 0) {
      setResult(parsed.error ? parsed : { ...parsed, error: 'The file has no question rows.' });
      return;
    }
    setResult(parsed);
    setDeselected(new Set());
  };

  const takeFile = async (file: File) => {
    ignoreBackdropUntil.current = Date.now() + 600;
    const text = await file.text();
    setFileName(file.name);
    setFileText(text);
    previewCsv(text);
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
    onInsert(chosen);
    onClose();
  };

  const selectedModel = semanticModels.find((model) => model.id === lookupId);
  const showReview = Boolean(result && !result.error && rows.length > 0);

  const copyApiName = async () => {
    if (!selectedModel) return;
    await navigator.clipboard.writeText(selectedModel.apiName);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

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
              <p className="csv-review-summary">
                {readyRows.length} ready · {failedCount} failed · {duplicateCount} duplicate{duplicateCount === 1 ? '' : 's'}
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
                      <th>Semantic Model</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const isError = row.status === 'failed';
                      const alreadyExists = row.status === 'duplicate';
                      const locked = isError || alreadyExists;
                      const checked = alreadyExists || (row.status === 'ready' && isReadyChecked(row.line));
                      return (
                        <tr key={row.line} className={locked ? 'is-locked' : undefined}>
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
                          <td>{row.displayName || row.sdmInput || '—'}</td>
                          <td>{row.status === 'ready' ? 'Ready' : row.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="upload-modal-footer">
              <button type="button" className="btn-pill-outline" onClick={onClose}>Cancel</button>
              <button type="button" className="btn-pill-brand" disabled={selectedReadyCount === 0} onClick={addSelected}>
                Add
              </button>
            </div>
          </>
        ) : (
          <>
        <h2 className="upload-modal-title">Upload Questions</h2>
        <p className="upload-modal-subtitle">
          Ensure your CSV file includes two columns: Utterance and Semantic Model ID (or Semantic Model API Name)
        </p>
        <div className="upload-modal-rule" />
        <div className="upload-modal-body">
          <div
            className={`upload-dropzone ${dragging ? 'is-dragging' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void takeFile(file);
            }}
          >
            <button type="button" className="upload-csv-btn" onClick={openPicker}>
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
          <div className="upload-info-banner">
            <span className="upload-info-icon" aria-hidden>i</span>
            <span>
              Find my model&apos;s api name{' '}
              <button type="button" className="upload-info-link" onClick={() => setShowLookup(true)}>
                show me
              </button>
            </span>
          </div>
        </div>
        <div className="upload-modal-footer">
          <button type="button" className="btn-pill-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-pill-brand" disabled={!fileText} onClick={() => previewCsv(fileText)}>
            Upload
          </button>
        </div>
          </>
        )}
      </div>
      {showLookup && (
        <div
          className="modal-backdrop api-lookup-backdrop"
          onClick={(event) => {
            event.stopPropagation();
            setShowLookup(false);
          }}
        >
          <div className="api-lookup-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowLookup(false)} aria-label="Close" type="button">
              <Close size={14} />
            </button>
            <h2 className="upload-modal-title">Get Semantic Model API Name</h2>
            <div className="upload-modal-rule" />
            <div className="api-lookup-body">
              <label className="add-question-field">
                <span>Semantic Model</span>
                <span className="api-lookup-select">
                  {selectedModel && (
                    <span className="api-lookup-model-icon" aria-hidden>
                      <Database size={12} />
                    </span>
                  )}
                  <select
                    value={lookupId}
                    onChange={(event) => {
                      setLookupId(event.target.value);
                      setCopied(false);
                    }}
                  >
                    <option value="">Select a model</option>
                    {semanticModels.map((model) => (
                      <option key={model.id} value={model.id}>{model.displayName}</option>
                    ))}
                  </select>
                </span>
              </label>
              <label className="add-question-field">
                <span>Model&apos;s API</span>
                <span className="api-lookup-value">
                  <input
                    readOnly
                    value={selectedModel?.apiName ?? ''}
                    placeholder="For example : sales_csv_model"
                    aria-label="Model API name"
                  />
                  <button
                    type="button"
                    className="api-lookup-copy"
                    disabled={!selectedModel}
                    onClick={() => { void copyApiName(); }}
                    aria-label={copied ? 'Copied' : 'Copy API name'}
                  >
                    <Copy size={16} />
                  </button>
                </span>
                {copied && <span className="api-lookup-copied">Copied</span>}
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

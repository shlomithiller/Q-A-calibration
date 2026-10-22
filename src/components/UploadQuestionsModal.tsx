import { useRef, useState } from 'react';
import { Close } from './Icons';
import { parseQuestionCsv, type ParsedQuestionRow } from '../lib/parseQuestionCsv';
import type { Question } from '../data/questions';

interface UploadQuestionsModalProps {
  questions: Question[];
  onClose: () => void;
  onInsert: (rows: ParsedQuestionRow[]) => void;
}

export function UploadQuestionsModal({ questions, onClose, onInsert }: UploadQuestionsModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [rows, setRows] = useState<ParsedQuestionRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const readyRows = rows.filter((row) => row.status === 'ready');
  const failedCount = rows.filter((row) => row.status === 'failed').length;
  const duplicateCount = rows.filter((row) => row.status === 'duplicate').length;
  const readyLines = readyRows.map((row) => row.line);
  const allReadyChecked = readyLines.length > 0 && readyLines.every((line) => selected.has(line));

  const toggleAll = () => {
    setSelected(allReadyChecked ? new Set() : new Set(readyLines));
  };

  const toggleOne = (line: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseQuestionCsv(
      text,
      questions.map((question) => ({ text: question.text, semanticModel: question.semanticModel })),
    );
    setFileName(file.name);
    setError(parsed.error ?? '');
    setRows(parsed.rows);
    setSelected(new Set(parsed.rows.filter((row) => row.status === 'ready').map((row) => row.line)));
  };

  const insert = () => {
    const chosen = rows.filter((row) => row.status === 'ready' && selected.has(row.line));
    if (chosen.length === 0) return;
    onInsert(chosen);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close" type="button">
          <Close size={14} />
        </button>
        <div className="modal-header">
          <h2 className="modal-title">Upload Questions</h2>
        </div>
        <div className="modal-body">
          <div className="upload-questions-copy">
            <p>Upload questions only. Verified questions are not part of this upload.</p>
            <p>The CSV needs a header row and these columns:</p>
            <ul>
              <li><strong>Utterance</strong> — the question text</li>
              <li><strong>SDM</strong> — the SDM id or API name. A display name will not match.</li>
            </ul>
          </div>
          <div className="upload-questions-file">
            <button type="button" className="btn btn-outlined" onClick={() => fileRef.current?.click()}>
              Choose CSV
            </button>
            <span>{fileName || 'No file selected'}</span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                event.target.value = '';
              }}
            />
          </div>
          {error && <p className="upload-questions-error">{error}</p>}
          {rows.length > 0 && (
            <>
              <p className="upload-questions-summary">
                {readyRows.length} ready · {failedCount} failed · {duplicateCount} duplicate{duplicateCount === 1 ? '' : 's'}
              </p>
              <div className="modal-table-container">
                <div className="modal-table-scroll">
                  <table className="modal-table">
                    <thead>
                      <tr>
                        <th className="col-check">
                          <input
                            type="checkbox"
                            aria-label="Select all ready questions"
                            checked={allReadyChecked}
                            disabled={readyLines.length === 0}
                            onChange={toggleAll}
                          />
                        </th>
                        <th>Utterance</th>
                        <th>SDM</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const selectable = row.status === 'ready';
                        return (
                          <tr
                            key={row.line}
                            className={
                              selectable && selected.has(row.line)
                                ? 'row-selected'
                                : `upload-row-${row.status}`
                            }
                            onClick={() => {
                              if (selectable) toggleOne(row.line);
                            }}
                          >
                            <td className="col-check" onClick={(event) => event.stopPropagation()}>
                              <input
                                type="checkbox"
                                aria-label={`Select ${row.utterance || `row ${row.line}`}`}
                                checked={selectable && selected.has(row.line)}
                                disabled={!selectable}
                                onChange={() => toggleOne(row.line)}
                              />
                            </td>
                            <td className="col-question-text">{row.utterance || '—'}</td>
                            <td>{row.displayName || row.sdmInput || '—'}</td>
                            <td>{row.status === 'ready' ? 'Ready' : row.reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-pill-outline" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn-pill-brand"
            disabled={selected.size === 0}
            onClick={insert}
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}

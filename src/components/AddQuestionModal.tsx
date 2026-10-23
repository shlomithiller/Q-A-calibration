import { useState } from 'react';
import { Close } from './Icons';
import { resolveSemanticModel } from '../data/semanticModels';
import type { Question } from '../data/questions';

interface AddQuestionModalProps {
  questions: Question[];
  onClose: () => void;
  onAdd: (utterance: string, semanticModel: string) => void;
}

export function AddQuestionModal({ questions, onClose, onAdd }: AddQuestionModalProps) {
  const [utterance, setUtterance] = useState('');
  const [sdm, setSdm] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const text = utterance.trim();
    if (!text) {
      setError('Utterance is required');
      return;
    }
    const resolved = resolveSemanticModel(sdm);
    if (!resolved.ok) {
      setError(resolved.reason);
      return;
    }
    const duplicate = questions.some(
      (question) =>
        question.text.trim().toLowerCase() === text.toLowerCase()
        && question.semanticModel.trim().toLowerCase() === resolved.displayName.toLowerCase(),
    );
    if (duplicate) {
      setError('This question is already in the list');
      return;
    }
    onAdd(text, resolved.displayName);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="upload-modal add-question-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close" type="button">
          <Close size={14} />
        </button>
        <h2 className="upload-modal-title">Add Question</h2>
        <p className="upload-modal-subtitle">
          Enter the utterance and the semantic model id or API name. Display names are not accepted.
        </p>
        <div className="upload-modal-rule" />
        <div className="upload-modal-body">
          <label className="add-question-field">
            <span>Utterance</span>
            <textarea value={utterance} onChange={(event) => setUtterance(event.target.value)} rows={3} />
          </label>
          <label className="add-question-field">
            <span>Semantic Model ID or API Name</span>
            <input value={sdm} onChange={(event) => setSdm(event.target.value)} placeholder="c360 or sdm_c360" />
          </label>
          {error && <p className="upload-questions-error">{error}</p>}
        </div>
        <div className="upload-modal-footer">
          <button type="button" className="btn-pill-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-pill-brand" onClick={submit}>Add</button>
        </div>
      </div>
    </div>
  );
}

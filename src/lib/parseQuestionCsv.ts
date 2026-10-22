import type { Question } from '../data/questions';
import { semanticModels } from '../data/semanticModels';

export type CsvRowStatus = 'ready' | 'failed' | 'duplicate';

export interface ParsedQuestionRow {
  line: number;
  utterance: string;
  sdmInput: string;
  status: CsvRowStatus;
  reason?: string;
  displayName?: string;
}

export interface QuestionCsvParseResult {
  error?: string;
  rows: ParsedQuestionRow[];
}

interface ExistingQuestion {
  text: string;
  semanticModel: string;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function questionKey(utterance: string, displayName: string): string {
  return `${utterance.trim().toLowerCase()}|${displayName.trim().toLowerCase()}`;
}

export function parseQuestionCsv(text: string, existing: ExistingQuestion[]): QuestionCsvParseResult {
  const table = parseCsv(text).filter((row) => row.some((cell) => cell.trim().length > 0));
  if (table.length === 0) {
    return { error: 'The file is empty. Add a header row with Utterance and SDM.', rows: [] };
  }

  const header = table[0].map((cell) => cell.trim().toLowerCase());
  const utteranceIndex = header.indexOf('utterance');
  const sdmIndex = header.indexOf('sdm');
  if (utteranceIndex < 0 || sdmIndex < 0) {
    return {
      error: 'The CSV needs Utterance and SDM columns. SDM must be an id or API name.',
      rows: [],
    };
  }

  const existingKeys = new Set(existing.map((question) => questionKey(question.text, question.semanticModel)));
  const seen = new Set(existingKeys);
  const rows: ParsedQuestionRow[] = [];

  table.slice(1).forEach((cells, index) => {
    const utterance = (cells[utteranceIndex] ?? '').trim();
    const sdmInput = (cells[sdmIndex] ?? '').trim();
    if (!utterance && !sdmInput) return;

    const line = index + 2;
    const base = { line, utterance, sdmInput };

    if (!utterance) {
      rows.push({ ...base, status: 'failed', reason: 'Utterance is required' });
      return;
    }
    if (!sdmInput) {
      rows.push({ ...base, status: 'failed', reason: 'SDM is required' });
      return;
    }

    const normalized = sdmInput.toLowerCase();
    const matched = semanticModels.find(
      (model) => model.id.toLowerCase() === normalized || model.apiName.toLowerCase() === normalized,
    );
    const displayOnly = semanticModels.find((model) => model.displayName.toLowerCase() === normalized);
    if (!matched && displayOnly) {
      rows.push({
        ...base,
        status: 'failed',
        reason: 'Display names are not accepted. Use the SDM id or API name.',
      });
      return;
    }
    if (!matched) {
      rows.push({ ...base, status: 'failed', reason: 'SDM not found' });
      return;
    }

    const key = questionKey(utterance, matched.displayName);
    if (seen.has(key)) {
      rows.push({
        ...base,
        status: 'duplicate',
        displayName: matched.displayName,
        reason: existingKeys.has(key) ? 'Already in the question list' : 'Duplicate in this file',
      });
      return;
    }

    seen.add(key);
    rows.push({
      ...base,
      status: 'ready',
      displayName: matched.displayName,
    });
  });

  return { rows };
}

export function questionFromCsvRow(row: ParsedQuestionRow, index: number): Question {
  return {
    id: `csv-${Date.now()}-${index}-${row.line}`,
    text: row.utterance,
    source: 'CSV',
    thumbsUp: 0,
    thumbsDown: 0,
    semanticModel: row.displayName ?? '',
    lastModified: 'Just now',
    classification: 'new',
    response: {
      summary: 'Uploaded from CSV. No answer has been generated yet.',
      followUp: 'Run this question to generate an answer.',
      sql: '-- No SQL yet',
      chartYAxisLabel: 'Value',
      chartXAxisLabel: 'Category',
      chartData: [{ label: '—', value: 0 }],
    },
  };
}

import type { Question, Source } from '../data/questions';

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

function delimiterFor(text: string): ',' | ';' | '\t' {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const commas = firstLine.split(',').length;
  const semicolons = firstLine.split(';').length;
  const tabs = firstLine.split('\t').length;
  if (semicolons > commas && semicolons >= tabs) return ';';
  if (tabs > commas && tabs > semicolons) return '\t';
  return ',';
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const delimiter = delimiterFor(text);
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
    } else if (ch === delimiter) {
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

export function parseQuestionCsv(
  text: string,
  existing: ExistingQuestion[],
  semanticModel: string,
): QuestionCsvParseResult {
  const displayName = semanticModel.trim();
  if (!displayName) {
    return { error: 'Select a semantic model before uploading.', rows: [] };
  }

  const table = parseCsv(text).filter((row) => row.some((cell) => cell.trim().length > 0));
  if (table.length === 0) {
    return { error: 'The file is empty. Add a header row with Utterance.', rows: [] };
  }

  const header = table[0].map((cell) => cell.trim().toLowerCase());
  const utteranceNames = new Set(['utterance', 'question']);
  const utteranceIndex = header.findIndex((cell) => utteranceNames.has(cell));
  if (utteranceIndex < 0) {
    return { error: 'The CSV needs an Utterance column.', rows: [] };
  }

  const existingKeys = new Set(existing.map((question) => questionKey(question.text, question.semanticModel)));
  const seen = new Set(existingKeys);
  const rows: ParsedQuestionRow[] = [];

  table.slice(1).forEach((cells, index) => {
    const utterance = (cells[utteranceIndex] ?? '').trim();
    if (!utterance && cells.every((cell) => !cell.trim())) return;

    const line = index + 2;
    const base = { line, utterance, sdmInput: displayName, displayName };

    if (!utterance) {
      rows.push({ ...base, status: 'failed', reason: 'Utterance is required' });
      return;
    }

    const key = questionKey(utterance, displayName);
    if (seen.has(key)) {
      rows.push({ ...base, status: 'duplicate', reason: 'Exists in questions list' });
      return;
    }

    seen.add(key);
    rows.push({ ...base, status: 'ready' });
  });

  return { rows };
}

export function questionFromCsvRow(row: ParsedQuestionRow, index: number): Question {
  return newQuestion(row.utterance, row.displayName ?? '', 'CSV', `csv-${Date.now()}-${index}-${row.line}`);
}

export function newQuestion(text: string, semanticModel: string, source: Source, id?: string): Question {
  return {
    id: id ?? `${source.toLowerCase()}-${Date.now()}`,
    text,
    source,
    thumbsUp: 0,
    thumbsDown: 0,
    semanticModel,
    lastModified: 'Just now',
    classification: 'new',
    response: {
      summary: source === 'CSV'
        ? 'Uploaded from CSV. No answer has been generated yet.'
        : 'Added manually. No answer has been generated yet.',
      followUp: 'Run this question to generate an answer.',
      sql: '-- No SQL yet',
      chartYAxisLabel: 'Value',
      chartXAxisLabel: 'Category',
      chartData: [{ label: '—', value: 0 }],
    },
  };
}

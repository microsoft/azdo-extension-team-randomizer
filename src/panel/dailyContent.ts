import { HolidayDatasetEntry, HolidayValue, QuestionOfDay, RandomizerData } from './types';

export const QUESTIONS_SOURCE_URL =
  'https://raw.githubusercontent.com/microsoft/azdo-extension-team-randomizer/main/qotd.json';
export const HOLIDAYS_SOURCE_URL =
  'https://raw.githubusercontent.com/microsoft/azdo-extension-team-randomizer/main/hotd.json';

export function normalizeQuestionOfDay(value: unknown): QuestionOfDay | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const text = value.trim();
    return text ? { text } : undefined;
  }
  if (typeof value === 'object' && value) {
    const record = value as Record<string, unknown>;
    const textValue = record.text;
    const idValue = record.id;
    if (typeof textValue === 'string' && textValue.trim()) {
      return {
        id: typeof idValue === 'number' ? idValue : undefined,
        text: textValue
      };
    }
  }
  return undefined;
}

export function normalizeHolidayOfDay(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function formatHolidayValue(value: HolidayValue | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;

  const titleParts = [value.title, value.name].map((p) => (typeof p === 'string' ? p.trim() : '')).filter(Boolean);
  const description =
    [value.description, value.detail, value.summary, value.text]
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .find((p) => p) || '';

  const title = titleParts[0] ?? '';
  if (title && description) return `${title}: ${description}`;
  return title || description || undefined;
}

export function collectAskedQuestionHistory(data: RandomizerData): { ids: Set<number>; texts: Set<string> } {
  const ids = new Set<number>();
  const texts = new Set<string>();
  Object.values(data).forEach((day) => {
    const record = day as { question?: unknown };
    const normalized = normalizeQuestionOfDay(record.question);
    if (!normalized) return;
    if (typeof normalized.id === 'number') ids.add(normalized.id);
    const trimmed = normalized.text.trim();
    if (trimmed) texts.add(trimmed);
  });
  return { ids, texts };
}

export function getHolidayOptionsForDate(dataset: HolidayDatasetEntry[], dateKey: string): string[] {
  // Dataset is expected to contain a single entry per date; short-circuit once matched.
  const entry = dataset.find((e) => e.date === dateKey);
  if (!entry) return [];
  const options: string[] = [];
  for (const holiday of entry.holidays ?? []) {
    const formatted = formatHolidayValue(holiday);
    if (formatted) options.push(formatted);
  }
  return options;
}

export function getCurrentDayKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat().format(now).replace(/\//g, '');
}

export function getHolidayDateKey(now: Date = new Date()): string {
  return now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export function selectRandomItem<T>(items: T[], random: () => number = Math.random): T {
  if (items.length === 0) throw new Error('Cannot select from an empty list');
  // Math.floor(random()*length) already guarantees 0 <= index < length.
  const index = Math.floor(random() * items.length);
  return items[index];
}

export function selectNextQuestion(
  questions: QuestionOfDay[],
  history: { ids: Set<number>; texts: Set<string> },
  currentQuestion?: QuestionOfDay,
  random: () => number = Math.random
): QuestionOfDay {
  const sanitized = questions.filter((q) => q.text.trim());
  if (sanitized.length === 0) throw new Error('No valid questions available');
  const unused = sanitized.filter((q) => {
    const t = q.text.trim();
    if (typeof q.id === 'number' && history.ids.has(q.id)) return false;
    return !history.texts.has(t);
  });
  let pool = unused.length > 0 ? unused : sanitized;
  if (currentQuestion && pool.length > 1) {
    const filtered = pool.filter((q) => q.text.trim() !== currentQuestion.text.trim());
    if (filtered.length > 0) pool = filtered;
  }
  return selectRandomItem(pool, random);
}

export function selectNextHoliday(
  options: string[],
  currentHoliday?: string,
  random: () => number = Math.random
): string {
  if (options.length === 0) throw new Error('No holiday options available');
  const trimmedCurrent = currentHoliday?.trim();
  const available = trimmedCurrent ? options.filter((o) => o !== trimmedCurrent) : options;
  const pool = available.length > 0 ? available : options;
  return selectRandomItem(pool, random);
}

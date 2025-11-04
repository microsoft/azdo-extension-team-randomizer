import * as React from 'react';
import {
  QUESTIONS_SOURCE_URL,
  HOLIDAYS_SOURCE_URL,
  normalizeQuestionOfDay,
  normalizeHolidayOfDay,
  collectAskedQuestionHistory,
  getHolidayDateKey,
  getHolidayOptionsForDate,
  selectNextQuestion,
  selectNextHoliday
} from './dailyContent';
import { QuestionOfDay, RandomizerSettings, RandomizerDayData, HolidayDatasetEntry, HolidayValue } from './types';
import { logger } from '../shared/logger';

interface UseDailyContentDeps {
  dayKey: string;
  settingsRef: React.MutableRefObject<RandomizerSettings | undefined>;
  persistRandomizerData: (
    applyUpdate: (prev: Record<string, RandomizerDayData>) => Record<string, RandomizerDayData>
  ) => Promise<Record<string, RandomizerDayData>>;
  mountedRef: React.MutableRefObject<boolean>;
  setStatus: (status: { type: 'error' | 'info'; message: string } | undefined) => void;
}

export interface UseDailyContentReturn {
  questionOfDay: QuestionOfDay | undefined;
  holidayOfDay: string | undefined;
  isQuestionLoading: boolean;
  isHolidayLoading: boolean;
  refreshQuestionOfDay: () => void;
  refreshHolidayOfDay: () => void;
  primeFromSettings: (settings: RandomizerSettings) => void; // load stored values and schedule refresh if missing
}

const log = logger.createChild('DailyContent');

export function useDailyContent({
  dayKey,
  settingsRef,
  persistRandomizerData,
  mountedRef,
  setStatus
}: UseDailyContentDeps): UseDailyContentReturn {
  const [questionOfDay, setQuestionOfDay] = React.useState<QuestionOfDay | undefined>();
  const [holidayOfDay, setHolidayOfDay] = React.useState<string | undefined>();
  const [isQuestionLoading, setIsQuestionLoading] = React.useState(false);
  const [isHolidayLoading, setIsHolidayLoading] = React.useState(false);

  const questionsCacheRef = React.useRef<QuestionOfDay[] | null>(null);
  const holidayDatasetRef = React.useRef<HolidayDatasetEntry[] | null>(null);

  const fetchQuestions = React.useCallback(async (): Promise<QuestionOfDay[]> => {
    if (questionsCacheRef.current) return questionsCacheRef.current;
    const response = await fetch(QUESTIONS_SOURCE_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load questions. (${response.status})`);
    const payload = (await response.json()) as unknown;
    const questions = Array.isArray(payload)
      ? payload.map((i) => normalizeQuestionOfDay(i)).filter((q): q is QuestionOfDay => !!q)
      : [];
    if (questions.length === 0) throw new Error('No valid questions were returned.');
    questionsCacheRef.current = questions;
    return questions;
  }, []);

  const fetchHolidayDataset = React.useCallback(async (): Promise<HolidayDatasetEntry[]> => {
    if (holidayDatasetRef.current) return holidayDatasetRef.current;
    const response = await fetch(HOLIDAYS_SOURCE_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load holiday data. (${response.status})`);
    const payload = (await response.json()) as unknown;
    const entries = Array.isArray(payload)
      ? payload
          .map((item) => (typeof item === 'object' && item ? (item as { date?: unknown; holidays?: unknown }) : null))
          .filter((item): item is { date?: unknown; holidays?: unknown } => !!item)
          .map((item) => ({
            date: typeof item.date === 'string' ? item.date : '',
            holidays: Array.isArray(item.holidays) ? (item.holidays as HolidayValue[]) : []
          }))
          .filter((e) => !!e.date)
      : [];
    holidayDatasetRef.current = entries;
    return entries;
  }, []);

  const refreshQuestionOfDay = React.useCallback(async () => {
    if (isQuestionLoading) return;
    setIsQuestionLoading(true);
    try {
      const currentSettings = settingsRef.current;
      if (!currentSettings) return;
      const questions = await fetchQuestions();
      const currentData = currentSettings._randomizerData ?? {};
      const currentDayData = currentData[dayKey] as { question?: unknown } | undefined;
      const currentQuestion = normalizeQuestionOfDay(currentDayData?.question);
      const history = collectAskedQuestionHistory(currentData);
      const nextQuestion = selectNextQuestion(questions, history, currentQuestion);
      await persistRandomizerData((previous) => {
        const nextDayData: RandomizerDayData = { ...(previous[dayKey] ?? {}) };
        nextDayData.question = nextQuestion;
        return { ...previous, [dayKey]: nextDayData };
      });
      if (mountedRef.current) setQuestionOfDay(nextQuestion);
    } catch (error) {
      log.error('Failed to refresh Question of the Day', error);
      if (mountedRef.current)
        setStatus({ type: 'error', message: 'Unable to load Question of the Day. Please try again.' });
    } finally {
      if (mountedRef.current) setIsQuestionLoading(false);
    }
  }, [dayKey, fetchQuestions, isQuestionLoading, mountedRef, persistRandomizerData, setStatus, settingsRef]);

  const refreshHolidayOfDay = React.useCallback(async () => {
    if (isHolidayLoading) return;
    setIsHolidayLoading(true);
    try {
      const currentSettings = settingsRef.current;
      if (!currentSettings) return;
      const dataset = await fetchHolidayDataset();
      const formattedDate = getHolidayDateKey();
      const options = getHolidayOptionsForDate(dataset, formattedDate);
      if (options.length === 0) {
        if (mountedRef.current) setHolidayOfDay('No holidays found for today.');
        return;
      }
      const currentData = currentSettings._randomizerData ?? {};
      const currentDayData = currentData[dayKey] as { hotd?: unknown } | undefined;
      const currentHoliday = normalizeHolidayOfDay(currentDayData?.hotd);
      const nextHoliday = selectNextHoliday(options, currentHoliday);
      await persistRandomizerData((previous) => {
        const nextDayData: RandomizerDayData = { ...(previous[dayKey] ?? {}) };
        nextDayData.hotd = nextHoliday;
        return { ...previous, [dayKey]: nextDayData };
      });
      if (mountedRef.current) setHolidayOfDay(nextHoliday);
    } catch (error) {
      log.error('Failed to refresh Holiday of the Day', error);
      if (mountedRef.current)
        setStatus({ type: 'error', message: 'Unable to load Holiday of the Day. Please try again.' });
    } finally {
      if (mountedRef.current) setIsHolidayLoading(false);
    }
  }, [dayKey, fetchHolidayDataset, isHolidayLoading, mountedRef, persistRandomizerData, setStatus, settingsRef]);

  const primeFromSettings = React.useCallback(
    (settings: RandomizerSettings) => {
      settingsRef.current = settings;
      const randomizer = settings._randomizerData ?? {};
      const dayData = randomizer[dayKey] as { question?: unknown; hotd?: unknown } | undefined;
      const storedQuestion = normalizeQuestionOfDay(dayData?.question);
      if (storedQuestion) setQuestionOfDay(storedQuestion);
      else {
        setQuestionOfDay(undefined);
        void refreshQuestionOfDay();
      }
      const storedHoliday = normalizeHolidayOfDay(dayData?.hotd);
      if (storedHoliday) setHolidayOfDay(storedHoliday);
      else {
        setHolidayOfDay(undefined);
        void refreshHolidayOfDay();
      }
    },
    [dayKey, refreshHolidayOfDay, refreshQuestionOfDay, settingsRef]
  );

  return {
    questionOfDay,
    holidayOfDay,
    isQuestionLoading,
    isHolidayLoading,
    refreshQuestionOfDay: () => void refreshQuestionOfDay(),
    refreshHolidayOfDay: () => void refreshHolidayOfDay(),
    primeFromSettings
  };
}

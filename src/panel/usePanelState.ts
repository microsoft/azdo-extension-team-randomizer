import * as React from 'react';
import * as API from 'azure-devops-extension-api';
import { CoreRestClient, WebApiTeam } from 'azure-devops-extension-api/Core';
import { DropdownSelection } from 'azure-devops-ui/Utilities/DropdownSelection';
import { IListBoxItem } from 'azure-devops-ui/ListBox';
import { logger } from '../shared/logger';
import { initExtension, getSdk } from '../shared/sdk';
import { getAvailableMembers, saveAvailableMembers } from '../dataService';
import { fetchTeamMembers } from '../settings/settingsService';
import { StatusMessage } from '../settings/types';
import { MemberViewModel } from '../shared/types';
import { mapStoredMemberToView, mapTeamMemberToView, normalizeStoredSettings } from '../settings/memberUtils';
import { mergeMemberViews } from '../shared/members';
import {
  MESSAGE_PANEL_INIT_FAILURE,
  MESSAGE_NO_HOLIDAYS,
  MESSAGE_QOD_LOAD_ERROR,
  MESSAGE_HOD_LOAD_ERROR,
  MESSAGE_RANDOMIZE_RECORD_ERROR,
  MESSAGE_RANDOMIZE_RESET_ERROR,
  MESSAGE_RANDOMIZE_REVERT_ERROR,
  MESSAGE_TEAM_LOAD_ERROR
} from '../shared/constants';
import {
  collectAskedQuestionHistory,
  getCurrentDayKey,
  getHolidayDateKey,
  getHolidayOptionsForDate,
  normalizeHolidayOfDay,
  normalizeQuestionOfDay,
  selectNextHoliday,
  selectNextQuestion
} from './dailyContent';
import {
  PanelConfiguration,
  QuestionOfDay,
  RandomizerData,
  RandomizerDayData,
  RandomizerSettings,
  HolidayDatasetEntry,
  HolidayValue
} from './types';

const log = logger.createChild('PanelState');
const coreClient = API.getClient(CoreRestClient);

/** What kind of daily content to refresh. */
type RefreshKind = 'question' | 'holiday';

/** Public shape returned by the hook for the panel presentation layer. */
export type PanelStateReturn = {
  dropdownSelection: DropdownSelection;
  teams: WebApiTeam[];
  selectedTeamId: string | undefined;
  members: MemberViewModel[];
  completedMemberIds: Set<string>;
  currentMemberId: string | undefined;
  selectionHistory: string[];
  questionOfDay: QuestionOfDay | undefined;
  holidayOfDay: string | undefined;
  isInitializing: boolean;
  isTeamLoading: boolean;
  isSaving: boolean;
  isQuestionLoading: boolean;
  isHolidayLoading: boolean;
  status: StatusMessage | undefined;
  currentMember: MemberViewModel | undefined;
  eligibleMembers: MemberViewModel[];
  hasActiveMemberPending: boolean;
  isSelectionCycleComplete: boolean;
  disableRandomize: boolean;
  disablePrevious: boolean;
  disableReset: boolean;
  totalMembers: number;
  completedCount: number;
  remainingCount: number;
  actions: {
    refreshQuestionOfDay: () => void;
    refreshHolidayOfDay: () => void;
    randomize: () => void;
    resetSelections: () => void;
    selectPrevious: () => void;
    selectTeam: (_event: React.SyntheticEvent<HTMLElement>, option: IListBoxItem<WebApiTeam> | undefined) => void;
    dismissStatus: () => void;
  };
};

export function usePanelState(): PanelStateReturn {
  const dropdownSelection = React.useMemo(() => new DropdownSelection(), []);
  const settingsRef = React.useRef<RandomizerSettings | undefined>(undefined);
  const mountedRef = React.useRef(true);
  const selectedTeamRef = React.useRef<string | undefined>(undefined);
  const questionsCacheRef = React.useRef<QuestionOfDay[] | null>(null);
  const holidayDatasetRef = React.useRef<HolidayDatasetEntry[] | null>(null);

  const [isInitializing, setIsInitializing] = React.useState(true);
  const [isTeamLoading, setIsTeamLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [projectId, setProjectId] = React.useState<string | undefined>();
  const [teams, setTeams] = React.useState<WebApiTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = React.useState<string | undefined>();
  const [members, setMembers] = React.useState<MemberViewModel[]>([]);
  const [completedMemberIds, setCompletedMemberIds] = React.useState<Set<string>>(new Set());
  const [currentMemberId, setCurrentMemberId] = React.useState<string | undefined>();
  const [selectionHistory, setSelectionHistory] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<StatusMessage | undefined>();
  const [questionOfDay, setQuestionOfDay] = React.useState<QuestionOfDay | undefined>();
  const [holidayOfDay, setHolidayOfDay] = React.useState<string | undefined>();
  const [isQuestionLoading, setIsQuestionLoading] = React.useState(false);
  const [isHolidayLoading, setIsHolidayLoading] = React.useState(false);

  const dayKey = React.useMemo(() => getCurrentDayKey(), []);

  // Lifecycle cleanup.
  React.useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );
  React.useEffect(() => {
    selectedTeamRef.current = selectedTeamId;
  }, [selectedTeamId]);

  // Initial load: project/team context.
  React.useEffect(() => {
    let disposed = false;

    const initialize = async () => {
      try {
        await initExtension(true);
        const sdk = getSdk();
        const configuration = sdk.getConfiguration() as { configuration?: PanelConfiguration };
        const projectService = await sdk.getService<API.IProjectPageService>(API.CommonServiceIds.ProjectPageService);
        const projectInfo = await projectService.getProject();
        const projectIdentifier = configuration?.configuration?.project?.id ?? projectInfo?.id;
        if (!projectIdentifier) throw new Error('Project context is unavailable.');
        const teamIdentifier = configuration?.configuration?.team?.id;
        const teamResults = await coreClient.getTeams(projectIdentifier, undefined, 20, 0);
        teamResults.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        if (disposed || !mountedRef.current) return;
        setProjectId(projectIdentifier);
        setTeams(teamResults);
        const teamContext = sdk.getTeamContext?.();
        const contextTeamId = teamContext?.id;
        const hasContextTeam = contextTeamId && teamResults.some((t) => t.id === contextTeamId);
        const hasConfiguredTeam = teamIdentifier && teamResults.some((t) => t.id === teamIdentifier);
        const defaultTeamId = hasContextTeam ? contextTeamId : hasConfiguredTeam ? teamIdentifier : teamResults[0]?.id;
        setSelectedTeamId(defaultTeamId);
        setIsInitializing(false);
        getSdk().notifyLoadSucceeded();
        getSdk().resize();
      } catch (error) {
        log.error('Failed to initialize panel', error);
        if (!disposed && mountedRef.current) {
          setStatus({ type: 'error', message: MESSAGE_PANEL_INIT_FAILURE });
          setIsInitializing(false);
        }
        const failure = error instanceof Error ? error : new Error(String(error));
        getSdk().notifyLoadFailed(failure);
      }
    };
    void initialize();
    return () => {
      disposed = true;
    };
  }, []);

  // Resize on dynamic changes.
  React.useEffect(() => {
    if (isInitializing) return;
    const handle = setTimeout(() => {
      getSdk().resize();
    }, 100);
    return () => clearTimeout(handle);
  }, [isInitializing, members.length]);

  // Sync dropdown selection state.
  React.useEffect(() => {
    if (!selectedTeamId) {
      dropdownSelection.clear();
      return;
    }
    const index = teams.findIndex((team) => team.id === selectedTeamId);
    if (index >= 0) dropdownSelection.select(index);
    else dropdownSelection.clear();
  }, [dropdownSelection, selectedTeamId, teams]);

  const fetchQuestions = React.useCallback(async (): Promise<QuestionOfDay[]> => {
    if (questionsCacheRef.current) return questionsCacheRef.current;
    const response = await fetch('../qotd.json', { cache: 'no-store' });
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
    const response = await fetch('../hotd.json', { cache: 'no-store' });
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

  const persistRandomizerData = React.useCallback(async (applyUpdate: (previous: RandomizerData) => RandomizerData) => {
    setIsSaving(true);
    try {
      const currentSettings = settingsRef.current ?? (await getAvailableMembers<RandomizerSettings>());
      if (!mountedRef.current) return currentSettings._randomizerData ?? {};
      const updatedRandomizer = applyUpdate(currentSettings._randomizerData ?? {});
      const nextSettings: RandomizerSettings = { ...currentSettings, _randomizerData: updatedRandomizer };
      settingsRef.current = nextSettings;
      const success = await saveAvailableMembers(nextSettings);
      if (!success) throw new Error('Failed to persist randomizer data.');
      return updatedRandomizer;
    } catch (error) {
      log.error('Failed to persist randomizer data', error);
      throw error;
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  }, []);

  const refreshDailyContent = React.useCallback(
    async (kind: RefreshKind) => {
      const isQuestion = kind === 'question';
      const loading = isQuestion ? isQuestionLoading : isHolidayLoading;
      const setLoading = isQuestion ? setIsQuestionLoading : setIsHolidayLoading;
      if (loading) return;
      setLoading(true);
      try {
        const currentSettings = settingsRef.current ?? (await getAvailableMembers<RandomizerSettings>());
        if (!mountedRef.current) return;
        settingsRef.current = currentSettings;
        if (isQuestion) {
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
          return;
        }
        const dataset = await fetchHolidayDataset();
        const formattedDate = getHolidayDateKey();
        const options = getHolidayOptionsForDate(dataset, formattedDate);
        if (options.length === 0) {
          if (mountedRef.current) setHolidayOfDay(MESSAGE_NO_HOLIDAYS);
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
        log.error(`Failed to refresh ${kind === 'question' ? 'Question' : 'Holiday'} of the Day`, error);
        if (mountedRef.current) {
          setStatus({
            type: 'error',
            message: kind === 'question' ? MESSAGE_QOD_LOAD_ERROR : MESSAGE_HOD_LOAD_ERROR
          });
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [dayKey, fetchHolidayDataset, fetchQuestions, isHolidayLoading, isQuestionLoading, persistRandomizerData]
  );

  const loadTeamData = React.useCallback(
    async (teamId: string) => {
      if (!projectId) return;
      setIsTeamLoading(true);
      setCurrentMemberId(undefined);
      setStatus(undefined);
      try {
        const teamMembers = await fetchTeamMembers(projectId, teamId);
        const settings = settingsRef.current ?? (await getAvailableMembers<RandomizerSettings>());
        if (!mountedRef.current || selectedTeamRef.current !== teamId) return;
        settingsRef.current = settings;
        const randomizer = settings._randomizerData ?? {};
        const dayData = randomizer[dayKey] as { question?: unknown; hotd?: unknown } | undefined;
        const storedQuestion = normalizeQuestionOfDay(dayData?.question);
        if (storedQuestion) setQuestionOfDay(storedQuestion);
        else setQuestionOfDay(undefined);
        const storedHoliday = normalizeHolidayOfDay(dayData?.hotd);
        if (storedHoliday) setHolidayOfDay(storedHoliday);
        else setHolidayOfDay(undefined);
        // Cast settings to PersistedSettings for normalization; extra randomizer data is ignored safely.
        const normalized = normalizeStoredSettings(
          settings as unknown as import('../settings/types').PersistedSettings
        );
        const baseMembers = teamMembers.map(mapTeamMemberToView);
        const customMembers = (normalized.customMembers[teamId] ?? []).map(mapStoredMemberToView);
        const combinedMembersAll = mergeMemberViews(baseMembers, customMembers);
        const selection = normalized.selections[teamId] ?? [];
        const selectionSet = selection.length > 0 ? new Set(selection) : undefined;
        const combinedMembers = selectionSet
          ? combinedMembersAll.filter((m) => selectionSet.has(m.id))
          : combinedMembersAll;
        const completed = randomizer[dayKey]?.teamMembers?.[teamId] ?? [];
        const persistedActiveId = randomizer[dayKey]?.activeMembers?.[teamId];
        const memberIds = new Set(combinedMembers.map((m) => m.id));
        const completedHistory = completed.filter((id) => memberIds.has(id));
        const completedSet = new Set(completedHistory);
        const activeMemberId =
          persistedActiveId && memberIds.has(persistedActiveId) && !completedSet.has(persistedActiveId)
            ? persistedActiveId
            : undefined;
        const history: string[] = [...completedHistory];
        if (activeMemberId) history.push(activeMemberId);
        setMembers(combinedMembers);
        setCompletedMemberIds(completedSet);
        setCurrentMemberId(activeMemberId);
        setSelectionHistory(history);
      } catch (error) {
        log.error('Failed to load team randomizer data', error);
        if (mountedRef.current && selectedTeamRef.current === teamId) {
          setMembers([]);
          setCompletedMemberIds(new Set());
          setSelectionHistory([]);
          setStatus({ type: 'error', message: MESSAGE_TEAM_LOAD_ERROR });
        }
      } finally {
        if (mountedRef.current && selectedTeamRef.current === teamId) setIsTeamLoading(false);
      }
    },
    [dayKey, projectId, refreshDailyContent]
  );

  React.useEffect(() => {
    if (!projectId || !selectedTeamId) {
      setMembers([]);
      setCompletedMemberIds(new Set());
      return;
    }
    void loadTeamData(selectedTeamId);
  }, [loadTeamData, projectId, selectedTeamId]);

  const eligibleMembers = React.useMemo(
    () => members.filter((m) => !completedMemberIds.has(m.id) && m.id !== currentMemberId),
    [completedMemberIds, currentMemberId, members]
  );
  const currentMember = React.useMemo(() => members.find((m) => m.id === currentMemberId), [members, currentMemberId]);
  const hasActiveMemberPending = currentMemberId ? !completedMemberIds.has(currentMemberId) : false;
  const isSelectionCycleComplete =
    members.length > 0 && !hasActiveMemberPending && eligibleMembers.length === 0 && !isInitializing && !isTeamLoading;
  // Precompute remaining eligible count (includes current member if still pending) to avoid repeated filter operations.
  // Remaining eligible excludes the current active member if it's still pending,
  // so we can add it back exactly once below (avoids double counting).
  const remainingEligibleCount = eligibleMembers.length;

  React.useEffect(() => {
    if (isInitializing || isTeamLoading) return;
    if (!selectedTeamId) return;
    if (!questionOfDay && !isQuestionLoading) {
      void refreshDailyContent('question');
    }
    if (!holidayOfDay && !isHolidayLoading) {
      void refreshDailyContent('holiday');
    }
  }, [
    isInitializing,
    isTeamLoading,
    selectedTeamId,
    questionOfDay,
    holidayOfDay,
    isQuestionLoading,
    isHolidayLoading,
    refreshDailyContent
  ]);

  const handleRandomize = React.useCallback(async () => {
    if (!selectedTeamId) return;
    if (!currentMemberId && completedMemberIds.size === members.length) return;
    setStatus(undefined);
    const previousCompleted = new Set(completedMemberIds);
    const previousCurrent = currentMemberId;
    const updatedCompleted = new Set(completedMemberIds);
    const isCurrentPending = currentMemberId ? !completedMemberIds.has(currentMemberId) : false;
    if (isCurrentPending && currentMemberId) updatedCompleted.add(currentMemberId);
    const remainingMembers = members.filter((m) => !updatedCompleted.has(m.id));
    const nextMember =
      remainingMembers.length > 0 ? remainingMembers[Math.floor(Math.random() * remainingMembers.length)] : undefined;
    setCompletedMemberIds(updatedCompleted);
    setCurrentMemberId(nextMember?.id);
    let didAppendHistory = false;
    if (nextMember) {
      didAppendHistory = true;
      setSelectionHistory((p) => [...p, nextMember.id]);
    }
    try {
      await persistRandomizerData((previous) => {
        const dayData: RandomizerDayData = { ...(previous[dayKey] ?? {}) };
        const nextActiveMembers = { ...(dayData.activeMembers ?? {}) };
        if (nextMember) nextActiveMembers[selectedTeamId] = nextMember.id;
        else delete nextActiveMembers[selectedTeamId];
        const nextDayData: RandomizerDayData = {
          ...dayData,
          teamMembers: { ...(dayData.teamMembers ?? {}), [selectedTeamId]: Array.from(updatedCompleted) }
        };
        if (Object.keys(nextActiveMembers).length > 0) nextDayData.activeMembers = nextActiveMembers;
        else delete nextDayData.activeMembers;
        return { ...previous, [dayKey]: nextDayData };
      });
    } catch (error) {
      setCompletedMemberIds(previousCompleted);
      setCurrentMemberId(previousCurrent);
      if (didAppendHistory) setSelectionHistory((p) => p.slice(0, -1));
      setStatus({ type: 'error', message: MESSAGE_RANDOMIZE_RECORD_ERROR });
    }
  }, [completedMemberIds, currentMemberId, dayKey, members, persistRandomizerData, selectedTeamId]);

  const handleResetSelections = React.useCallback(async () => {
    if (!selectedTeamId || (completedMemberIds.size === 0 && !hasActiveMemberPending)) return;
    const previousCompleted = new Set(completedMemberIds);
    setCompletedMemberIds(new Set());
    const previousCurrent = currentMemberId;
    setCurrentMemberId(undefined);
    setSelectionHistory([]);
    try {
      await persistRandomizerData((previous) => {
        const dayData: RandomizerDayData = { ...(previous[dayKey] ?? {}) };
        const nextActiveMembers = { ...(dayData.activeMembers ?? {}) };
        delete nextActiveMembers[selectedTeamId];
        const nextDayData: RandomizerDayData = {
          ...dayData,
          teamMembers: { ...(dayData.teamMembers ?? {}), [selectedTeamId]: [] }
        };
        if (Object.keys(nextActiveMembers).length > 0) nextDayData.activeMembers = nextActiveMembers;
        else delete nextDayData.activeMembers;
        return { ...previous, [dayKey]: nextDayData };
      });
    } catch (error) {
      setCompletedMemberIds(previousCompleted);
      setCurrentMemberId(previousCurrent);
      setSelectionHistory(Array.from(previousCompleted));
      setStatus({ type: 'error', message: MESSAGE_RANDOMIZE_RESET_ERROR });
    }
  }, [completedMemberIds, currentMemberId, dayKey, hasActiveMemberPending, persistRandomizerData, selectedTeamId]);

  const handleSelectPrevious = React.useCallback(async () => {
    if (!selectedTeamId || selectionHistory.length === 0) return;
    const previousIds = selectionHistory.slice(0, -1);
    const previousMemberId = previousIds[previousIds.length - 1];
    const updatedCompleted = new Set(completedMemberIds);
    const lastSelectedId = selectionHistory[selectionHistory.length - 1];
    if (lastSelectedId) updatedCompleted.delete(lastSelectedId);
    setSelectionHistory(previousIds);
    setCompletedMemberIds(updatedCompleted);
    setCurrentMemberId(previousMemberId);
    try {
      await persistRandomizerData((data) => {
        const dayData: RandomizerDayData = { ...(data[dayKey] ?? {}) };
        const teamMembers = new Set(dayData.teamMembers?.[selectedTeamId] ?? []);
        if (lastSelectedId) teamMembers.delete(lastSelectedId);
        return {
          ...data,
          [dayKey]: {
            ...dayData,
            teamMembers: { ...(dayData.teamMembers ?? {}), [selectedTeamId]: Array.from(teamMembers) }
          }
        };
      });
    } catch (error) {
      const revertedCompleted = new Set(completedMemberIds);
      if (lastSelectedId) revertedCompleted.add(lastSelectedId);
      setCompletedMemberIds(revertedCompleted);
      setSelectionHistory((p) => [...p, lastSelectedId].filter((id): id is string => !!id));
      setCurrentMemberId(lastSelectedId);
      setStatus({ type: 'error', message: MESSAGE_RANDOMIZE_REVERT_ERROR });
    }
  }, [completedMemberIds, dayKey, persistRandomizerData, selectedTeamId, selectionHistory]);

  const handleTeamSelection = React.useCallback(
    (_: React.SyntheticEvent<HTMLElement>, option: IListBoxItem<WebApiTeam> | undefined) => {
      if (!option || option.id === selectedTeamId) return;
      setSelectedTeamId(option.id);
      setStatus(undefined);
    },
    [selectedTeamId]
  );

  const dismissStatus = React.useCallback(() => setStatus(undefined), []);

  const totalMembers = members.length;
  const completedCount = completedMemberIds.size;
  const remainingCount = remainingEligibleCount + (hasActiveMemberPending ? 1 : 0);

  const disableRandomize =
    isInitializing || isTeamLoading || isSaving || (!hasActiveMemberPending && remainingEligibleCount === 0);
  const disablePrevious =
    isInitializing ||
    isTeamLoading ||
    isSaving ||
    selectionHistory.length === 0 ||
    (selectionHistory.length === 1 && !completedMemberIds.has(selectionHistory[0]));
  const disableReset =
    isInitializing || isTeamLoading || isSaving || (completedMemberIds.size === 0 && !hasActiveMemberPending);

  return {
    dropdownSelection,
    teams,
    selectedTeamId,
    members,
    completedMemberIds,
    currentMemberId,
    selectionHistory,
    questionOfDay,
    holidayOfDay,
    isInitializing,
    isTeamLoading,
    isSaving,
    isQuestionLoading,
    isHolidayLoading,
    status,
    currentMember,
    eligibleMembers,
    hasActiveMemberPending,
    isSelectionCycleComplete,
    disableRandomize,
    disablePrevious,
    disableReset,
    totalMembers,
    completedCount,
    remainingCount,
    actions: {
      refreshQuestionOfDay: () => void refreshDailyContent('question'),
      refreshHolidayOfDay: () => void refreshDailyContent('holiday'),
      randomize: () => void handleRandomize(),
      resetSelections: () => void handleResetSelections(),
      selectPrevious: () => void handleSelectPrevious(),
      selectTeam: handleTeamSelection,
      dismissStatus
    }
  };
}

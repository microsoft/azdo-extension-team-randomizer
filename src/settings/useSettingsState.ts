import * as React from 'react';
import * as SDK from 'azure-devops-extension-sdk';
import * as API from 'azure-devops-extension-api';
import { CoreRestClient, WebApiTeam } from 'azure-devops-extension-api/Core';
import { DropdownSelection } from 'azure-devops-ui/Utilities/DropdownSelection';
import { IListBoxItem } from 'azure-devops-ui/ListBox';
import { ArrayItemProvider } from 'azure-devops-ui/Utilities/Provider';
import { SortOrder, ColumnSorting } from 'azure-devops-ui/Table';
import { IHeaderCommandBarItem } from 'azure-devops-ui/HeaderCommandBar';
import { IIdentity as IPickerIdentity } from 'azure-devops-ui/IdentityPicker';
import { logger } from '../shared/logger';
import { getAvailableMembers } from '../dataService';
import { PersistedSettings, StatusMessage, StoredMembersByTeam } from './types';
import { MemberViewModel } from '../shared/types';
import {
  areSelectionsEqual,
  areStoredMemberListsEqual,
  cloneMembersByTeam,
  createCustomIdentityFromInput,
  findTeamMemberConflictForIdentity,
  mapIdentityToStoredMember,
  mapStoredMemberToView,
  mapTeamMemberToView,
  normalizeStoredSettings
} from './memberUtils';
import { computeSelectionFingerprint, computeIsDirty } from './settingsUtils';
import { mergeMemberViews } from '../shared/members';
import {
  MESSAGE_MEMBER_ADDED,
  MESSAGE_MEMBER_REMOVED,
  MESSAGE_MEMBER_EXISTS,
  MESSAGE_SAVE_WAIT,
  MESSAGE_SAVE_SUCCESS,
  MESSAGE_SAVE_FAILURE,
  MESSAGE_TEAM_LOAD_ERROR,
  MESSAGE_UNKNOWN_MEMBER_UPDATE,
  MESSAGE_MEMBER_CONFLICT
} from '../shared/constants';
import { createMemberComparator } from '../shared/sort';
import { saveTeamSettings } from './statePersistence';
import { findIdentityByNameOrMail } from '../shared/identity';
import { fetchTeamMembers, getAllProjectMembers } from './settingsService';
import { useIdentityPicker } from './useIdentityPicker';
import { createMemberTableColumns } from './memberTableColumns';

const log = logger.createChild('SettingsHook');
const CoreClient = API.getClient(CoreRestClient);

export interface UseSettingsStateResult {
  // Core state
  isInitializing: boolean;
  isTeamLoading: boolean;
  projectInfo?: API.IProjectInfo;
  teams: WebApiTeam[];
  selectedTeamId?: string;
  dropdownSelection: DropdownSelection;
  // Members
  members: MemberViewModel[];
  memberItemProvider: ArrayItemProvider<MemberViewModel>;
  memberColumns: ReturnType<typeof createMemberTableColumns>;
  tableBehaviors: any[]; // simplified typing for behaviors array
  selectionFingerprint: string;
  selectedMemberIds: Set<string>;
  // Identity Picker
  identityPickerProvider: ReturnType<typeof useIdentityPicker>['provider'];
  availableIdentities: ReturnType<typeof useIdentityPicker>['availableIdentities'];
  selectedIdentity?: IPickerIdentity;
  handleIdentityChange: (identity?: IPickerIdentity) => boolean;
  handleResolveIdentity: (input: string) => IPickerIdentity | undefined;
  handleAddMember: () => void;
  // Commands & actions
  membersCardCommands: IHeaderCommandBarItem[];
  handleTeamSelection: (
    _event: React.SyntheticEvent<HTMLElement>,
    option: IListBoxItem<WebApiTeam> | undefined
  ) => Promise<void>;
  handleSave: () => Promise<void>;
  handleRemoveAdditionalMember: (memberId: string) => void;
  // UI state
  status?: StatusMessage;
  dismissStatus: () => void;
  isDirty: boolean;
  isSaving: boolean;
  // Sort
  memberSorting: { columnId: string; sortOrder: SortOrder };
}

export function useSettingsState(): UseSettingsStateResult {
  const dropdownSelection = React.useMemo(() => new DropdownSelection(), []);
  // Core state
  const [isInitializing, setIsInitializing] = React.useState(true);
  const [isTeamLoading, setIsTeamLoading] = React.useState(false);
  const [teams, setTeams] = React.useState<WebApiTeam[]>([]);
  const [projectInfo, setProjectInfo] = React.useState<API.IProjectInfo | undefined>();
  const [selectedTeamId, setSelectedTeamId] = React.useState<string | undefined>();
  // Member state
  const [members, setMembers] = React.useState<MemberViewModel[]>([]);
  const [projectMembers, setProjectMembers] = React.useState<MemberViewModel[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = React.useState<Set<string>>(new Set());
  const [customMembers, setCustomMembers] = React.useState<StoredMembersByTeam>({});
  // Persistence state
  const [persistedSelections, setPersistedSelections] = React.useState<Record<string, string[]>>({});
  const [persistedCustomMembers, setPersistedCustomMembers] = React.useState<StoredMembersByTeam>({});
  const [baselineSelections, setBaselineSelections] = React.useState<Record<string, string[]>>({});
  // Derived flag (was previously stored): whether selection came from persistence for current team.
  // We compute this on demand in handlers using persistedSelections[selectedTeamId].
  // UI state
  const [status, setStatus] = React.useState<StatusMessage | undefined>();
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedIdentity, setSelectedIdentity] = React.useState<IPickerIdentity | undefined>();
  const [memberSorting, setMemberSorting] = React.useState<{ columnId: string; sortOrder: SortOrder }>({
    columnId: 'member',
    sortOrder: SortOrder.ascending
  });

  // Custom hook for identity picker
  const { provider: identityPickerProvider, availableIdentities } = useIdentityPicker({
    projectMembers,
    members,
    customMembers
  });

  // Initialization logic
  React.useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      try {
        SDK.init({ applyTheme: true });
        await SDK.ready();
        log.debug('SDK ready, initializing settings');
        const projectService = await SDK.getService<API.IProjectPageService>(API.CommonServiceIds.ProjectPageService);
        const project = await projectService.getProject();
        if (!project) throw new Error('Project context is unavailable.');
        if (!mounted) return;
        setProjectInfo(project);
        const teamResults = await CoreClient.getTeams(project.id, undefined, 100, 0);
        if (!mounted) return;
        teamResults.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setTeams(teamResults);
        const aggregatedMembers = await getAllProjectMembers(project.id, teamResults);
        if (!mounted) return;
        setProjectMembers(aggregatedMembers);
        const storedSettings = await getAvailableMembers<PersistedSettings>();
        const { selections, customMembers: storedCustomMembers } = normalizeStoredSettings(storedSettings);
        const persistedSelectionSnapshot: Record<string, string[]> = {};
        Object.entries(selections).forEach(([teamId, ids]) => {
          persistedSelectionSnapshot[teamId] = [...ids];
        });
        const baselineSelectionSnapshot: Record<string, string[]> = {};
        Object.entries(persistedSelectionSnapshot).forEach(([teamId, ids]) => {
          baselineSelectionSnapshot[teamId] = [...ids];
        });
        const persistedCustomSnapshot = cloneMembersByTeam(storedCustomMembers);
        setPersistedSelections(persistedSelectionSnapshot);
        setBaselineSelections(baselineSelectionSnapshot);
        setCustomMembers(storedCustomMembers);
        setPersistedCustomMembers(persistedCustomSnapshot);
        SDK.notifyLoadSucceeded();
        SDK.resize();
      } catch (error) {
        log.error('Initialization failed', error);
        const message = error instanceof Error ? error.message : 'Failed to initialize settings page.';
        setStatus({ type: 'error', message });
        SDK.notifyLoadFailed(error instanceof Error ? error : new Error(String(error)));
      } finally {
        if (mounted) setIsInitializing(false);
      }
    };
    void initialize();
    return () => {
      mounted = false;
    };
  }, []);

  // Resize on key changes
  React.useEffect(() => {
    if (!isInitializing) SDK.resize();
  }, [isInitializing, members.length, isTeamLoading]);
  // Reset identity picker on team change
  React.useEffect(() => {
    setSelectedIdentity(undefined);
  }, [selectedTeamId]);

  // Team dropdown items provider
  // NOTE: Removed unused teamItems provider (was dead code after component refactor).

  // Team selection handler
  const handleTeamSelection = React.useCallback(
    async (_event: React.SyntheticEvent<HTMLElement>, option: IListBoxItem<WebApiTeam> | undefined) => {
      if (!option || !projectInfo) return;
      setStatus(undefined);
      setSelectedTeamId(option.id);
      setSelectedIdentity(undefined);
      setIsTeamLoading(true);
      setMemberSorting({ columnId: 'member', sortOrder: SortOrder.ascending });
      setMembers([]);
      setSelectedMemberIds(new Set());
      try {
        const baseMembers = await fetchTeamMembers(projectInfo.id, option.id);
        const customEntries = customMembers[option.id] ?? [];
        const combined = mergeMemberViews(
          baseMembers.map(mapTeamMemberToView),
          customEntries.map(mapStoredMemberToView)
        );
        setMembers(combined);
        const persisted = persistedSelections[option.id];
        const idSet = new Set(combined.map((m) => m.id));
        const validSelection = persisted ? persisted.filter((id) => idSet.has(id)) : combined.map((m) => m.id);
        const normalizedSelection = Array.from(new Set(validSelection)).sort((a, b) => a.localeCompare(b));
        setSelectedMemberIds(new Set(normalizedSelection));
        setBaselineSelections((prev) => ({ ...prev, [option.id]: [...normalizedSelection] }));
      } catch (error) {
        log.error('Failed to load team members', error);
        setMembers([]);
        setSelectedMemberIds(new Set());
        setBaselineSelections((prev) => ({ ...prev, [option.id]: [] }));
        setStatus({ type: 'error', message: MESSAGE_TEAM_LOAD_ERROR });
      } finally {
        setIsTeamLoading(false);
        SDK.resize();
      }
    },
    [projectInfo, customMembers, persistedSelections]
  );

  // Member toggle
  const handleMemberToggle = React.useCallback(
    (memberId: string, checked: boolean) => {
      if (!members.some((m) => m.id === memberId)) {
        setStatus({ type: 'error', message: MESSAGE_UNKNOWN_MEMBER_UPDATE });
        return;
      }
      setSelectedMemberIds((prev) => {
        const already = prev.has(memberId);
        if (checked === already) return prev;
        const next = new Set(prev);
        checked ? next.add(memberId) : next.delete(memberId);
        return next;
      });
    },
    [members]
  );

  const handleSelectAll = React.useCallback(() => {
    setSelectedMemberIds(new Set(members.map((m) => m.id)));
  }, [members]);
  const handleDeselectAll = React.useCallback(() => {
    setSelectedMemberIds(new Set());
  }, []);

  // Identity change & resolver
  const handleIdentityChange = React.useCallback((identity?: IPickerIdentity) => {
    setSelectedIdentity(identity);
    return true;
  }, []);
  const handleResolveIdentity = React.useCallback(
    (input: string) => {
      const existing = findIdentityByNameOrMail(availableIdentities, input);
      if (existing) return existing;
      const trimmed = input.trim();
      if (!trimmed) return undefined;
      return createCustomIdentityFromInput(trimmed);
    },
    [availableIdentities]
  );

  // Add member
  const handleAddMember = React.useCallback(() => {
    if (!selectedTeamId || !selectedIdentity) return;
    const identity = selectedIdentity;
    const displayName = identity.displayName?.trim() || identity.mail?.trim();
    if (!displayName) return;
    const existingMember = members.find((m) => m.id === identity.entityId);
    const hasPersistedSelection = selectedTeamId ? !!persistedSelections[selectedTeamId] : false;
    if (existingMember) {
      if (!hasPersistedSelection) {
        setSelectedMemberIds((prev) => {
          const next = new Set(prev);
          next.add(existingMember.id);
          return next;
        });
      }
      setStatus({ type: 'info', message: MESSAGE_MEMBER_EXISTS });
      setSelectedIdentity(undefined);
      return;
    }
    const storedMember = mapIdentityToStoredMember(identity);
    if (storedMember.source === 'directory') {
      const conflict = findTeamMemberConflictForIdentity(identity, members);
      if (conflict) {
        setStatus({ type: 'info', message: MESSAGE_MEMBER_CONFLICT });
        setSelectedIdentity(undefined);
        return;
      }
    }
    setCustomMembers((prev) => {
      const current = prev[selectedTeamId] ?? [];
      const exists = current.some((m) => m.identity.id === storedMember.identity.id);
      const nextList = exists ? current : [...current, storedMember];
      return { ...prev, [selectedTeamId]: nextList };
    });
    const customView = mapStoredMemberToView(storedMember);
    setMembers((prev) => [...prev, customView].sort(createMemberComparator('member')));
    if (!hasPersistedSelection) {
      setSelectedMemberIds((prev) => {
        const next = new Set(prev);
        next.add(storedMember.identity.id);
        return next;
      });
    }
    setSelectedIdentity(undefined);
    setStatus({ type: 'info', message: MESSAGE_MEMBER_ADDED });
  }, [selectedTeamId, selectedIdentity, members, persistedSelections]);

  // Remove member
  const handleRemoveAdditionalMember = React.useCallback(
    (memberId: string) => {
      if (!selectedTeamId) return;
      setCustomMembers((prev) => {
        const current = prev[selectedTeamId] ?? [];
        const updated = current.filter((m) => m.identity.id !== memberId);
        return { ...prev, [selectedTeamId]: updated };
      });
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setSelectedMemberIds((prev) => {
        const next = new Set(prev);
        next.delete(memberId);
        return next;
      });
      setStatus({ type: 'info', message: MESSAGE_MEMBER_REMOVED });
    },
    [selectedTeamId]
  );

  // Column sorting behavior
  const columnSortingBehavior = React.useMemo(
    () =>
      new ColumnSorting<MemberViewModel>((columnIndex, proposedSortOrder) => {
        const columns = memberColumns;
        const column = columns[columnIndex];
        if (!column || !column.sortProps) return;
        const isSameColumn = column.id === memberSorting.columnId;
        const nextOrder = isSameColumn ? proposedSortOrder : SortOrder.ascending;
        if (isSameColumn && memberSorting.sortOrder === nextOrder) return;
        setMemberSorting({ columnId: column.id, sortOrder: nextOrder });
      }),
    [memberSorting]
  );
  const tableBehaviors = React.useMemo(() => [columnSortingBehavior], [columnSortingBehavior]);

  // Sorted members + fingerprint
  const sortedMembers = React.useMemo(() => {
    const items = [...members];
    const direction = memberSorting.sortOrder === SortOrder.ascending ? 1 : -1;
    const compare = createMemberComparator(memberSorting.columnId);
    items.sort((a, b) => direction * compare(a, b));
    return items;
  }, [members, memberSorting]);
  const selectionFingerprint = React.useMemo(() => computeSelectionFingerprint(selectedMemberIds), [selectedMemberIds]);
  const memberItemProvider = React.useMemo(
    () => new ArrayItemProvider<MemberViewModel>(sortedMembers),
    [sortedMembers]
  );

  // Member columns
  const memberColumns = React.useMemo(
    () =>
      createMemberTableColumns({
        selectedMemberIds,
        totalMemberCount: members.length,
        memberSorting,
        onMemberToggle: handleMemberToggle,
        onRemoveMember: handleRemoveAdditionalMember,
        onSelectAll: handleSelectAll,
        onDeselectAll: handleDeselectAll
      }),
    [
      selectedMemberIds,
      members.length,
      memberSorting,
      handleMemberToggle,
      handleRemoveAdditionalMember,
      handleSelectAll,
      handleDeselectAll
    ]
  );

  // Dirty state
  const isDirty = React.useMemo(
    () =>
      computeIsDirty(
        selectedTeamId,
        isTeamLoading,
        selectedMemberIds,
        baselineSelections,
        customMembers,
        persistedCustomMembers
      ),
    [selectedTeamId, isTeamLoading, selectedMemberIds, baselineSelections, customMembers, persistedCustomMembers]
  );

  // Save
  const lastSaveTimeRef = React.useRef<number>(0);
  const handleSave = React.useCallback(async () => {
    if (!selectedTeamId) return;
    const now = Date.now();
    if (now - lastSaveTimeRef.current < 600) {
      setStatus({ type: 'info', message: MESSAGE_SAVE_WAIT });
      return;
    }
    lastSaveTimeRef.current = now;
    setIsSaving(true);
    setStatus(undefined);
    try {
      const { success, updatedSelections, persistedCustomSnapshot, selectionArray } = await saveTeamSettings({
        selectedTeamId,
        selectedMemberIds,
        members,
        persistedSelections,
        customMembers
      });
      if (success) {
        setPersistedSelections(updatedSelections);
        setPersistedCustomMembers(persistedCustomSnapshot);
        setBaselineSelections((prev) => ({ ...prev, [selectedTeamId]: [...selectionArray] }));
        setStatus({ type: 'success', message: MESSAGE_SAVE_SUCCESS });
      } else {
        setStatus({ type: 'error', message: MESSAGE_SAVE_FAILURE });
      }
    } catch (error) {
      log.error('Failed to save', error);
      setStatus({ type: 'error', message: MESSAGE_SAVE_FAILURE });
    } finally {
      setIsSaving(false);
    }
  }, [selectedTeamId, selectedMemberIds, members, persistedSelections, customMembers]);

  const handleSaveCommand = React.useCallback(() => {
    void handleSave();
  }, [handleSave]);
  const membersCardCommands = React.useMemo<IHeaderCommandBarItem[]>(
    () => [
      {
        id: 'save-members',
        iconProps: { iconName: 'Save' },
        isPrimary: true,
        ariaLabel: isSaving ? 'Saving...' : 'Save',
        disabled: isSaving || !isDirty,
        onActivate: handleSaveCommand
      }
    ],
    [handleSaveCommand, isDirty, isSaving]
  );

  const dismissStatus = React.useCallback(() => setStatus(undefined), []);

  return {
    isInitializing,
    isTeamLoading,
    projectInfo,
    teams,
    selectedTeamId,
    dropdownSelection,
    members,
    memberItemProvider,
    memberColumns,
    tableBehaviors,
    selectionFingerprint,
    selectedMemberIds,
    identityPickerProvider,
    availableIdentities,
    selectedIdentity,
    handleIdentityChange,
    handleResolveIdentity,
    handleAddMember,
    membersCardCommands,
    handleTeamSelection,
    handleSave,
    handleRemoveAdditionalMember,
    status,
    dismissStatus,
    isDirty,
    isSaving,
    memberSorting
  };
}

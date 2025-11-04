import { StoredMembersByTeam } from './types';
import { areSelectionsEqual, areStoredMemberListsEqual } from './memberUtils';

export function computeSelectionFingerprint(selectedMemberIds: Set<string>): string {
  if (selectedMemberIds.size === 0) return '';
  return Array.from(selectedMemberIds.values())
    .sort((a, b) => a.localeCompare(b))
    .join('|');
}

export function computeIsDirty(
  selectedTeamId: string | undefined,
  isTeamLoading: boolean,
  selectedMemberIds: Set<string>,
  baselineSelections: Record<string, string[]>,
  customMembers: StoredMembersByTeam,
  persistedCustomMembers: StoredMembersByTeam
): boolean {
  if (!selectedTeamId || isTeamLoading) return false;
  const baselineSelection = baselineSelections[selectedTeamId] ?? [];
  const selectionChanged = !areSelectionsEqual(selectedMemberIds, baselineSelection);
  const currentCustomMembers = customMembers[selectedTeamId];
  const persistedCustomForTeam = persistedCustomMembers[selectedTeamId];
  const customChanged = !areStoredMemberListsEqual(currentCustomMembers, persistedCustomForTeam);
  return selectionChanged || customChanged;
}

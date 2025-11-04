import { PersistedSettings, StoredMembersByTeam } from './types';
import { cloneMembersByTeam } from './memberUtils';
import { saveAvailableMembers } from '../dataService';

export interface SaveTeamSettingsArgs {
  selectedTeamId: string;
  selectedMemberIds: Set<string>;
  members: { id: string }[]; // Minimal shape required for validation
  persistedSelections: Record<string, string[]>;
  customMembers: StoredMembersByTeam;
}

export interface SaveTeamSettingsResult {
  success: boolean;
  updatedSelections: Record<string, string[]>;
  persistedCustomSnapshot: StoredMembersByTeam;
  selectionArray: string[];
}

/**
 * Build and persist updated settings for the given team.
 * Separates side-effectful save operation from view logic for testability.
 */
export async function saveTeamSettings(args: SaveTeamSettingsArgs): Promise<SaveTeamSettingsResult> {
  const { selectedTeamId, selectedMemberIds, members, persistedSelections, customMembers } = args;
  const selectionArray = Array.from(selectedMemberIds)
    .filter((id) => members.some((m) => m.id === id))
    .sort((a, b) => a.localeCompare(b));
  const updatedSelections = { ...persistedSelections, [selectedTeamId]: selectionArray };
  const persistedCustomSnapshot = cloneMembersByTeam(customMembers);
  const payload: PersistedSettings = { ...updatedSelections, _customMembers: persistedCustomSnapshot };
  const success = await saveAvailableMembers(payload);
  return { success, updatedSelections, persistedCustomSnapshot, selectionArray };
}

import * as API from 'azure-devops-extension-api';
import { CoreRestClient, WebApiTeam } from 'azure-devops-extension-api/Core';
import { TeamMember } from 'azure-devops-extension-api/WebApi';
import { logger } from '../shared/logger';
import { mapTeamMemberToView } from './memberUtils';
import { sortByDisplayName } from '../shared/sort';
import { MemberViewModel } from '../shared/types';

const log = logger.createChild('SettingsService');
const coreClient = API.getClient(CoreRestClient);

export async function fetchTeamMembers(
  projectId: string,
  teamId: string,
  visited: Set<string> = new Set()
): Promise<TeamMember[]> {
  if (visited.has(teamId)) {
    return [];
  }

  visited.add(teamId);

  try {
    const members = await coreClient.getTeamMembersWithExtendedProperties(projectId, teamId, 100, 0);
    const results: TeamMember[] = [];
    const nestedCalls: Promise<TeamMember[]>[] = [];

    for (const member of members) {
      // Skip expansion of AAD groups (descriptor starts with 'aadgp') to avoid API errors
      const descriptor = (member.identity as any).descriptor as string | undefined;
      const isAadGroup = descriptor?.toLowerCase().startsWith('aadgp');

      if (member.identity.isContainer) {
        if (isAadGroup) {
          log.debug(
            `Skipping AAD group container during member fetch: ${descriptor} (${
              member.identity.displayName || member.identity.id
            })`
          );
          // Explicitly ignore AAD group containers (do not include, do not recurse)
          continue;
        }
        nestedCalls.push(fetchTeamMembers(projectId, member.identity.id, visited));
      } else {
        // Non-container identities (users) are collected
        results.push(member);
      }
    }

    const nested = await Promise.all(nestedCalls);
    nested.forEach((group) => {
      group.forEach((item) => results.push(item));
    });

    return results;
  } catch (error) {
    log.error('Failed to fetch team members', error);
    throw error;
  }
}

export async function getAllProjectMembers(projectId: string, teams: WebApiTeam[]): Promise<MemberViewModel[]> {
  if (teams.length === 0) {
    return [];
  }

  try {
    const results = await Promise.all(
      teams.map(async (team) => {
        try {
          const memberships = await fetchTeamMembers(projectId, team.id!);
          return memberships.map(mapTeamMemberToView);
        } catch (error) {
          log.warn(`Failed to load members for team ${team.name}`, error);
          return [] as MemberViewModel[];
        }
      })
    );

    const uniqueMembers = new Map<string, MemberViewModel>();
    results.flat().forEach((member) => {
      if (!uniqueMembers.has(member.id)) {
        uniqueMembers.set(member.id, member);
      }
    });

    return Array.from(uniqueMembers.values()).sort(sortByDisplayName);
  } catch (error) {
    log.error('Failed to aggregate project members', error);
    return [];
  }
}

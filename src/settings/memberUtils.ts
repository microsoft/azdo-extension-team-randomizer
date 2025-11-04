import { TeamMember } from 'azure-devops-extension-api/WebApi';
import { IdentityType, IIdentity as IPickerIdentity } from 'azure-devops-ui/IdentityPicker';
import { IIdentity as IPersonaIdentity } from 'azure-devops-ui/Persona';
// Re-import identity helpers that previously lived here from the shared identity module for consolidation.
import {
  normalizeIdentityValue,
  createCustomIdentityFromInput,
  createCustomIdentity,
  normalizeCustomIdentityId,
  isUserIdentity,
  isCustomIdentity
} from '../shared/identity';
import { PersistedSettings, StoredMember, StoredMemberSource, StoredMembersByTeam } from './types';
import { MemberSourceType, MemberViewModel } from '../shared/types';

export interface NormalizedSettings {
  selections: Record<string, string[]>;
  customMembers: StoredMembersByTeam;
}

export function mapTeamMemberToView(member: TeamMember): MemberViewModel {
  return {
    id: member.identity.id,
    displayName: member.identity.displayName || member.identity.uniqueName || 'Unknown member',
    uniqueName: member.identity.uniqueName,
    imageUrl: member.identity.imageUrl,
    sourceType: 'team'
  };
}

export function mapStoredMemberToView(member: StoredMember): MemberViewModel {
  const explicitSource = member.source;
  let sourceType: MemberSourceType;

  if (explicitSource === 'directory') {
    sourceType = 'directory';
  } else if (explicitSource === 'custom') {
    sourceType = 'custom';
  } else if (member.identity.uniqueName) {
    sourceType = 'directory';
  } else {
    sourceType = 'custom';
  }

  return {
    id: member.identity.id,
    displayName: member.identity.displayName,
    uniqueName: member.identity.uniqueName,
    imageUrl: member.identity.imageUrl,
    sourceType
  };
}

export function toPersonaIdentity(member: MemberViewModel): IPersonaIdentity {
  return {
    entityId: member.id,
    displayName: member.displayName,
    mail: member.uniqueName,
    image: member.imageUrl
  } as IPersonaIdentity;
}

export function mapMemberToPickerIdentity(member: MemberViewModel): IPickerIdentity {
  const isCustom = member.sourceType === 'custom';
  return {
    entityId: member.id,
    displayName: member.displayName,
    mail: member.uniqueName,
    image: member.imageUrl,
    entityType: isCustom ? IdentityType.Custom : IdentityType.User,
    originDirectory: isCustom ? 'custom' : 'aad',
    originId: member.id
  };
}

export function mapStoredMemberToPickerIdentity(member: StoredMember): IPickerIdentity {
  const isCustom = (member.source ?? 'custom') === 'custom';
  return {
    entityId: member.identity.id,
    displayName: member.identity.displayName,
    mail: member.identity.uniqueName,
    image: member.identity.imageUrl,
    entityType: isCustom ? IdentityType.Custom : IdentityType.User,
    originDirectory: isCustom ? 'custom' : 'aad',
    originId: member.identity.id
  };
}

export function mapIdentityToStoredMember(identity: IPickerIdentity): StoredMember {
  const entityType = identity.entityType?.toLowerCase();
  const source: StoredMemberSource =
    entityType === IdentityType.Custom || entityType === 'custom' ? 'custom' : 'directory';
  return {
    identity: {
      id: identity.entityId,
      displayName: identity.displayName || identity.mail || identity.entityId,
      uniqueName: identity.mail,
      imageUrl: identity.image,
      isContainer: false
    },
    source
  };
}

export function normalizeStoredSettings(settings: PersistedSettings | undefined): NormalizedSettings {
  if (!settings) {
    return { selections: {}, customMembers: {} };
  }

  const selections: Record<string, string[]> = {};
  Object.entries(settings).forEach(([key, value]) => {
    if (key === '_customMembers' || !Array.isArray(value)) {
      return;
    }

    selections[key] = value.filter((id): id is string => typeof id === 'string');
  });

  return {
    selections,
    customMembers: cloneMembersByTeam(settings._customMembers as StoredMembersByTeam | undefined)
  };
}

export function cloneMembersByTeam(source: StoredMembersByTeam | undefined): StoredMembersByTeam {
  if (!source) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(source).map(([teamId, members]) => [
      teamId,
      members.map((member) => ({
        identity: { ...member.identity },
        source: member.source
      }))
    ])
  );
}

export function areStoredMemberListsEqual(left?: StoredMember[], right?: StoredMember[]): boolean {
  const normalize = (list?: StoredMember[]) =>
    (list ?? [])
      .map((member) => {
        const identity = member.identity;
        const source = member.source ?? 'custom';
        return `${identity.id}|${identity.displayName}|${identity.uniqueName ?? ''}|${
          identity.imageUrl ?? ''
        }|${source}`;
      })
      .sort();

  const a = normalize(left);
  const b = normalize(right);

  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function areSelectionsEqual(left: Iterable<string>, right: Iterable<string>): boolean {
  const normalize = (values: Iterable<string>) => Array.from(new Set(values)).sort();
  const a = normalize(left);
  const b = normalize(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function findTeamMemberConflictForIdentity(
  identity: IPickerIdentity,
  memberList: MemberViewModel[]
): MemberViewModel | undefined {
  const normalizedEntityId = normalizeIdentityValue(identity.entityId);
  const normalizedOriginId = normalizeIdentityValue(identity.originId as string | undefined);
  const normalizedMail = normalizeIdentityValue(identity.mail);

  return memberList.find((member) => {
    if (member.sourceType !== 'team') {
      return false;
    }

    const memberId = normalizeIdentityValue(member.id);
    if (memberId && (memberId === normalizedEntityId || memberId === normalizedOriginId)) {
      return true;
    }

    const memberUniqueName = normalizeIdentityValue(member.uniqueName);
    return !!memberUniqueName && memberUniqueName === normalizedMail;
  });
}

// Re-export identity helpers so existing imports from this module remain valid after consolidation.
export {
  normalizeIdentityValue,
  createCustomIdentityFromInput,
  createCustomIdentity,
  normalizeCustomIdentityId,
  isUserIdentity,
  isCustomIdentity
};

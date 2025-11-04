export interface StoredMemberIdentity {
  id: string;
  displayName: string;
  uniqueName?: string;
  imageUrl?: string;
  isContainer?: boolean;
}

export type StoredMemberSource = 'custom' | 'directory';

export interface StoredMember {
  identity: StoredMemberIdentity;
  source?: StoredMemberSource;
}

export type StoredMembersByTeam = Record<string, StoredMember[]>;

export interface PersistedSettings {
  _customMembers?: StoredMembersByTeam;
  [teamId: string]: StoredMember[] | string[] | StoredMembersByTeam | undefined;
}

export interface StatusMessage {
  type: 'info' | 'error' | 'success';
  message: string;
}

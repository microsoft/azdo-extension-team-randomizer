export type MemberSourceType = 'team' | 'directory' | 'custom';

export interface MemberViewModel {
  id: string;
  displayName: string;
  uniqueName?: string;
  imageUrl?: string;
  sourceType: MemberSourceType;
}

export const MemberSource: Record<MemberSourceType, string> = {
  team: 'Team',
  directory: 'Directory',
  custom: 'Custom'
};

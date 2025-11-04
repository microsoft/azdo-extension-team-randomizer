import { MemberViewModel } from './types';
import { sortByDisplayName } from './sort';

export function mergeMemberViews(
  baseMembers: MemberViewModel[],
  customViewMembers: MemberViewModel[]
): MemberViewModel[] {
  if (customViewMembers.length === 0) return [...baseMembers];
  const map = new Map<string, MemberViewModel>();
  baseMembers.forEach((m) => map.set(m.id, m));
  customViewMembers.forEach((m) => {
    const existing = map.get(m.id);
    if (existing && existing.sourceType === 'team') return;
    map.set(m.id, m);
  });
  return Array.from(map.values()).sort(sortByDisplayName);
}

import { MemberViewModel } from './types';

/**
 * Basic comparator for member display names (case-insensitive fallback, then uniqueName).
 */
export function sortByDisplayName(a: MemberViewModel, b: MemberViewModel): number {
  const nameCompare = a.displayName.localeCompare(b.displayName);
  if (nameCompare !== 0) return nameCompare;
  return (a.uniqueName ?? '').localeCompare(b.uniqueName ?? '');
}

/** Ordering weight used when sorting by source type */
const memberSourceOrder: Record<MemberViewModel['sourceType'], number> = {
  team: 0,
  directory: 1,
  custom: 2
};

/**
 * Comparator factory for member sorting given a column id.
 * Supported column ids: 'member' (default) and 'source'.
 */
export function createMemberComparator(columnId: string): (a: MemberViewModel, b: MemberViewModel) => number {
  if (columnId === 'source') {
    return (a, b) => {
      const typeCompare = memberSourceOrder[a.sourceType] - memberSourceOrder[b.sourceType];
      if (typeCompare !== 0) return typeCompare;
      return sortByDisplayName(a, b);
    };
  }
  return sortByDisplayName;
}

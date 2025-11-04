import { StoredMember, StoredMembersByTeam } from '../settings/types';

/**
 * Day-level randomizer data persisted per calendar day.
 */
export type RandomizerDayData = {
  teamMembers?: Record<string, string[]>; // completed member ids for a team today
  activeMembers?: Record<string, string>; // currently active (in-progress) member per team
  question?: unknown; // raw stored question-of-the-day object/value
  hotd?: unknown; // raw stored holiday-of-the-day value
  [key: string]: unknown;
};

export type RandomizerData = Record<string, RandomizerDayData>; // keyed by date string (MMDDYYYY or locale variant)

/**
 * Extended settings shape that includes randomizer-specific persisted data.
 * We intentionally redefine the index signature to allow storing the
 * randomizer dataset under the `_randomizerData` key while remaining
 * backward-compatible with existing settings usage elsewhere.
 */
export type RandomizerSettings = {
  _customMembers?: StoredMembersByTeam;
  _randomizerData?: RandomizerData;
  [teamId: string]: StoredMember[] | string[] | StoredMembersByTeam | RandomizerData | undefined;
};

export type PanelConfiguration = {
  project?: { id?: string; name?: string };
  team?: { id?: string; name?: string };
};

export type QuestionOfDay = {
  id?: number;
  text: string;
};

export type HolidayValue =
  | string
  | {
      title?: string;
      name?: string;
      description?: string;
      detail?: string;
      summary?: string;
      text?: string;
    };

export type HolidayDatasetEntry = {
  date: string; // e.g. "September 24"
  holidays?: HolidayValue[];
};

export interface AttendanceRecord {
  id: string;
  fixtureId: string;
  week: number;
  homeClubName: string;
  awayClubName: string;
  homeGoals: number;
  awayGoals: number;
  stadiumCapacity: number;
  /** Actual fill percentage applied (0–100), after tier range + fan effects */
  attendancePct: number;
  /** Absolute estimated attendance figure */
  attendance: number;
  reputationTier: string;
  /** Active fan effect bonuses that were applied, e.g. [{label: 'Crowd Surge', bonus: 10}] */
  fanEffects: { label: string; bonus: number }[];
}

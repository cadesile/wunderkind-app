export interface LeagueStandingEntry {
  clubId: string;
  clubName: string;
  isAmp: boolean;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  promoted: boolean;
  relegated: boolean;
}

export interface LeagueSeasonRecord {
  /** League tier this record belongs to (1 = top, 8 = bottom). */
  tier: number;
  leagueName: string;
  /** Season number that just concluded. */
  season: number;
  /** Game week number when the season was concluded. */
  weekCompleted: number;
  standings: LeagueStandingEntry[];
}

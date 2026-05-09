export type FanTier = 'Angry' | 'Disappointed' | 'Neutral' | 'Happy' | 'Thrilled';

/** Per-club fan engagement state. One entry per club (AMP and NPC). */
export interface FanState {
  clubId: string;
  fanCount: number;
  /** 0–100, slow-moving measure of long-term fan satisfaction */
  sentiment: number;
  /** 0–100, fast-moving reactive measure (match results, signings, etc.) */
  morale: number;
}

export type FanImpactTarget = 'manager' | 'owner' | 'players';

export type FanEventType = 
  | 'match_win' | 'match_loss' | 'match_draw' 
  | 'player_sold' | 'player_sold_favorite'
  | 'facility_upgrade' | 'system_bonus' | 'system_penalty'
  | 'trophy_won' | 'promoted' | 'relegated';

export interface FanEvent {
  id: string;
  type: FanEventType;
  description: string;
  impact: number; // e.g. +5, -10
  weekNumber: number;
  targets: FanImpactTarget[];
  isPermanent?: boolean;
}

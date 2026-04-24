export type FanTier = 'Angry' | 'Disappointed' | 'Neutral' | 'Happy' | 'Thrilled';

export type FanEventType = 
  | 'match_win' | 'match_loss' | 'match_draw' 
  | 'player_sold' | 'player_sold_favorite'
  | 'facility_upgrade' | 'system_bonus' | 'system_penalty';

export interface FanEvent {
  id: string;
  type: FanEventType;
  description: string;
  impact: number; // e.g. +5, -10
  weekNumber: number;
}

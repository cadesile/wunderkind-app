export type TraitName =
  | 'determination'
  | 'professionalism'
  | 'ambition'
  | 'loyalty'
  | 'adaptability'
  | 'pressure'
  | 'temperament'
  | 'consistency';

export type PersonalityMatrix = Record<TraitName, number>; // 1–20 scale

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface Relationship {
  id: string;
  type: 'player' | 'coach' | 'scout' | 'manager';
  value: number;       // -100 to +100
  lastInteraction?: number; // game week
}

export interface ScoutingReport {
  scoutId: string;
  scoutName: string;
  perceivedOverall: number;
  perceivedPotential: number;
  actualOverall: number;
  actualPotential: number;
  accuracyPercent: number;
  revealedAt: number; // game week
}

export type PlayerStatus =
  | 'active'
  | 'loaned_out'
  | 'transferred'
  | 'transferred_via_agent'
  | 'retired';

// ─── Appearance system ────────────────────────────────────────────────────────

export type HairStyle = 'buzz' | 'shaggy' | 'afro' | 'crop' | 'bald';

/** Role-specific overlay accessory. null = no accessory. */
export type AppearanceAccessory = 'glasses' | 'whistle' | 'headset' | null;

/** 0=neutral, 1=determined, 2=stern — mapped from personality traits when available */
export type AppearanceExpression = 0 | 1 | 2;

export type AppearanceRole = 'PLAYER' | 'COACH' | 'SCOUT' | 'AGENT';

export interface Appearance {
  /** Hex skin tone — one of 5 predefined shades (light → dark) */
  skinTone: string;
  /** Hair silhouette style */
  hairStyle: HairStyle;
  /** Hex hair color — from predefined palette; ignored when hairStyle==='bald' */
  hairColor: string;
  /** Eye/brow/mouth expression variant */
  expression: AppearanceExpression;
  /** Role-specific overlay accessory, or null */
  accessory: AppearanceAccessory;
  /** Kit trim / accent color — vibrant for PLAYER, muted for staff */
  kitTrim: string;
}

// ─── Player Attributes ────────────────────────────────────────────────────────

/** 6-attribute football skill model — 0–100 scale */
export interface PlayerAttributes {
  pace:      number;
  technical: number;
  vision:    number;
  power:     number;
  stamina:   number;
  heart:     number;
}

export type AttributeName = keyof PlayerAttributes;

// ─── Player ───────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  /** YYYY-MM-DD — use computePlayerAge() for live display */
  dateOfBirth: string;
  /** Static age at generation time — fallback for legacy data */
  age: number;
  position: Position;
  nationality: string;
  overallRating: number; // 0–100
  potential: number;     // 1–5 stars
  wage: number;          // weekly, in pence
  personality: PersonalityMatrix;
  /** Deterministic visual appearance generated from id. Optional for backward compat. */
  appearance?: Appearance;
  guardianId: string | null;
  /** ID of the agent representing this player, or null if unrepresented */
  agentId: string | null;
  joinedWeek: number;
  isActive: boolean;
  /** Lifecycle status — set when a player is transferred, loaned, or retired */
  status?: PlayerStatus;
  /** Game week when enrollment expires (joinedWeek + 52 by default) */
  enrollmentEndWeek?: number;
  /** Player happiness 0–100 */
  morale?: number;
  /** Number of times the enrollment has been extended */
  extensionCount?: number;
  /** Granular football attributes — generated on first tick after joining */
  attributes?: PlayerAttributes;
  relationships?: Relationship[];
  /** ID of the coach currently training this player */
  assignedCoachId?: string;
  /** Post-signing accuracy comparison between scout report and true stats */
  scoutingReport?: ScoutingReport;
}

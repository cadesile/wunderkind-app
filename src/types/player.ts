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
  /** Scout's narrative note about the player's guardians — generated once at signing */
  guardianNote?: string;
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
export type AppearanceAccessory = 'glasses' | 'sunglasses' | 'whistle' | 'headset' | 'beanie' | null;

/** 0=neutral, 1=determined, 2=stern — mapped from personality traits when available */
export type AppearanceExpression = 0 | 1 | 2;

export type AppearanceRole = 'PLAYER' | 'COACH' | 'SCOUT' | 'AGENT';

export type FacialHair = 'none' | 'stubble' | 'moustache' | 'goatee' | 'beard';

export interface Appearance {
  /** Hex skin tone — one of 5 predefined shades (light → dark) */
  skinTone: string;
  /** Hair silhouette style */
  hairStyle: HairStyle;
  /** Hex hair color — from predefined palette; ignored when hairStyle==='bald' */
  hairColor: string;
  /** Eye/brow/mouth expression variant — retained for backward compat, no longer drives rendering */
  expression: AppearanceExpression;
  /** Role-specific overlay accessory, or null */
  accessory: AppearanceAccessory;
  /** Kit trim / accent color — vibrant for PLAYER, muted for staff */
  kitTrim: string;
  /** Facial hair style — always 'none' for PLAYER; optional for backward compat with persisted data */
  facialHair?: FacialHair;
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

export interface DevelopmentSnapshot {
  weekNumber: number;
  overallRating: number;
  attributes: PlayerAttributes;
}

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
  /**
   * Active development focus set by the AMP via a coach conversation.
   * The assigned coach applies a bonus multiplier to this attribute.
   */
  developmentFocus?: {
    /** The attribute being prioritised */
    attribute: 'pace' | 'technical' | 'vision' | 'power' | 'stamina' | 'heart';
    /** Coach who was instructed to focus on this */
    setByCoachId: string;
    /** Game week when focus was set — expires after 8 weeks */
    setWeek: number;
  };
  /** Post-signing accuracy comparison between scout report and true stats */
  scoutingReport?: ScoutingReport;
  /** Active injury — cleared automatically when weeksRemaining reaches 0 */
  injury?: {
    severity: 'minor' | 'moderate' | 'serious';
    weeksRemaining: number;
    /** Game week when the injury occurred */
    injuredWeek: number;
  };
  /** Monthly (every-4-weeks) development snapshots — populated by GameLoop */
  developmentLog?: DevelopmentSnapshot[];
}

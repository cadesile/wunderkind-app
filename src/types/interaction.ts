import { PersonalityMatrix } from './player';

// ─── Clique palette ───────────────────────────────────────────────────────────

export type CliquePaletteColor = 'coral' | 'sky' | 'lilac' | 'amber';

export const CLIQUE_PALETTE: Record<CliquePaletteColor, string> = {
  coral:  '#E8735A',
  sky:    '#5AB4E8',
  lilac:  '#A07DC8',
  amber:  '#E8B84B',
};

export const NO_GROUP_COLOR = '#4A6A6A'; // muted teal — distinct from WK semantic colours

// ─── Interaction categories ───────────────────────────────────────────────────

export type AmpPlayerSubtype =
  | 'walk_the_pitch_checkin'
  | 'walk_the_pitch_challenge'
  | 'support'
  | 'punish';

export type AmpCoachSubtype =
  | 'performance_review'
  | 'set_development_focus'
  | 'address_standards';

export type AmpGroupSubtype =
  | 'dressing_room_address'
  | 'full_staff_address';

export type NpcTrainingIncidentSubtype =
  | 'training_altercation'
  | 'verbal_confrontation'
  | 'player_mentoring'
  | 'coach_player_friction'
  | 'coach_player_breakthrough';

export type SystemSubtype =
  | 'training_assignment_change'
  | 'weekly_decay'
  | 'morale_ripple'
  | 'group_session_fatigue';

export type InteractionCategory =
  | 'AMP_PLAYER'
  | 'AMP_COACH'
  | 'AMP_GROUP'
  | 'NPC_TRAINING_INCIDENT'
  | 'SYSTEM';

export type InteractionSubtype =
  | AmpPlayerSubtype
  | AmpCoachSubtype
  | AmpGroupSubtype
  | NpcTrainingIncidentSubtype
  | SystemSubtype;

// ─── Core record ─────────────────────────────────────────────────────────────

export interface InteractionRecord {
  id: string;
  week: number;

  actorType: 'amp' | 'player' | 'coach' | 'system';
  /** 'amp' literal for AMP actions, entityId for NPC actors */
  actorId: string;

  targetType: 'player' | 'coach' | 'squad' | 'staff';
  /** entityId, 'squad_wide', or 'staff_wide' */
  targetId: string;

  category: InteractionCategory;
  subtype: InteractionSubtype;

  /** Change applied to the relationship ledger value at time of logging */
  relationshipDelta: number;
  /** Personality trait shifts applied at time of logging */
  traitDeltas: Partial<PersonalityMatrix>;
  /** Direct morale impact applied at time of logging */
  moraleDelta: number;

  /** Second player in a pair NPC event */
  secondaryTargetId?: string;
  /** Player/coach IDs who witnessed and received morale ripple */
  witnessIds?: string[];

  /** Whether the AMP can see this record in the interaction log */
  isVisibleToAmp: boolean;
  visibilityReason?: 'direct_action' | 'incident_report' | 'coaching_feedback';

  /** Human-readable summary shown in the player/coach profile interaction log */
  narrativeSummary: string;

  timestamp: string; // ISO 8601
}

// ─── Clique ───────────────────────────────────────────────────────────────────

export interface Clique {
  id: string;
  /** AMP-editable display name. Defaults to 'Group A', 'Group B', etc. */
  name: string;
  memberIds: string[];
  color: CliquePaletteColor;
  /** Average pairwise relationship value across all members */
  strength: number;
  formedWeek: number;
  /** Only true once strength ≥ 40 — controls visibility on squad screen */
  isDetected: boolean;
}

// ─── Dressing room health ─────────────────────────────────────────────────────

export interface DressingRoomHealth {
  /** 0–100: density of positive relationships across squad */
  cohesion: number;
  /** 0–100: proportion of negative relationships across squad */
  tension: number;
  /** Average morale across all active players */
  squadMoraleAverage: number;
  cliques: Clique[];
  lastComputedWeek: number;
}

// ─── Group session log ────────────────────────────────────────────────────────

export interface GroupSessionEntry {
  week: number;
  targetType: 'squad' | 'staff';
}

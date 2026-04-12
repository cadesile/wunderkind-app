export enum EventCategory {
  PLAYER = 'PLAYER',
  FACILITY = 'FACILITY',
  STAFF = 'STAFF',
  FINANCE = 'FINANCE',
  NPC_INTERACTION = 'NPC_INTERACTION',
  GUARDIAN = 'GUARDIAN',
}

export enum TargetType {
  PLAYER = 'player',
  FACILITY = 'facility',
  STAFF = 'staff',
  SQUAD_WIDE = 'squad_wide',
}

export enum StatOperator {
  ADD = 'add',
  SUBTRACT = 'subtract',
  SET = 'set',
}

export enum RelationshipType {
  RIVALRY = 'rivalry',
  FRIENDSHIP = 'friendship',
}

export interface SelectionLogic {
  target_type: TargetType;
  filter?: {
    position?: string;
    /** isActive=true only */
    active_only?: boolean;
    max_age?: number;
    min_age?: number;
    max_level?: number;
  };
  count: number;
}

export interface StatChange {
  /** 'player_1', 'player_2', 'squad_wide', 'facility_1', etc. */
  target: string;
  /** For players: a top-level Player field (e.g. 'overallRating'). For squad_wide same. */
  field: string;
  operator: StatOperator;
  value: number;
}

export interface Relationship {
  type: RelationshipType;
  player_1_ref: string;
  player_2_ref: string;
  intensity: number;
}

export interface DurationConfig {
  ticks: number;
  tick_effect?: StatChange;
  completion_event_slug: string;
}

export interface ManagerShift {
  temperament: number;
  discipline: number;
  ambition: number;
}

export interface EventChoice {
  emoji: string;
  label: string;
  stat_changes: StatChange[];
  manager_shift: ManagerShift;
}

export interface EventImpacts {
  selection_logic?: SelectionLogic;
  stat_changes?: StatChange[];
  relationships?: Relationship[];
  duration_config?: DurationConfig;
  choices?: EventChoice[];
}

export interface TraitRequirement {
  trait: import('./player').TraitName;
  min?: number;
  max?: number;
}

export interface NpcFiringConditions {
  maxSquadMorale?: number;
  minSquadMorale?: number;
  maxPairRelationship?: number;
  minPairRelationship?: number;
  requiresCoLocation?: boolean;
  actorTraitRequirements?: TraitRequirement[];
  subjectTraitRequirements?: TraitRequirement[];
}

export interface ChainLink {
  /** Slug of the event whose weight is boosted when this event fires */
  nextEventSlug: string;
  /** Multiplier applied to nextEventSlug's weight during selection (e.g. 4.0 = 4×) */
  boostMultiplier: number;
  /** Number of weeks the boost remains active after this event fires */
  windowWeeks: number;
}

export interface GameEventTemplate {
  id: string;
  slug: string;
  category: EventCategory;
  weight: number;
  title: string;
  bodyTemplate: string;
  impacts: EventImpacts;
  firingConditions?: NpcFiringConditions | null;
  severity?: 'minor' | 'major' | null;
  chainedEvents?: ChainLink[] | null;
}

export interface ActiveEffect {
  id: string;
  slug: string;
  affectedEntityId: string;
  ticksRemaining: number;
  tickEffect?: StatChange;
  completionEventSlug: string;
  startedAt: string;
}

export interface StatImpact {
  /** Human-readable label, e.g. "Malik Nakamura MORALE" */
  label: string;
  delta: number;   // signed, e.g. -5 or +8
  from: number;
  to: number;
}

export interface NarrativeMessage {
  id: string;
  title: string;
  body: string;
  isActionable: boolean;
  choices?: EventChoice[];
  affectedEntities: string[];
  statImpacts?: StatImpact[];
  createdAt: string;
  readAt?: string;
  respondedAt?: string;
}

export interface AgentOffer {
  id: string;
  eventId: string;
  agentId: string;
  agentName: string;
  /** Percentage, e.g. 10.5 = 10.5% */
  agentCommissionRate: number;
  playerId: string;
  playerName: string;
  /** Gross transfer fee in pence */
  estimatedFee: number;
  /** Post-agent proceeds in pence (before investor equity deduction, which is calculated at display/accept time) */
  netProceeds: number;
  destinationClub: string;
  week: number;
  expiresWeek: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

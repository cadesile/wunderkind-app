export interface PlayerArchetype {
  id: number;
  name: string;
  description: string;
  traitMapping: {
    /** trait name → weight (0–1); trait values are on the 1–20 scale */
    formula: Record<string, number>;
    /** minimum weighted score to match this archetype */
    threshold: number;
  };
}

export interface ArchetypeCache {
  archetypes: PlayerArchetype[];
  versionHash: string;
  lastFetched: number; // Unix timestamp (ms)
}

export interface ArchetypeMatch {
  archetype: PlayerArchetype;
  score: number;
}

export interface GameConfig {
  /** Minimum pairwise relationship value for clique eligibility. Default: 20 */
  cliqueRelationshipThreshold: number;
  /** Max % of active squad in cliques combined across all cliques. Default: 30 */
  cliqueSquadCapPercent: number;
  /** Minimum academy tenure in weeks before clique eligibility. Default: 3 */
  cliqueMinTenureWeeks: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  cliqueRelationshipThreshold: 20,
  cliqueSquadCapPercent: 30,
  cliqueMinTenureWeeks: 3,
};

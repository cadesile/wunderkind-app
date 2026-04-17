import { useWorldStore } from '../stores/worldStore';
import { useClubStore } from '../stores/clubStore';
import { useFixtureStore, Fixture } from '../stores/fixtureStore';
import { useTickProgressStore } from '../stores/tickProgressStore';
import { SelectionService } from './SelectionService';
import { ResultsEngine, SimTeam } from './ResultsEngine';
import { Player, Position } from '../types/player';
import { WorldPlayer, WorldClub } from '../types/world';

export class SimulationService {
  /**
   * Runs batch simulation for all fixtures of the current matchday.
   * Processes leagues in small batches to avoid blocking the main thread.
   */
  static async runBatchSimulation(): Promise<void> {
    const { startSimulation, endSimulation } = useTickProgressStore.getState();
    const { fixtures, currentMatchday, recordResult } = useFixtureStore.getState();
    const { clubs: worldClubs } = useWorldStore.getState();
    const { club: userClub, gameConfig } = useClubStore.getState();
    const { squad: userSquad } = (useClubStore.getState() as any); // Assuming squad is in clubStore or separate

    startSimulation();

    // 1. Filter fixtures for current week that haven't been played
    const currentFixtures = fixtures.filter(
      (f) => f.round === currentMatchday && f.result === null
    );

    const tacticalMatrix = gameConfig?.tacticalMatrix ?? {};

    // 2. Process in chunks
    const batchSize = 10;
    for (let i = 0; i < currentFixtures.length; i += batchSize) {
      const chunk = currentFixtures.slice(i, i + batchSize);
      
      for (const fixture of chunk) {
        const homeTeam = this.getSimTeam(fixture.homeClubId, worldClubs, userClub, userSquad);
        const awayTeam = this.getSimTeam(fixture.awayClubId, worldClubs, userClub, userSquad);

        if (homeTeam && awayTeam) {
          const result = ResultsEngine.simulate(homeTeam, awayTeam, tacticalMatrix);
          recordResult(fixture.id, {
            homeGoals: result.homeScore,
            awayGoals: result.awayScore,
            playedAt: new Date().toISOString(),
          });
        }
      }

      // Yield to UI thread
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    endSimulation();
  }

  private static getSimTeam(
    clubId: string,
    worldClubs: Record<string, WorldClub>,
    userClub: any,
    userSquad: Player[]
  ): SimTeam | null {
    // Check if it's the user's club
    if (userClub && clubId === userClub.id) {
      const xi = SelectionService.selectStartingXI(userSquad, (userClub.formation as any) ?? '4-4-2');
      return {
        xi,
        playingStyle: 'POSSESSION', // TODO: Get from club config
        managerAbility: 70, // TODO: Get from manager profile
      };
    }

    // Otherwise it's an NPC club from worldStore
    const club = worldClubs[clubId];
    if (!club) return null;

    const players = club.players.map(this.mapWorldPlayerToPlayer);
    const formation = (club as any).formation ?? '4-4-2';
    const xi = SelectionService.selectStartingXI(players, formation);

    return {
      xi,
      playingStyle: club.personality.playingStyle,
      managerAbility: 50 + (club.personality.managerTemperament / 10), // Approximate
    };
  }

  private static mapWorldPlayerToPlayer(wp: WorldPlayer): Player {
    return {
      id: wp.id,
      name: `${wp.firstName} ${wp.lastName}`,
      dateOfBirth: wp.dateOfBirth,
      age: 20, // Approximate
      position: (wp.position === 'ATT' ? 'FWD' : wp.position) as Position,
      nationality: wp.nationality,
      overallRating: this.calculateOverall(wp),
      morale: 50,
      potential: 3,
      wage: 0,
      personality: {
        determination: wp.maturity, // Map as needed
        professionalism: wp.maturity,
        ambition: wp.ego,
        loyalty: wp.loyalty,
        adaptability: 10,
        pressure: wp.maturity,
        temperament: 10,
        consistency: wp.maturity,
      },
      agentId: null,
      joinedWeek: 1,
      isActive: true,
      status: 'active',
    };
  }

  private static calculateOverall(wp: WorldPlayer): number {
    // Simple average of physical/technical attributes
    return Math.round((wp.pace + wp.technical + wp.vision + wp.power + wp.stamina + wp.heart) / 6);
  }
}

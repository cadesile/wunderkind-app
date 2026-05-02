import { useMutation } from '@tanstack/react-query';
import { syncWeek } from '@/api/endpoints/sync';
import { useClubStore } from '@/stores/clubStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useLeagueStore } from '@/stores/leagueStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { useWorldStore } from '@/stores/worldStore';
import { SyncRequest, SyncAcceptedResponse } from '@/types/api';

export function useSyncWeek() {
  const updateFromSyncResponse = useClubStore((s) => s.updateFromSyncResponse);
  const setTemplates            = useFacilityStore((s) => s.setTemplates);
  const setFromSync             = useLeagueStore((s) => s.setFromSync);
  const clearLeague             = useLeagueStore((s) => s.clear);
  const generateFixtures        = useFixtureStore((s) => s.generateFixtures);
  const clearSeason             = useFixtureStore((s) => s.clearSeason);
  const getUnsyncedResults      = useFixtureStore((s) => s.getUnsyncedResults);
  const markSynced              = useFixtureStore((s) => s.markSynced);
  const fixtures                = useFixtureStore((s) => s.fixtures);

  return useMutation({
    mutationFn: (payload: SyncRequest) => syncWeek(payload),
    onSuccess: (data) => {
      if (data.accepted) {
        const accepted = data as SyncAcceptedResponse;

        updateFromSyncResponse(accepted.club);

        if (accepted.facilityTemplates && accepted.facilityTemplates.length > 0) {
          setTemplates(accepted.facilityTemplates);
        }

        if (accepted.league === null) {
          clearLeague();
          clearSeason();
        } else {
          const currentLeague = useLeagueStore.getState().league;
          // Skip entirely if the sync response is from a previous season.
          if (!currentLeague || accepted.league.season >= currentLeague.season) {
            // Use worldStore as the authoritative source for NPC club membership.
            // The sync endpoint can return pre-transition club lists when it resolves
            // after applySeasonUpdate has already rewritten league memberships.
            const worldState = useWorldStore.getState();
            const worldLeague = worldState.leagues.find((l) => l.id === accepted.league!.id);
            const hasWorldClubs = Object.keys(worldState.clubs).length > 0;
            const clubs = (worldLeague && hasWorldClubs)
              ? worldLeague.clubIds.flatMap((id) => {
                  const c = worldState.clubs[id];
                  if (!c) return [];
                  return [{ id: c.id, name: c.name, reputation: c.reputation, tier: c.tier,
                            primaryColor: c.primaryColor, secondaryColor: c.secondaryColor,
                            stadiumName: c.stadiumName ?? null, facilities: c.facilities }];
                })
              : accepted.league.clubs;
            setFromSync({ ...accepted.league, clubs });

            const hasFixtures = fixtures.some(
              (f) => f.leagueId === accepted.league!.id && f.season === accepted.league!.season
            );
            if (!hasFixtures) {
              generateFixtures(accepted.league, accepted.club.id);
            }
          }
        }

        const unsynced = getUnsyncedResults();
        if (unsynced.length > 0) {
          markSynced(unsynced.map((f) => f.id));
        }
      } else {
        console.warn('[sync] Week rollback detected. Server week:', data.currentWeek);
      }
    },
    retry: 3,
  });
}

import { useMutation } from '@tanstack/react-query';
import { syncWeek } from '@/api/endpoints/sync';
import { useAcademyStore } from '@/stores/academyStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { useLeagueStore } from '@/stores/leagueStore';
import { useFixtureStore } from '@/stores/fixtureStore';
import { SyncRequest, SyncAcceptedResponse } from '@/types/api';

export function useSyncWeek() {
  const updateFromSyncResponse = useAcademyStore((s) => s.updateFromSyncResponse);
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

        updateFromSyncResponse(accepted.academy);

        if (accepted.facilityTemplates && accepted.facilityTemplates.length > 0) {
          setTemplates(accepted.facilityTemplates);
        }

        if (accepted.league === null) {
          clearLeague();
          clearSeason();
        } else {
          setFromSync(accepted.league);

          const hasFixtures = fixtures.some(
            (f) => f.leagueId === accepted.league!.id && f.season === accepted.league!.season
          );
          if (!hasFixtures) {
            generateFixtures(accepted.league, accepted.academy.id);
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

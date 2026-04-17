import { useMutation } from '@tanstack/react-query';
import { marketApi, MarketEntityType } from '@/api/endpoints/market';
import { useMarketStore } from '@/stores/marketStore';

interface AssignEntityVars {
  entityType: MarketEntityType;
  entityId: string;
}

/**
 * Mutation for assigning a market entity to the club.
 *
 * Optimistically removes the entity from the local market pool so it can't
 * be double-signed, then notifies the backend. On error the local pool is NOT
 * restored (the sync queue will reconcile on next launch).
 */
export function useAssignMarketEntity() {
  const removeFromMarket = useMarketStore((s) => s.removeFromMarket);

  return useMutation({
    mutationFn: ({ entityType, entityId }: AssignEntityVars) =>
      marketApi.assignEntity(entityType, entityId),
    onMutate: ({ entityType, entityId }) => {
      // Optimistic update — remove from available pool immediately
      removeFromMarket(entityType, entityId);
    },
    retry: 2,
  });
}

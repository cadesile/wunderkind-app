import { useMemo, useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ArrowLeftRight, ArrowDownLeft, ArrowUpRight, RefreshCw } from 'lucide-react-native';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { WK, pixelShadow } from '@/constants/theme';
import { useFinanceStore } from '@/stores/financeStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useSquadStore } from '@/stores/squadStore';
import { useWorldStore } from '@/stores/worldStore';
import { formatCurrencyCompact } from '@/utils/currency';
import type { TransferRecord } from '@/types/finance';

// ─── Data types ────────────────────────────────────────────────────────────────

type AmpItem = {
  kind: 'amp';
  week: number;
  record: TransferRecord;
  /** Player still exists in squad or world — name is tappable */
  playerExists: boolean;
  /** WorldStore club ID for the other club (destination or source) — null if not found */
  clubId: string | null;
};

type NpcItem = {
  kind: 'npc';
  week: number;
  playerName: string;
  fromClub: string;
  toClub: string;
  fromClubId: string | null;
  toClubId: string | null;
  fee: number; // pence
};

type TransferItem = AmpItem | NpcItem;

// ─── Filter tabs ───────────────────────────────────────────────────────────────

type Filter = 'all' | 'in' | 'out' | 'npc';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',  label: 'ALL'    },
  { key: 'in',   label: 'SIGNED' },
  { key: 'out',  label: 'SOLD'   },
  { key: 'npc',  label: 'OTHERS' },
];

// ─── Row helpers ───────────────────────────────────────────────────────────────

function typeLabel(record: TransferRecord): string {
  switch (record.type) {
    case 'signing':        return 'SIGNED';
    case 'sale':           return 'SOLD';
    case 'agent_assisted': return 'SOLD';
    case 'loan':           return 'LOAN';
    case 'free_release':   return record.direction === 'out' ? 'RELEASED' : 'FREE';
    default:               return record.type.toUpperCase();
  }
}

function stripeColor(item: TransferItem): string {
  if (item.kind === 'npc') return WK.tealLight;
  const { direction, type } = item.record;
  if (direction === 'in') return WK.green;
  if (type === 'sale' || type === 'agent_assisted') return WK.yellow;
  return WK.dim;
}

function badgeBgColor(item: TransferItem): string {
  if (item.kind === 'npc') return WK.tealMid;
  const { direction, type } = item.record;
  if (direction === 'in') return WK.green;
  if (type === 'sale' || type === 'agent_assisted') return WK.yellow;
  return WK.tealMid;
}

// ─── Row component ─────────────────────────────────────────────────────────────

function TransferRow({
  item,
  onPlayerPress,
  onClubPress,
}: {
  item: TransferItem;
  onPlayerPress?: () => void;
  onClubPress?: (clubId: string) => void;
}) {
  const stripe = stripeColor(item);
  const bgColor = badgeBgColor(item);

  const playerName =
    item.kind === 'amp' ? item.record.playerName : item.playerName;

  const fee = item.kind === 'amp' ? item.record.grossFee : item.fee;

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.border,
      flexDirection: 'row',
      ...pixelShadow,
    }}>
      {/* Coloured side stripe */}
      <View style={{ width: 4, backgroundColor: stripe }} />

      <View style={{ flex: 1, padding: 12, gap: 4 }}>
        {/* Top row: week + type badge + position */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <PixelText size={7} color={WK.dim}>WK {item.week}</PixelText>
          <View style={{ backgroundColor: bgColor, paddingHorizontal: 5, paddingVertical: 2 }}>
            <PixelText size={6} color={item.kind === 'npc' ? WK.dim : WK.border}>
              {item.kind === 'npc' ? 'NPC' : typeLabel(item.record)}
            </PixelText>
          </View>
          {item.kind === 'amp' && item.record.position && (
            <View style={{ backgroundColor: WK.tealMid, paddingHorizontal: 5, paddingVertical: 2 }}>
              <PixelText size={6} color={WK.dim}>{item.record.position}</PixelText>
            </View>
          )}
        </View>

        {/* Player name — tappable only when player still exists */}
        {onPlayerPress ? (
          <Pressable onPress={onPlayerPress} hitSlop={4}>
            <PixelText size={8} numberOfLines={1} color={WK.yellow}
              style={{ textDecorationLine: 'underline' }}>
              {playerName}
            </PixelText>
          </Pressable>
        ) : (
          <PixelText size={8} numberOfLines={1}>{playerName}</PixelText>
        )}

        {/* Club line */}
        {item.kind === 'amp' && (() => {
          const isIn = item.record.direction === 'in';
          const clubName = isIn
            ? (item.record.fromClub ?? 'Free Agent')
            : item.record.destinationClub;
          const Arrow = isIn ? ArrowDownLeft : ArrowUpRight;
          const arrowColor = isIn ? WK.green : WK.yellow;
          const tappable = item.clubId != null && onClubPress;

          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Arrow size={11} color={arrowColor} />
              {tappable ? (
                <Pressable onPress={() => onClubPress!(item.clubId!)} hitSlop={4}>
                  <BodyText size={10} color={WK.tealLight} numberOfLines={1}
                    style={{ textDecorationLine: 'underline' }}>
                    {clubName}
                  </BodyText>
                </Pressable>
              ) : (
                <BodyText size={10} color={WK.dim} numberOfLines={1}>{clubName}</BodyText>
              )}
            </View>
          );
        })()}

        {item.kind === 'npc' && (() => {
          const fromTappable = item.fromClubId != null && onClubPress;
          const toTappable   = item.toClubId   != null && onClubPress;

          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <ArrowLeftRight size={11} color={WK.tealLight} />
              {fromTappable ? (
                <Pressable onPress={() => onClubPress!(item.fromClubId!)} hitSlop={4}>
                  <BodyText size={10} color={WK.tealLight} numberOfLines={1}
                    style={{ textDecorationLine: 'underline' }}>
                    {item.fromClub}
                  </BodyText>
                </Pressable>
              ) : (
                <BodyText size={10} color={WK.dim} numberOfLines={1}>{item.fromClub}</BodyText>
              )}
              <BodyText size={10} color={WK.dim}>{' → '}</BodyText>
              {toTappable ? (
                <Pressable onPress={() => onClubPress!(item.toClubId!)} hitSlop={4}>
                  <BodyText size={10} color={WK.tealLight} numberOfLines={1}
                    style={{ textDecorationLine: 'underline' }}>
                    {item.toClub}
                  </BodyText>
                </Pressable>
              ) : (
                <BodyText size={10} color={WK.dim} numberOfLines={1}>{item.toClub}</BodyText>
              )}
            </View>
          );
        })()}
      </View>

      {/* Fee — right side */}
      {fee > 0 && (
        <View style={{ justifyContent: 'center', alignItems: 'flex-end', paddingRight: 12, paddingLeft: 6 }}>
          <PixelText size={8} color={WK.yellow}>{formatCurrencyCompact(fee)}</PixelText>
        </View>
      )}
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function TransferHistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');

  const ampRecords    = useFinanceStore((s) => s.transfers);
  const inboxMessages = useInboxStore((s) => s.messages);
  const squadPlayers  = useSquadStore((s) => s.players);
  const worldClubs    = useWorldStore((s) => s.clubs);

  // Precompute lookup maps
  const playerIdSet = useMemo<Set<string>>(() => {
    const ids = new Set(squadPlayers.map((p) => p.id));
    for (const club of Object.values(worldClubs)) {
      for (const p of club.players) ids.add(p.id);
    }
    return ids;
  }, [squadPlayers, worldClubs]);

  // Club name → club ID (case-sensitive match on worldStore names)
  const clubNameToId = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    for (const [id, club] of Object.entries(worldClubs)) {
      map.set(club.name, id);
    }
    return map;
  }, [worldClubs]);

  // Build unified enriched list
  const allItems = useMemo<TransferItem[]>(() => {
    const ampItems: AmpItem[] = ampRecords.map((r) => {
      const clubName = r.direction === 'in'
        ? (r.fromClub ?? null)
        : r.destinationClub;
      return {
        kind: 'amp',
        week: r.week,
        record: r,
        playerExists: playerIdSet.has(r.playerId),
        clubId: clubName ? (clubNameToId.get(clubName) ?? null) : null,
      };
    });

    const npcItems: NpcItem[] = [];
    for (const msg of inboxMessages) {
      if (msg.type !== 'system') continue;
      const meta = msg.metadata as Record<string, unknown> | undefined;
      if (meta?.systemType !== 'npc_transfers') continue;
      const transfers = meta.transfers as Array<{
        playerName: string; fromClub: string; toClub: string; fee: number;
      }> | undefined;
      if (!transfers) continue;
      for (const t of transfers) {
        npcItems.push({
          kind: 'npc',
          week: msg.week,
          playerName: t.playerName,
          fromClub: t.fromClub,
          toClub: t.toClub,
          fromClubId: clubNameToId.get(t.fromClub) ?? null,
          toClubId:   clubNameToId.get(t.toClub)   ?? null,
          fee: t.fee,
        });
      }
    }

    return [...ampItems, ...npcItems].sort((a, b) => b.week - a.week);
  }, [ampRecords, inboxMessages, playerIdSet, clubNameToId]);

  const filtered = useMemo<TransferItem[]>(() => {
    switch (filter) {
      case 'in':  return allItems.filter((i) => i.kind === 'amp' && i.record.direction === 'in');
      case 'out': return allItems.filter((i) => i.kind === 'amp' && i.record.direction === 'out');
      case 'npc': return allItems.filter((i) => i.kind === 'npc');
      default:    return allItems;
    }
  }, [allItems, filter]);

  function handlePlayerPress(item: AmpItem) {
    router.push(`/player/${item.record.playerId}`);
  }

  function handleClubPress(clubId: string) {
    router.push(`/club/${clubId}`);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      <PitchBackground />

      {/* Header */}
      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 4,
        borderBottomColor: WK.border,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
      }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={18} color={WK.text} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <ArrowLeftRight size={14} color={WK.yellow} />
          <PixelText size={9}>TRANSFERS</PixelText>
        </View>
        <PixelText size={7} color={WK.dim}>{filtered.length} RECORDS</PixelText>
      </View>

      {/* Filter tabs */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: WK.tealDark,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 8,
        height: 46,
      }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={{
                height: 30,
                paddingHorizontal: 12,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: active ? WK.yellow : WK.border,
                backgroundColor: active ? WK.yellow : WK.tealCard,
              }}
            >
              <PixelText size={7} color={active ? WK.border : WK.dim}>{f.label}</PixelText>
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      {filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <RefreshCw size={28} color={WK.dim} style={{ marginBottom: 12 }} />
          <PixelText size={8} color={WK.dim} style={{ textAlign: 'center' }}>NO TRANSFERS YET</PixelText>
          <BodyText size={11} color={WK.dim} style={{ textAlign: 'center', marginTop: 8 }}>
            Transfer activity will appear here once your club starts buying, selling, or releasing players.
          </BodyText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) =>
            item.kind === 'amp'
              ? item.record.id
              : `npc-${item.week}-${item.playerName}-${idx}`
          }
          renderItem={({ item }) => (
            <TransferRow
              item={item}
              onPlayerPress={
                item.kind === 'amp' && item.playerExists
                  ? () => handlePlayerPress(item)
                  : undefined
              }
              onClubPress={handleClubPress}
            />
          )}
          contentContainerStyle={{ padding: 10, gap: 8, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

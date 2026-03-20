import { useState } from 'react';
import { View, FlatList, Pressable, ScrollView, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { useRouter } from 'expo-router';
import { hapticTap } from '@/utils/haptics';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useInteractionStore } from '@/stores/interactionStore';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { PixelTopTabBar } from '@/components/ui/PixelTopTabBar';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Player } from '@/types/player';
import { Clique, CLIQUE_PALETTE, NO_GROUP_COLOR } from '@/types/interaction';
import { WK, traitColor, pixelShadow } from '@/constants/theme';

const SQUAD_TABS = ['PLAYERS', 'DRESSING ROOM'] as const;
type SquadTab = typeof SQUAD_TABS[number];

const POSITION_FILTERS = ['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const;
type PositionFilter = typeof POSITION_FILTERS[number];

// ─── Player card ──────────────────────────────────────────────────────────────

function PlayerCard({ player }: { player: Player }) {
  const router = useRouter();
  const cliques = useInteractionStore((s) => s.cliques);
  const playerClique = cliques.find((c) => c.isDetected && c.memberIds.includes(player.id));
  const cliqueColor = playerClique ? CLIQUE_PALETTE[playerClique.color] : NO_GROUP_COLOR;
  const cliqueLabel = playerClique ? playerClique.name.toUpperCase() : 'NO GROUP';

  const traitValues = [
    player.personality.determination,
    player.personality.professionalism,
    player.personality.ambition,
    player.personality.loyalty,
    player.personality.adaptability,
    player.personality.pressure,
    player.personality.temperament,
    player.personality.consistency,
  ];

  return (
    <Pressable onPress={() => { hapticTap(); router.push(`/player/${player.id}`); }}>
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.border,
        padding: 8,
        marginBottom: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        ...pixelShadow,
      }}>
        <Avatar appearance={player.appearance} role="PLAYER" size={44} />

        <View style={{ flex: 1 }}>
          <PixelText size={8} upper style={{ marginBottom: 2 }}>{player.name}</PixelText>
          <BodyText size={11} color={WK.tealLight}>{player.position} · AGE {player.age}</BodyText>
          <BodyText size={11} dim>{player.nationality}</BodyText>

          {/* 2×4 trait grid */}
          <View style={{ marginTop: 4, gap: 2 }}>
            {[0, 1].map((row) => (
              <View key={row} style={{ flexDirection: 'row', gap: 2 }}>
                {traitValues.slice(row * 4, row * 4 + 4).map((v, i) => (
                  <View
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      backgroundColor: traitColor(v),
                      borderWidth: 1,
                      borderColor: WK.border,
                    }}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* Clique tag */}
          <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{
              width: 8,
              height: 8,
              backgroundColor: cliqueColor,
              borderWidth: 2,
              borderColor: WK.border,
            }} />
            <BodyText size={11} color={cliqueColor}>{cliqueLabel}</BodyText>
          </View>
        </View>

        <Badge label={`${player.overallRating}`} color="yellow" />
      </View>
    </Pressable>
  );
}

// ─── Players pane ─────────────────────────────────────────────────────────────

function PlayersPane() {
  const [posFilter, setPosFilter] = useState<PositionFilter>('ALL');
  const allPlayers = useSquadStore((s) => s.players);

  const players = allPlayers
    .filter((p) => p.isActive && (posFilter === 'ALL' || p.position === posFilter))
    .sort((a, b) => b.overallRating - a.overallRating);

  return (
    <View style={{ flex: 1 }}>
      {/* Position filter bar */}
      <View style={{
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
      }}>
        {POSITION_FILTERS.map((pos) => {
          const active = posFilter === pos;
          return (
            <Pressable
              key={pos}
              onPress={() => { hapticTap(); setPosFilter(pos); }}
              style={{
                flex: 1,
                paddingVertical: 6,
                backgroundColor: active ? WK.yellow : WK.tealCard,
                borderWidth: 2,
                borderColor: active ? WK.yellow : WK.border,
                alignItems: 'center',
              }}
            >
              <PixelText size={6} color={active ? WK.border : WK.dim}>{pos}</PixelText>
            </Pressable>
          );
        })}
      </View>

      {players.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PixelText size={8} dim>NO PLAYERS</PixelText>
        </View>
      ) : (
        <FlatList
          data={players}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PlayerCard player={item} />}
          contentContainerStyle={{ padding: 10 }}
        />
      )}
    </View>
  );
}

// ─── Group session handler (module scope — uses .getState(), not hooks) ───────

function handleGroupSession(targetType: 'squad' | 'staff'): void {
  const weekNumber = useAcademyStore.getState().academy.weekNumber ?? 1;
  const groupSessionLog = useInteractionStore.getState().groupSessionLog;

  const recentUses = groupSessionLog.filter(
    (e) => e.targetType === targetType && e.week >= weekNumber - 4,
  ).length;

  const moraleDelta =
    recentUses <= 1 ? 8 :
    recentUses === 2 ? 4 :
    recentUses === 3 ? 1 :
    -3;

  if (targetType === 'squad') {
    const { players } = useSquadStore.getState();
    players
      .filter((p) => p.isActive)
      .forEach((p) => useSquadStore.getState().updateMorale(p.id, moraleDelta));
  } else {
    const { coaches } = useCoachStore.getState();
    coaches.forEach((c) => useCoachStore.getState().updateMorale(c.id, moraleDelta));
  }

  useInteractionStore.getState().logInteraction({
    week: weekNumber,
    actorType: 'amp',
    actorId: 'amp',
    targetType: targetType === 'squad' ? 'squad' : 'staff',
    targetId: targetType === 'squad' ? 'squad_wide' : 'staff_wide',
    category: 'AMP_GROUP',
    subtype: targetType === 'squad' ? 'dressing_room_address' : 'full_staff_address',
    relationshipDelta: 0,
    traitDeltas: {},
    moraleDelta,
    isVisibleToAmp: true,
    visibilityReason: 'direct_action',
    narrativeSummary: targetType === 'squad'
      ? `You addressed the squad. (${moraleDelta > 0 ? '+' : ''}${moraleDelta} morale)`
      : `You held a staff meeting. (${moraleDelta > 0 ? '+' : ''}${moraleDelta} morale)`,
  });

  useInteractionStore.getState().logGroupSession({ week: weekNumber, targetType });

  if (recentUses >= 3) {
    useInteractionStore.getState().logInteraction({
      week: weekNumber,
      actorType: 'system',
      actorId: 'system',
      targetType: targetType === 'squad' ? 'squad' : 'staff',
      targetId: targetType === 'squad' ? 'squad_wide' : 'staff_wide',
      category: 'SYSTEM',
      subtype: 'group_session_fatigue',
      relationshipDelta: 0,
      traitDeltas: {},
      moraleDelta: 0,
      isVisibleToAmp: true,
      visibilityReason: 'direct_action',
      narrativeSummary: 'Your group sessions are losing effect. The squad has heard it before.',
    });
  }
}

// ─── Dressing Room pane ───────────────────────────────────────────────────────

function DressingRoomPane({ onRenamePress }: { onRenamePress: (clique: Clique) => void }) {
  const health = useInteractionStore((s) => s.dressingRoomHealth);
  const cliques = useInteractionStore((s) => s.cliques);
  const activePlayers = useSquadStore((s) => s.players.filter((p) => p.isActive));
  const weekNumber = useAcademyStore((s) => s.academy.weekNumber ?? 1);
  const groupSessionLog = useInteractionStore((s) => s.groupSessionLog);

  const detectedCliques = cliques.filter((c) => c.isDetected);
  const cliquedIds = new Set(detectedCliques.flatMap((c) => c.memberIds));
  const noGroupCount = activePlayers.filter((p) => !cliquedIds.has(p.id)).length;

  function getUseCount(type: 'squad' | 'staff'): number {
    return groupSessionLog.filter(
      (e) => e.targetType === type && e.week >= weekNumber - 4,
    ).length;
  }

  function fatigueColor(uses: number): string {
    if (uses <= 1) return WK.green;
    if (uses === 2) return WK.yellow;
    if (uses === 3) return WK.orange;
    return WK.red;
  }

  const squadUses = getUseCount('squad');
  const staffUses = getUseCount('staff');

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>

      {/* ── Atmosphere card ─────────────────────────────────────────────────── */}
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.border,
        padding: 14,
        ...pixelShadow,
      }}>
        <PixelText size={8} upper color={WK.yellow}>DRESSING ROOM ATMOSPHERE</PixelText>

        {health === null ? (
          <BodyText size={13} dim style={{ marginTop: 10 }}>
            Advance a week to see atmosphere data.
          </BodyText>
        ) : (
          <>
            {health.tension > 60 && (
              <View style={{
                backgroundColor: 'rgba(200,30,30,0.15)',
                borderWidth: 2,
                borderColor: WK.red,
                padding: 6,
                marginTop: 8,
              }}>
                <PixelText size={6} color={WK.red}>⚠ VOLATILE — HIGH TENSION IN THE GROUP</PixelText>
              </View>
            )}

            {/* Cohesion bar */}
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <BodyText size={13} dim>COHESION</BodyText>
                <PixelText size={7} color={WK.green}>{health.cohesion}</PixelText>
              </View>
              <View style={{ height: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
                <View style={{ height: '100%', width: `${health.cohesion}%`, backgroundColor: WK.green }} />
              </View>
            </View>

            {/* Tension bar */}
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <BodyText size={13} dim>TENSION</BodyText>
                <PixelText size={7} color={WK.red}>{health.tension}</PixelText>
              </View>
              <View style={{ height: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
                <View style={{ height: '100%', width: `${health.tension}%`, backgroundColor: WK.red }} />
              </View>
            </View>

            {/* Avg morale bar */}
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <BodyText size={13} dim>AVG MORALE</BodyText>
                <PixelText size={7} color={WK.yellow}>{health.squadMoraleAverage}</PixelText>
              </View>
              <View style={{ height: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
                <View style={{ height: '100%', width: `${health.squadMoraleAverage}%`, backgroundColor: WK.yellow }} />
              </View>
            </View>
          </>
        )}
      </View>

      {/* ── Groups card ──────────────────────────────────────────────────────── */}
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.border,
        padding: 14,
        ...pixelShadow,
      }}>
        <PixelText size={8} upper color={WK.yellow}>GROUPS</PixelText>

        {detectedCliques.length === 0 ? (
          <>
            <BodyText size={13} dim style={{ marginTop: 8 }}>No groups have formed yet.</BodyText>
            <BodyText size={11} dim>Players bond through shared training over time.</BodyText>
          </>
        ) : (
          detectedCliques.map((clique) => (
            <Pressable
              key={clique.id}
              onPress={() => onRenamePress(clique)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: 2,
                borderBottomColor: WK.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{
                  width: 10,
                  height: 10,
                  backgroundColor: CLIQUE_PALETTE[clique.color],
                  borderWidth: 2,
                  borderColor: WK.border,
                }} />
                <PixelText size={7}>{clique.name.toUpperCase()}</PixelText>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <BodyText size={11} dim>{clique.memberIds.length} MEMBERS</BodyText>
                <BodyText size={11} color={WK.yellow}>[ RENAME ]</BodyText>
              </View>
            </Pressable>
          ))
        )}

        {/* No-group row — always shown */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 }}>
          <View style={{
            width: 10,
            height: 10,
            backgroundColor: NO_GROUP_COLOR,
            borderWidth: 2,
            borderColor: WK.border,
          }} />
          <BodyText size={13} color={NO_GROUP_COLOR}>NO GROUP</BodyText>
          <BodyText size={11} dim>— {noGroupCount} PLAYERS</BodyText>
        </View>
      </View>

      {/* ── Group sessions card ──────────────────────────────────────────────── */}
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.border,
        padding: 14,
        ...pixelShadow,
      }}>
        <PixelText size={8} upper color={WK.yellow} style={{ marginBottom: 12 }}>GROUP SESSIONS</PixelText>

        <Button
          label="ADDRESS THE SQUAD"
          variant="yellow"
          fullWidth
          onPress={() => handleGroupSession('squad')}
        />
        <View style={{ marginTop: 4, marginBottom: 12, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <BodyText size={11} color={fatigueColor(squadUses)}>{squadUses} uses in last 4 weeks</BodyText>
          {squadUses >= 4 && <BodyText size={11} color={WK.red}>— LOSING EFFECT</BodyText>}
        </View>

        <Button
          label="STAFF MEETING"
          variant="teal"
          fullWidth
          onPress={() => handleGroupSession('staff')}
        />
        <View style={{ marginTop: 4, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <BodyText size={11} color={fatigueColor(staffUses)}>{staffUses} uses in last 4 weeks</BodyText>
          {staffUses >= 4 && <BodyText size={11} color={WK.red}>— LOSING EFFECT</BodyText>}
        </View>
      </View>

    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SquadScreen() {
  const [activeTab, setActiveTab] = useState<SquadTab>('PLAYERS');
  const [renameTarget, setRenameTarget] = useState<Clique | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameClique = useInteractionStore((s) => s.renameClique);
  const activePlayers = useSquadStore((s) => s.players.filter((p) => p.isActive));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom']}>
      <PitchBackground />

      {/* Header */}
      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 4,
        borderBottomColor: WK.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <PixelText size={10} upper>SQUAD</PixelText>
        <PixelText size={8} color={WK.yellow}>{activePlayers.length} PLAYERS</PixelText>
      </View>

      <PixelTopTabBar
        tabs={[...SQUAD_TABS]}
        active={activeTab}
        onChange={(tab) => setActiveTab(tab as SquadTab)}
      />

      {activeTab === 'PLAYERS' ? (
        <PlayersPane />
      ) : (
        <DressingRoomPane
          onRenamePress={(clique) => {
            setRenameTarget(clique);
            setRenameValue(clique.name);
          }}
        />
      )}

      {/* Clique rename modal */}
      <Modal visible={renameTarget !== null} transparent animationType="fade">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          padding: 24,
        }}>
          <View style={{
            backgroundColor: WK.tealDark,
            borderWidth: 3,
            borderColor: WK.yellow,
            padding: 20,
            ...pixelShadow,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{
                width: 10,
                height: 10,
                backgroundColor: CLIQUE_PALETTE[renameTarget?.color ?? 'coral'],
              }} />
              <PixelText size={8} upper color={WK.yellow}>RENAME GROUP</PixelText>
            </View>

            <TextInput
              style={{
                marginTop: 16,
                backgroundColor: WK.tealCard,
                borderWidth: 3,
                borderColor: WK.yellow,
                color: WK.text,
                fontFamily: WK.font,
                fontSize: 9,
                padding: 10,
                borderRadius: 0,
              }}
              value={renameValue}
              onChangeText={setRenameValue}
              maxLength={20}
              autoFocus
            />

            <View style={{ marginTop: 16, flexDirection: 'row', gap: 8 }}>
              <Button
                label="SAVE"
                variant="yellow"
                disabled={renameValue.trim().length === 0}
                onPress={() => {
                  if (renameTarget && renameValue.trim()) {
                    renameClique(renameTarget.id, renameValue.trim());
                  }
                  setRenameTarget(null);
                }}
                style={{ flex: 1 }}
              />
              <Button
                label="CANCEL"
                variant="teal"
                onPress={() => setRenameTarget(null)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

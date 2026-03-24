import { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { PixelDialog } from '@/components/ui/PixelDialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSquadStore } from '@/stores/squadStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useInteractionStore } from '@/stores/interactionStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { FlagText } from '@/components/ui/FlagText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { AttributesRadar } from '@/components/radar/AttributesRadar';
import { WK, pixelShadow } from '@/constants/theme';
import { AttributeName } from '@/types/player';
import { getGameDate, computePlayerAge } from '@/utils/gameDate';
import { moraleLabel } from '@/utils/morale';
import { ScoutReportCard } from '@/components/ScoutReportCard';
import { DevelopmentChart } from '@/components/ui/DevelopmentChart';

// ─── Attribute bars (football skills) ────────────────────────────────────────

const ATTR_LABELS: Record<AttributeName, string> = {
  pace:      'PACE',
  technical: 'TECHNICAL',
  vision:    'VISION',
  power:     'POWER',
  stamina:   'STAMINA',
  heart:     'HEART',
};

/** Color for 0–100 scale: ≥70 yellow, ≥40 teal, <40 red */
function attrColor(value: number): string {
  if (value >= 70) return WK.yellow;
  if (value >= 40) return WK.tealLight;
  return WK.red;
}

function AttributeBar({ name, value }: { name: AttributeName; value: number }) {
  const pct = value;
  const color = attrColor(value);

  return (
    <View style={{ paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: WK.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <PixelText size={9} dim>{ATTR_LABELS[name]}</PixelText>
        <PixelText size={9} color={color}>{Math.round(value)}</PixelText>
      </View>
      <View style={{
        height: 6,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderWidth: 2,
        borderColor: WK.border,
      }}>
        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const player = useSquadStore((s) => s.players.find((p) => p.id === id));
  const releasePlayer = useSquadStore((s) => s.releasePlayer);
  const weekNumber = useAcademyStore((s) => s.academy.weekNumber ?? 1);
  const analyticsUnlocked = useFacilityStore((s) => s.levels.scoutingCenter > 0);

  // Contract metrics
  const weeksRemaining = player
    ? Math.max(0, (player.enrollmentEndWeek ?? 0) - weekNumber)
    : 0;
  const contractStatus =
    weeksRemaining >= 52 ? 'ACTIVE' :
    weeksRemaining >= 12 ? 'EXPIRING' :
    weeksRemaining > 0   ? 'CRITICAL' : 'NONE';
  const weeklyFee = Math.round((player?.wage ?? 0) / 100); // pence → pounds

  const [attrsExpanded, setAttrsExpanded] = useState(false);
  const [matrixExpanded, setMatrixExpanded] = useState(false);
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [releaseResultDialog, setReleaseResultDialog] = useState<{ title: string; message: string } | null>(null);
  const [lastAction, setLastAction] = useState<'SUPPORTED' | 'DISCIPLINED' | null>(null);

  const updatePlayer = useSquadStore((s) => s.updatePlayer);
  const logInteraction = useInteractionStore((s) => s.logInteraction);
  const interactionRecords = useInteractionStore((s) => s.records);

  const managementCooldown = useMemo(() => {
    const last = interactionRecords
      .filter((r) => r.actorId === 'amp' && r.targetId === id && (r.subtype === 'support' || r.subtype === 'punish'))
      .sort((a, b) => b.week - a.week)[0];
    if (!last) return { locked: false, availableWeek: weekNumber };
    const availableWeek = last.week + 4;
    return { locked: weekNumber < availableWeek, availableWeek };
  }, [interactionRecords, id, weekNumber]);

  const recentInteractions = useMemo(
    () =>
      interactionRecords
        .filter(
          (r) =>
            r.isVisibleToAmp &&
            (r.actorId === id || r.targetId === id || r.secondaryTargetId === id),
        )
        .slice(0, 5),
    [interactionRecords, id],
  );

  const gameDate = getGameDate(weekNumber);
  const displayAge = player?.dateOfBirth
    ? computePlayerAge(player.dateOfBirth, gameDate)
    : (player?.age ?? '?');

  // Radar fills available width minus card padding (16px card padding each side)
  const radarSize = screenWidth - 32;

  if (!player) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark, alignItems: 'center', justifyContent: 'center' }}>
        <PixelText size={8} dim>PLAYER NOT FOUND</PixelText>
      </SafeAreaView>
    );
  }

  const attrEntries = player.attributes
    ? (Object.entries(player.attributes) as [AttributeName, number][])
    : null;

  function handleSupport() {
    const p = player!;
    const moraleDelta = 5;
    updatePlayer(p.id, { morale: Math.min(100, (p.morale ?? 70) + moraleDelta) });
    logInteraction({
      week: weekNumber,
      actorType: 'amp',
      actorId: 'amp',
      targetType: 'player',
      targetId: p.id,
      category: 'AMP_PLAYER',
      subtype: 'support',
      relationshipDelta: 0,
      traitDeltas: {},
      moraleDelta,
      isVisibleToAmp: true,
      visibilityReason: 'direct_action',
      narrativeSummary: `You gave ${p.name} your support.`,
    });
    setLastAction('SUPPORTED');
    setTimeout(() => setLastAction(null), 2000);
  }

  function handlePunish() {
    const p = player!;
    const moraleDelta = -5;
    updatePlayer(p.id, { morale: Math.max(0, (p.morale ?? 70) + moraleDelta) });
    logInteraction({
      week: weekNumber,
      actorType: 'amp',
      actorId: 'amp',
      targetType: 'player',
      targetId: p.id,
      category: 'AMP_PLAYER',
      subtype: 'punish',
      relationshipDelta: 0,
      traitDeltas: {},
      moraleDelta,
      isVisibleToAmp: true,
      visibilityReason: 'direct_action',
      narrativeSummary: `You disciplined ${p.name}.`,
    });
    setLastAction('DISCIPLINED');
    setTimeout(() => setLastAction(null), 2000);
  }

  function handleRelease() {
    setShowReleaseDialog(true);
  }

  async function confirmRelease() {
    setShowReleaseDialog(false);
    const result = await releasePlayer(player.id);
    if (result.success) {
      setReleaseResultDialog({
        title: 'Player Released',
        message: `${result.playerName} has been returned to the market pool.`,
      });
    } else {
      setReleaseResultDialog({
        title: 'Error',
        message: result.error ?? 'Failed to release player.',
      });
    }
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
        <PixelText size={9} upper style={{ flex: 1 }} numberOfLines={1}>{player.name}</PixelText>
        <Badge label={`OVR ${player.overallRating}`} color="yellow" />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10, gap: 10 }}>

        {/* Player bio card */}
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          ...pixelShadow,
        }}>
          <Avatar appearance={player.appearance} role="PLAYER" size={100} morale={player.morale ?? 70} age={player.age} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <PixelText size={10} upper style={{ flex: 1 }} numberOfLines={2}>{player.name}</PixelText>
            </View>
            <PixelText size={7} color={WK.tealLight}>{player.position} · AGE {displayAge}</PixelText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <FlagText nationality={player.nationality} size={12} />
              <PixelText size={7} dim>{player.nationality}</PixelText>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <View>
                <PixelText size={6} dim>OVR</PixelText>
                <PixelText size={14} color={WK.tealLight}>{player.overallRating}</PixelText>
              </View>
            </View>
          </View>
        </View>

        {/* Injury status card — only shown when injured */}
        {player.injury && (() => {
          const { severity, weeksRemaining, injuredWeek } = player.injury!;
          const severityColor =
            severity === 'minor'    ? WK.yellow :
            severity === 'moderate' ? WK.orange  : WK.red;
          return (
            <View style={{
              backgroundColor: WK.tealCard,
              borderWidth: 3,
              borderColor: severityColor,
              padding: 14,
              ...pixelShadow,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <PixelText size={8} upper>Injury Status</PixelText>
                <View style={{
                  backgroundColor: severityColor,
                  borderWidth: 2,
                  borderColor: WK.border,
                  paddingHorizontal: 6,
                  paddingVertical: 3,
                }}>
                  <PixelText size={7} upper color={severity === 'minor' ? WK.border : WK.text}>
                    {severity}
                  </PixelText>
                </View>
              </View>
              <View style={{ borderTopWidth: 2, borderTopColor: WK.border, gap: 0 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: WK.border }}>
                  <PixelText size={7} dim>RECOVERY</PixelText>
                  <PixelText size={7} color={severityColor}>{weeksRemaining}w remaining</PixelText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                  <PixelText size={7} dim>INJURED WK</PixelText>
                  <PixelText size={7} dim>Week {injuredWeek}</PixelText>
                </View>
              </View>
            </View>
          );
        })()}

        {/* Football Attributes — collapsible */}
        {attrEntries && (
          <View style={{
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: WK.border,
            ...pixelShadow,
          }}>
            <Pressable
              onPress={() => setAttrsExpanded((v) => !v)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 14,
              }}
            >
              <PixelText size={8} upper>Attributes</PixelText>
              <PixelText size={8} color={WK.tealLight}>{attrsExpanded ? '▼' : '▶'}</PixelText>
            </Pressable>
            {attrsExpanded && (
              <View style={{ paddingHorizontal: 14, paddingBottom: 4 }}>
                {attrEntries.map(([name, value]) => (
                  <AttributeBar key={name} name={name} value={value} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Ability Matrix radar — collapsible */}
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          ...pixelShadow,
        }}>
          <Pressable
            onPress={() => setMatrixExpanded((v) => !v)}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 14,
            }}
          >
            <PixelText size={8} upper>Ability Matrix</PixelText>
            <PixelText size={8} color={WK.tealLight}>{matrixExpanded ? '▼' : '▶'}</PixelText>
          </Pressable>
          {matrixExpanded && player.attributes && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14, alignItems: 'center' }}>
              <AttributesRadar attributes={player.attributes} size={radarSize - 28} />
            </View>
          )}
          {matrixExpanded && !player.attributes && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <PixelText size={7} dim>No attribute data yet.</PixelText>
            </View>
          )}
        </View>

        {/* Development Chart — visible once 3+ monthly snapshots exist */}
        {(player.developmentLog?.length ?? 0) >= 3 && (
          <DevelopmentChart log={player.developmentLog!} />
        )}

        {/* Scout Report — personality archetype (no raw numbers) */}
        <ScoutReportCard player={player} />

        {/* Scouting Accuracy Report */}
        {player.scoutingReport && (
          <View style={{
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: WK.tealLight,
            padding: 14,
            ...pixelShadow,
          }}>
            <PixelText size={8} upper style={{ marginBottom: 10 }}>Scout Accuracy Report</PixelText>
            <PixelText size={6} dim style={{ marginBottom: 8 }}>
              Scouted by {player.scoutingReport.scoutName} · {player.scoutingReport.accuracyPercent}% accurate
            </PixelText>
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: WK.border }}>
                <PixelText size={6} dim>OVERALL RATING</PixelText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <PixelText size={6} color={WK.dim}>{player.scoutingReport.perceivedOverall}</PixelText>
                  <PixelText size={6} dim>→</PixelText>
                  <PixelText size={7} color={WK.green}>{player.scoutingReport.actualOverall}</PixelText>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
                <PixelText size={6} dim>POTENTIAL</PixelText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <PixelText size={6} color={WK.dim}>{player.scoutingReport.perceivedPotential}</PixelText>
                  <PixelText size={6} dim>→</PixelText>
                  <PixelText size={7} color={WK.green}>{player.scoutingReport.actualPotential}</PixelText>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Social Graph */}
        {(player.relationships ?? []).length > 0 && (
          <View style={{
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: WK.border,
            padding: 14,
            ...pixelShadow,
          }}>
            <PixelText size={8} upper style={{ marginBottom: 10 }}>Social Graph</PixelText>
            {(player.relationships ?? []).map((rel) => {
              const name = (() => {
                if (rel.type === 'coach') {
                  const c = require('@/stores/coachStore').useCoachStore.getState().coaches.find((x: { id: string }) => x.id === rel.id);
                  return c ? `${c.name} (Coach)` : 'Unknown Coach';
                }
                if (rel.type === 'scout') {
                  const s = require('@/stores/scoutStore').useScoutStore.getState().scouts.find((x: { id: string }) => x.id === rel.id);
                  return s ? `${s.name} (Scout)` : 'Unknown Scout';
                }
                const p = require('@/stores/squadStore').useSquadStore.getState().players.find((x: { id: string }) => x.id === rel.id);
                return p ? p.name : 'Unknown Player';
              })();
              const isPositive = rel.value >= 0;
              return (
                <View key={rel.id} style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 8,
                  borderBottomWidth: 2,
                  borderBottomColor: WK.border,
                }}>
                  <PixelText size={6} style={{ flex: 1 }} numberOfLines={1}>{name}</PixelText>
                  <PixelText size={6} color={isPositive ? WK.green : WK.red}>
                    {isPositive ? `TRUST +${rel.value}` : `CONFLICT ${rel.value}`}
                  </PixelText>
                </View>
              );
            })}
          </View>
        )}

        {/* Assigned Coach */}
        {player.assignedCoachId && (() => {
          const assignedCoach = require('@/stores/coachStore').useCoachStore.getState().coaches.find(
            (c: { id: string }) => c.id === player.assignedCoachId,
          );
          if (!assignedCoach) return null;
          const bond = (player.relationships ?? []).find((r) => r.id === assignedCoach.id);
          return (
            <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 14, ...pixelShadow }}>
              <PixelText size={8} upper style={{ marginBottom: 8 }}>Assigned Coach</PixelText>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <PixelText size={7}>{assignedCoach.name}</PixelText>
                  <PixelText size={6} dim>{assignedCoach.role}</PixelText>
                </View>
                {bond && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <PixelText size={7} color={bond.value >= 0 ? WK.green : WK.red}>
                      {bond.value >= 0 ? `+${bond.value}` : `${bond.value}`}
                    </PixelText>
                    <PixelText size={6} dim>
                      {bond.value >= 0 ? `+${Math.round(bond.value / 2)}% XP` : `${Math.round(bond.value / 2)}% XP`}
                    </PixelText>
                  </View>
                )}
              </View>
            </View>
          );
        })()}

        {/* Contract Info */}
        {player.enrollmentEndWeek !== undefined && (
          <View style={{
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: contractStatus === 'CRITICAL' ? WK.red : contractStatus === 'EXPIRING' ? WK.orange : WK.yellow,
            padding: 14,
            ...pixelShadow,
          }}>
            <PixelText size={8} upper style={{ marginBottom: 10 }}>Enrollment Contract</PixelText>

            {/* Status badge row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                backgroundColor:
                  contractStatus === 'ACTIVE'   ? WK.green :
                  contractStatus === 'EXPIRING' ? WK.orange : WK.red,
              }}>
                <PixelText size={7} color={WK.text}>
                  {contractStatus === 'ACTIVE'   ? 'ACTIVE' :
                   contractStatus === 'EXPIRING' ? 'EXPIRING' : 'CRITICAL'}
                </PixelText>
              </View>
              <PixelText size={7} dim>{weeksRemaining}w remaining</PixelText>
            </View>

            <View style={{ borderTopWidth: 2, borderTopColor: WK.border, paddingTop: 10, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <PixelText size={7} dim>WEEKLY FEE</PixelText>
                <PixelText size={7} color={WK.tealLight}>£{weeklyFee}/wk</PixelText>
              </View>
              {player.morale !== undefined && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <PixelText size={7} dim>MORALE</PixelText>
                  <PixelText size={7} color={player.morale >= 60 ? WK.green : player.morale >= 40 ? WK.yellow : WK.red}>{moraleLabel(player.morale)}</PixelText>
                </View>
              )}
              {(player.extensionCount ?? 0) > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <PixelText size={7} dim>EXTENSIONS</PixelText>
                  <PixelText size={7} color={WK.dim}>{player.extensionCount}</PixelText>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Support / Punish */}
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 14,
          ...pixelShadow,
        }}>
          <PixelText size={8} upper style={{ marginBottom: 10 }}>Management</PixelText>
          {lastAction && (
            <View style={{
              marginBottom: 10,
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderWidth: 2,
              borderColor: lastAction === 'SUPPORTED' ? WK.green : WK.red,
              alignItems: 'center',
            }}>
              <PixelText size={7} color={lastAction === 'SUPPORTED' ? WK.green : WK.red}>
                ✓ {lastAction}
              </PixelText>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={managementCooldown.locked ? undefined : handleSupport}
              style={{
                flex: 1,
                backgroundColor: managementCooldown.locked ? WK.tealMid : WK.green,
                borderWidth: 2,
                borderColor: WK.border,
                padding: 10,
                alignItems: 'center',
                opacity: managementCooldown.locked ? 0.45 : 1,
              }}
            >
              <PixelText size={7} color={managementCooldown.locked ? WK.dim : WK.text}>SUPPORT</PixelText>
            </Pressable>
            <Pressable
              onPress={managementCooldown.locked ? undefined : handlePunish}
              style={{
                flex: 1,
                backgroundColor: managementCooldown.locked ? WK.tealMid : WK.red,
                borderWidth: 2,
                borderColor: WK.border,
                padding: 10,
                alignItems: 'center',
                opacity: managementCooldown.locked ? 0.45 : 1,
              }}
            >
              <PixelText size={7} color={managementCooldown.locked ? WK.dim : WK.text}>PUNISH</PixelText>
            </Pressable>
          </View>
          {managementCooldown.locked && (
            <PixelText size={6} dim style={{ marginTop: 8, textAlign: 'center' }}>
              AVAILABLE WK {managementCooldown.availableWeek}
            </PixelText>
          )}
        </View>

        {/* Recent Interactions */}
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 14,
          marginTop: 12,
          ...pixelShadow,
        }}>
          <PixelText size={8} upper color={WK.yellow} style={{ marginBottom: 10 }}>RECENT INTERACTIONS</PixelText>

          {recentInteractions.length === 0 ? (
            <BodyText size={13} dim>No interactions recorded yet.</BodyText>
          ) : (
            recentInteractions.map((record) => (
              <View key={record.id} style={{
                flexDirection: 'row',
                gap: 8,
                paddingVertical: 6,
                borderBottomWidth: 2,
                borderBottomColor: WK.border,
                alignItems: 'flex-start',
              }}>
                <PixelText size={6} color={WK.yellow} style={{ minWidth: 36 }}>
                  WK {record.week}
                </PixelText>
                <BodyText size={12} dim style={{ flex: 1, lineHeight: 16 }}>
                  {record.narrativeSummary}
                </BodyText>
              </View>
            ))
          )}
        </View>

        {/* Release player */}
        <View style={{
          borderWidth: 3,
          borderColor: WK.red,
          padding: 14,
          marginTop: 6,
        }}>
          <PixelText size={7} color={WK.red} style={{ marginBottom: 8 }}>RELEASE PLAYER</PixelText>
          <PixelText size={6} dim style={{ marginBottom: 12 }}>
            Return {player.name} to the market pool. No transfer fee received.
          </PixelText>
          <Pressable
            onPress={handleRelease}
            style={{
              backgroundColor: WK.red,
              borderWidth: 2,
              borderColor: '#8b0000',
              padding: 10,
              alignItems: 'center',
            }}
          >
            <PixelText size={7} color={WK.text}>RELEASE TO POOL</PixelText>
          </Pressable>
        </View>

      </ScrollView>

      {/* Release confirmation */}
      <PixelDialog
        visible={showReleaseDialog}
        title="Release Player?"
        message={`Release ${player.name} back to the market pool? No transfer fee is received.`}
        onClose={() => setShowReleaseDialog(false)}
        onConfirm={confirmRelease}
        confirmLabel="RELEASE"
        confirmVariant="red"
      />

      {/* Release result */}
      <PixelDialog
        visible={!!releaseResultDialog}
        title={releaseResultDialog?.title ?? ''}
        message={releaseResultDialog?.message ?? ''}
        onClose={() => {
          const wasSuccess = releaseResultDialog?.title === 'Player Released';
          setReleaseResultDialog(null);
          if (wasSuccess) router.back();
        }}
      />
    </SafeAreaView>
  );
}

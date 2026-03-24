import { useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import useAcademyMetrics from '@/hooks/useAcademyMetrics';
import { useInboxStore } from '@/stores/inboxStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useArchetypeStore } from '@/stores/archetypeStore';
import { useSquadStore } from '@/stores/squadStore';
import { useCoachStore } from '@/stores/coachStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { FACILITY_DEFS } from '@/types/facility';
import { getArchetypeForPlayer } from '@/engine/archetypeEngine';
import { penceToPounds, formatCurrencyCompact } from '@/utils/currency';
import { FlagText } from '@/components/ui/FlagText';
import { Avatar } from '@/components/ui/Avatar';
import { PixelText } from '@/components/ui/PixelText';
import { Badge } from '@/components/ui/Badge';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { WK, pixelShadow } from '@/constants/theme';
import { InboxMessage } from '@/stores/inboxStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_ORDER = ['Local', 'Regional', 'National', 'Elite'] as const;


function msgTypeColor(type: InboxMessage['type']): 'yellow' | 'green' | 'red' | 'dim' {
  switch (type) {
    case 'investor': return 'green';
    case 'sponsor':  return 'yellow';
    case 'agent':    return 'yellow';
    case 'guardian': return 'dim';
    default:         return 'dim';
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ children, borderColor = WK.border }: {
  children: React.ReactNode;
  borderColor?: string;
}) {
  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor,
      marginHorizontal: 10,
      marginBottom: 10,
      padding: 14,
      ...pixelShadow,
    }}>
      {children}
    </View>
  );
}

function StatRow({ label, value, valueColor }: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 7,
      borderBottomWidth: 2,
      borderBottomColor: WK.border,
    }}>
      <PixelText size={6} dim upper>{label}</PixelText>
      <PixelText size={7} color={valueColor ?? WK.tealLight}>{value}</PixelText>
    </View>
  );
}

// ─── Roster pie chart ─────────────────────────────────────────────────────────

function RosterPieChart({ playerCount, coachCount }: { playerCount: number; coachCount: number }) {
  const total = playerCount + coachCount;
  if (total === 0) return null;

  const SIZE = 110;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const r  = SIZE / 2 - 6;

  function polarToCartesian(deg: number) {
    const rad = (deg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function slicePath(startDeg: number, endDeg: number): string {
    // Full circle edge case
    if (Math.abs(endDeg - startDeg) >= 359.99) {
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
    }
    const s = polarToCartesian(startDeg);
    const e = polarToCartesian(endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
  }

  const playerDeg = (playerCount / total) * 360;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      {/* Pie */}
      <Svg width={SIZE} height={SIZE}>
        <Path d={slicePath(0, playerDeg)} fill={WK.tealLight} />
        <Path d={slicePath(playerDeg, 360)} fill={WK.yellow} />
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={WK.border} strokeWidth={3} />
        {/* Centre hole for donut feel */}
        <Circle cx={cx} cy={cy} r={r * 0.35} fill={WK.tealCard} stroke={WK.border} strokeWidth={2} />
      </Svg>

      {/* Legend */}
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, backgroundColor: WK.tealLight, borderWidth: 2, borderColor: WK.border }} />
          <View>
            <PixelText size={6} dim>PLAYERS</PixelText>
            <PixelText size={10} color={WK.tealLight}>{playerCount}</PixelText>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, backgroundColor: WK.yellow, borderWidth: 2, borderColor: WK.border }} />
          <View>
            <PixelText size={6} dim>COACHES</PixelText>
            <PixelText size={10} color={WK.yellow}>{coachCount}</PixelText>
          </View>
        </View>
        {coachCount > 0 && (
          <View style={{ borderTopWidth: 2, borderTopColor: WK.border, paddingTop: 8 }}>
            <PixelText size={5} dim>RATIO</PixelText>
            <PixelText size={7} color={WK.dim}>
              {Math.round(playerCount / coachCount)}:1
            </PixelText>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AcademyDashboard() {
  const router = useRouter();
  const {
    totalValuation,
    reputationBonusPct,
    currentTier,
    nextTier,
    tierProgressPct,
    crownJewel,
    squadTotalPotential,
    cashBalance,
    weeklyNetCashflow,
  } = useAcademyMetrics();

  const messages = useInboxStore((s) => s.messages);
  const academy = useAcademyStore((s) => s.academy);
  const archetypes = useArchetypeStore((s) => s.archetypes);
  const players = useSquadStore((s) => s.players);
  const coaches = useCoachStore((s) => s.coaches);
  const { levels, conditions } = useFacilityStore();
  const crownJewelArchetype = crownJewel
    ? getArchetypeForPlayer(crownJewel, archetypes)
    : null;

  // Most-recent 3 messages (store is newest-first)
  const recentMessages = messages.slice(0, 3);

  // ── Medical report ───────────────────────────────────────────────────────────
  const injuredPlayers = players.filter((p) => p.injury && p.injury.weeksRemaining > 0);
  const minorCount    = injuredPlayers.filter((p) => p.injury!.severity === 'minor').length;
  const moderateCount = injuredPlayers.filter((p) => p.injury!.severity === 'moderate').length;
  const seriousCount  = injuredPlayers.filter((p) => p.injury!.severity === 'serious').length;

  // ── Facilities summary ───────────────────────────────────────────────────────
  const builtFacilities = FACILITY_DEFS.filter((def) => levels[def.type] > 0);

  // ── Derived display values ───────────────────────────────────────────────────
  const cashPounds        = penceToPounds(cashBalance);
  const isDeficit         = weeklyNetCashflow < 0;
  const tickDeltaPounds   = penceToPounds(weeklyNetCashflow);
  const tickDeltaColor    = isDeficit ? WK.red : WK.green;
  const tickDeltaSign     = isDeficit ? '-' : '+';
  const willGoNegative    = cashBalance + weeklyNetCashflow < 0;
  const careerSalesPounds = penceToPounds(academy.totalCareerEarnings);

  // ── Deficit pulse animation ──────────────────────────────────────────────────
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (willGoNegative) {
      pulseOpacity.value = withRepeat(withTiming(0.3, { duration: 800 }), -1, true);
    } else {
      pulseOpacity.value = 1;
    }
  }, [willGoNegative]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  const tierIdx  = TIER_ORDER.indexOf(currentTier);
  const nextLabel = nextTier ?? 'MAX';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 10, paddingBottom: 24 }}>
      <PitchBackground />

      {/* ── Card 1: Valuation Hero ────────────────────────────────────────── */}
      <SectionCard borderColor={WK.yellow}>
        <PixelText size={7} dim upper style={{ marginBottom: 6 }}>Academy Value</PixelText>

        <PixelText size={22} color={WK.yellow} numberOfLines={1}>
          {formatCurrencyCompact(totalValuation)}
        </PixelText>

        <PixelText size={6} color={WK.green} style={{ marginTop: 4 }}>
          +{reputationBonusPct.toFixed(1)}% REPUTATION BONUS
        </PixelText>

        {/* Tier progress bar */}
        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <PixelText size={6} color={WK.yellow} upper>{currentTier}</PixelText>
            <PixelText size={6} dim upper>{nextLabel}</PixelText>
          </View>
          <View style={{
            height: 8,
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderWidth: 2,
            borderColor: WK.border,
          }}>
            <View style={{
              height: '100%',
              width: `${tierProgressPct}%`,
              backgroundColor: WK.yellow,
            }} />
          </View>
          <PixelText size={5} dim style={{ marginTop: 4, textAlign: 'right' }}>
            {tierProgressPct.toFixed(0)}% through {currentTier}
          </PixelText>
        </View>
      </SectionCard>

      {/* ── Card 2: Financial Status ──────────────────────────────────────── */}
      <View style={{
        flexDirection: 'row',
        marginHorizontal: 10,
        marginBottom: willGoNegative ? 6 : 10,
        gap: 10,
      }}>
        {/* Cash balance + next tick delta */}
        <View style={{
          flex: 1,
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 12,
          ...pixelShadow,
        }}>
          <PixelText size={6} dim upper style={{ marginBottom: 6 }}>Cash</PixelText>
          <PixelText
            size={10}
            color={cashPounds >= 0 ? WK.tealLight : WK.red}
            numberOfLines={1}
          >
            {cashPounds < 0 ? '-' : ''}£{Math.abs(cashPounds).toLocaleString()}
          </PixelText>
          <PixelText size={5} color={tickDeltaColor} style={{ marginTop: 5 }}>
            {tickDeltaSign}£{Math.abs(tickDeltaPounds).toLocaleString()} NEXT TICK
          </PixelText>
        </View>

        {/* Career sales earnings */}
        <View style={{
          flex: 1,
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 12,
          ...pixelShadow,
        }}>
          <PixelText size={6} dim upper style={{ marginBottom: 6 }}>Sales</PixelText>
          <PixelText size={10} color={WK.green} numberOfLines={1}>
            £{careerSalesPounds.toLocaleString()}
          </PixelText>
          <PixelText size={5} dim style={{ marginTop: 5 }}>CAREER TOTAL</PixelText>
        </View>
      </View>

      {/* ── Negative balance warning ──────────────────────────────────────── */}
      {willGoNegative && (
        <Animated.View style={[
          {
            marginHorizontal: 10,
            marginBottom: 10,
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderWidth: 2,
            borderColor: WK.red,
            paddingHorizontal: 12,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          },
          pulseStyle,
        ]}>
          <View style={{ width: 6, height: 6, backgroundColor: WK.red }} />
          <PixelText size={6} color={WK.red}>
            BALANCE WILL BE NEGATIVE AFTER NEXT TICK
          </PixelText>
        </Animated.View>
      )}

      {/* ── Card 3: Crown Jewel player ────────────────────────────────────── */}
      {crownJewel ? (
        <Pressable onPress={() => router.push(`/player/${crownJewel.id}`)}>
          <SectionCard borderColor={WK.tealLight}>
            <PixelText size={7} dim upper style={{ marginBottom: 10 }}>Crown Jewel</PixelText>

            {/* Top row: avatar + name/position/nationality */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <Avatar
                appearance={crownJewel.appearance}
                role="PLAYER"
                size={56}
                morale={crownJewel.morale ?? 70}
                age={crownJewel.age}
              />
              <View style={{ flex: 1 }}>
                <PixelText size={8} upper numberOfLines={1}>{crownJewel.name}</PixelText>
                <PixelText size={6} color={WK.tealLight} style={{ marginTop: 3 }}>
                  {crownJewel.position} · AGE {crownJewel.age}
                </PixelText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
                  <FlagText nationality={crownJewel.nationality} size={16} />
                  <PixelText size={6} dim>{crownJewel.nationality}</PixelText>
                </View>
              </View>
              <Badge label={`OVR ${crownJewel.overallRating}`} color="yellow" />
            </View>

            {/* Archetype row */}
            {crownJewelArchetype && (
              <View style={{
                borderTopWidth: 2,
                borderTopColor: WK.border,
                paddingTop: 8,
              }}>
                <View style={{
                  backgroundColor: WK.yellow,
                  borderWidth: 2,
                  borderColor: WK.border,
                  paddingHorizontal: 6,
                  paddingVertical: 3,
                  alignSelf: 'flex-start',
                  marginBottom: 6,
                }}>
                  <PixelText size={6} color={WK.border}>{crownJewelArchetype.name.toUpperCase()}</PixelText>
                </View>
                <PixelText size={6} dim style={{ lineHeight: 12 }}>
                  {crownJewelArchetype.description}
                </PixelText>
              </View>
            )}
          </SectionCard>
        </Pressable>
      ) : (
        <SectionCard>
          <PixelText size={7} dim upper style={{ marginBottom: 6 }}>Crown Jewel</PixelText>
          <PixelText size={7} dim>No players enrolled yet.</PixelText>
        </SectionCard>
      )}

      {/* ── Card 4: Medical Report ───────────────────────────────────────── */}
      <SectionCard>
        <PixelText size={7} dim upper style={{ marginBottom: 10 }}>Medical Report</PixelText>
        {injuredPlayers.length === 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, backgroundColor: WK.green }} />
            <PixelText size={7} color={WK.green}>ALL CLEAR</PixelText>
          </View>
        ) : (
          <>
            {seriousCount > 0 && (
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingVertical: 7, borderBottomWidth: 2, borderBottomColor: WK.border,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: WK.red }} />
                  <PixelText size={6} dim upper>Serious</PixelText>
                </View>
                <PixelText size={7} color={WK.red}>{seriousCount} player{seriousCount !== 1 ? 's' : ''}</PixelText>
              </View>
            )}
            {moderateCount > 0 && (
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingVertical: 7, borderBottomWidth: 2, borderBottomColor: WK.border,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: WK.orange }} />
                  <PixelText size={6} dim upper>Moderate</PixelText>
                </View>
                <PixelText size={7} color={WK.orange}>{moderateCount} player{moderateCount !== 1 ? 's' : ''}</PixelText>
              </View>
            )}
            {minorCount > 0 && (
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingVertical: 7,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: WK.yellow }} />
                  <PixelText size={6} dim upper>Minor</PixelText>
                </View>
                <PixelText size={7} color={WK.yellow}>{minorCount} player{minorCount !== 1 ? 's' : ''}</PixelText>
              </View>
            )}
          </>
        )}
      </SectionCard>

      {/* ── Card 5: Facilities ────────────────────────────────────────────── */}
      <SectionCard>
        <PixelText size={7} dim upper style={{ marginBottom: 10 }}>Facilities</PixelText>
        {builtFacilities.length === 0 ? (
          <PixelText size={7} dim>No facilities built yet.</PixelText>
        ) : (
          <>
            {/* Header row */}
            <View style={{ flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: WK.border }}>
              <View style={{ flex: 1 }}>
                <PixelText size={5} dim upper>Facility</PixelText>
              </View>
              <View style={{ width: 40, alignItems: 'center' }}>
                <PixelText size={5} dim upper>LVL</PixelText>
              </View>
              <View style={{ width: 56, alignItems: 'flex-end' }}>
                <PixelText size={5} dim upper>Cond.</PixelText>
              </View>
            </View>
            {builtFacilities.map((def) => {
              const lvl  = levels[def.type];
              const cond = Math.round(conditions[def.type]);
              const condColor = cond >= 60 ? WK.tealLight : cond >= 30 ? WK.orange : WK.red;
              return (
                <View
                  key={def.type}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 7, borderBottomWidth: 2, borderBottomColor: WK.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <PixelText size={6} numberOfLines={1}>{def.label}</PixelText>
                  </View>
                  <View style={{ width: 40, alignItems: 'center' }}>
                    <PixelText size={6} color={WK.yellow}>{lvl}</PixelText>
                  </View>
                  <View style={{ width: 56, alignItems: 'flex-end' }}>
                    <PixelText size={6} color={condColor}>{cond}%</PixelText>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </SectionCard>

      {/* ── Cards 6 & 7: Roster balance + Squad potential (side by side) ─── */}
      <View style={{ flexDirection: 'row', marginHorizontal: 10, marginBottom: 10, gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 14, ...pixelShadow }}>
          <PixelText size={7} dim upper style={{ marginBottom: 12 }}>Roster Balance</PixelText>
          <RosterPieChart playerCount={players.filter(p => p.isActive).length} coachCount={coaches.length} />
        </View>
        <View style={{ flex: 1, backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 14, ...pixelShadow }}>
        <StatRow
          label="Squad Potential"
          value={`${squadTotalPotential} ★ total`}
          valueColor={WK.yellow}
        />
        <StatRow
          label="Reputation"
          value={`${academy.reputation.toFixed(1)} / 100`}
          valueColor={WK.tealLight}
        />
        <View style={{ paddingTop: 2 }}>
          <StatRow
            label="Tier"
            value={currentTier.toUpperCase()}
            valueColor={WK.orange}
          />
        </View>
        </View>
      </View>

      {/* ── Card 7: Inbox preview ─────────────────────────────────────────── */}
      <SectionCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <PixelText size={7} upper>Inbox</PixelText>
          <Pressable
            onPress={() => router.push('/inbox')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            hitSlop={8}
          >
            <PixelText size={6} color={WK.tealLight}>VIEW ALL</PixelText>
            <ChevronRight size={12} color={WK.tealLight} />
          </Pressable>
        </View>

        {recentMessages.length === 0 ? (
          <PixelText size={7} dim>No messages yet.</PixelText>
        ) : (
          recentMessages.map((msg) => (
            <View
              key={msg.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 8,
                borderBottomWidth: 2,
                borderBottomColor: WK.border,
              }}
            >
              {/* Unread indicator dot */}
              <View style={{
                width: 6,
                height: 6,
                backgroundColor: msg.isRead ? 'transparent' : WK.yellow,
                borderWidth: msg.isRead ? 0 : 1,
                borderColor: WK.yellow,
              }} />
              <View style={{ flex: 1 }}>
                <PixelText size={6} numberOfLines={1}>{msg.subject}</PixelText>
                <PixelText size={5} dim style={{ marginTop: 2 }}>WK {msg.week}</PixelText>
              </View>
              {(msg.requiresResponse && !msg.response) && (
                <Badge label="ACTION" color="yellow" />
              )}
              {msg.response === 'accepted' && (
                <Badge label="ACCEPTED" color="green" />
              )}
              {msg.response === 'rejected' && (
                <Badge label="DECLINED" color="red" />
              )}
            </View>
          ))
        )}
      </SectionCard>
    </ScrollView>
  );
}

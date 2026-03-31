import { useEffect, useCallback, useState } from 'react';
import { View, FlatList, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import { FAB_CLEARANCE } from './_layout';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Trash2, Users, ArrowLeftRight, Building, TrendingUp, Bell, BookOpen, Gem, Award } from 'lucide-react-native';
import { useInboxStore, InboxMessage, InboxMessageType } from '@/stores/inboxStore';
import { useNarrativeStore } from '@/stores/narrativeStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useSquadStore } from '@/stores/squadStore';
import { useGuardianStore } from '@/stores/guardianStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useMarketStore } from '@/stores/marketStore';
import { useCoachStore } from '@/stores/coachStore';
import { getCoachPerception, getHeadCoach } from '@/engine/CoachPerception';
import { MarketPlayer } from '@/types/market';
import { reactionHandler } from '@/engine/ReactionHandler';
import { handleGuardianResponse } from '@/engine/ReactionHandler';
import { handleAcceptAgentOffer, handleRejectAgentOffer } from '@/utils/agentOfferHandlers';
import { useInteractionStore } from '@/stores/interactionStore';
import { NarrativeMessage, EventChoice, AgentOffer } from '@/types/narrative';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { getLoyaltyNote, getDemandNote } from '@/utils/guardianNarrative';
import { Avatar } from '@/components/ui/Avatar';
import { FlagText } from '@/components/ui/FlagText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SwipeConfirm } from '@/components/ui/SwipeConfirm';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { formatCurrencyCompact, formatCurrencyWhole, getPlayerAskingPrice } from '@/utils/currency';
import { WK, pixelShadow } from '@/constants/theme';
import { useNavStore } from '@/stores/navStore';
import { hapticTap, hapticWarning, hapticError } from '@/utils/haptics';
import { moraleLabel } from '@/utils/morale';

// ─── Agent offer card (list item) ────────────────────────────────────────────

function AgentOfferCard({ offer, onViewOffer }: { offer: AgentOffer; onViewOffer: (o: AgentOffer) => void }) {
  const currentWeek = useAcademyStore((s) => s.academy.weekNumber ?? 1);
  const weeksLeft   = offer.expiresWeek - currentWeek;

  return (
    <Pressable onPress={() => { hapticTap(); onViewOffer(offer); }}>
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.border,
        borderLeftWidth: 5,
        borderLeftColor: WK.yellow,
        marginBottom: 10,
        flexDirection: 'row',
        ...pixelShadow,
      }}>
        {/* Icon column */}
        <View style={{ width: 44, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 14 }}>
          <ArrowLeftRight size={18} color={WK.yellow} />
        </View>

        {/* Content column */}
        <View style={{ flex: 1, paddingTop: 12, paddingBottom: 12, paddingRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
            <PixelText size={8} upper style={{ flex: 1, marginRight: 8 }} numberOfLines={2}>
              {offer.playerName} → {offer.destinationClub}
            </PixelText>
            <Badge label="NEW" color="yellow" />
          </View>
          <PixelText variant="body" size={13} dim numberOfLines={1}>
            Expires in {weeksLeft} {weeksLeft === 1 ? 'week' : 'weeks'}
          </PixelText>
          <PixelText size={13} variant="vt323" dim style={{ marginTop: 5 }}>WK {offer.week}</PixelText>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Agent offer detail screen ────────────────────────────────────────────────

function AgentOfferDetail({ offer, onBack }: { offer: AgentOffer; onBack: () => void }) {
  const stableOnBack = useCallback(onBack, []);
  useEffect(() => {
    useNavStore.getState().setBackFab(stableOnBack);
    return () => useNavStore.getState().setBackFab(null);
  }, [stableOnBack]);

  const currentWeek = useAcademyStore((s) => s.academy.weekNumber ?? 1);
  const investorId  = useAcademyStore((s) => s.academy.investorId);
  const investor    = useMarketStore((s) => s.investors.find((inv) => inv.id === investorId));
  const player = useSquadStore((s) => s.players.find((p) => p.id === offer.playerId));
  const coaches = useCoachStore((s) => s.coaches);
  const headCoach = getHeadCoach(coaches);
  const weeksLeft = offer.expiresWeek - currentWeek;

  // Fee breakdown — all in pence
  const agentCutPence    = offer.estimatedFee - offer.netProceeds; // offer.netProceeds is post-agent
  const investorEquityPct = investor?.equityTaken ?? 0;
  const investorCutPence  = investorEquityPct > 0
    ? Math.round(offer.netProceeds * (investorEquityPct / 100))
    : 0;
  const trueNetPence = offer.netProceeds - investorCutPence;

  // Coach opinion: compare offer fee against player's estimated market value
  const coachOpinion = player && headCoach
    ? getCoachPerception(
        {
          // Agent fee formula: OVR × ~100 whole pounds (OVR × 100 × 100 pence at mid multiplier)
          // Use same basis so coach opinion reflects fair/steal/overpriced vs actual offer
          marketValue: player.overallRating * 100,
          currentOffer: Math.round(offer.estimatedFee / 100),
          currentAbility: player.overallRating,
        } as MarketPlayer,
        headCoach,
      )
    : null;

  const verdictColorMap: Record<string, string> = {
    green: WK.green,
    red: WK.red,
    white: WK.text,
  };

  const age = player?.dateOfBirth
    ? Math.floor((Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : player?.age ?? null;

  function handleAccept() {
    handleAcceptAgentOffer(offer.id);
    onBack();
  }

  function handleDecline() {
    handleRejectAgentOffer(offer.id);
    onBack();
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: FAB_CLEARANCE }}>

      {/* ── Player mini-profile ─────────────────────────────────────────── */}
      {player && (
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 14,
          ...pixelShadow,
        }}>
          <PixelText size={14} variant="vt323" color={WK.tealLight} style={{ marginBottom: 8 }}>PLAYER</PixelText>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <PixelText size={9} upper style={{ flex: 1 }}>{player.name}</PixelText>
            <View style={{ borderWidth: 2, borderColor: WK.yellow, paddingHorizontal: 6, paddingVertical: 3 }}>
              <PixelText size={14} variant="vt323" color={WK.yellow}>{player.position}</PixelText>
            </View>
          </View>

          {age !== null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              <PixelText size={13} variant="vt323" dim>AGE {age} · </PixelText>
              <FlagText nationality={player.nationality} size={10} />
              <PixelText size={13} variant="vt323" dim>{player.nationality}</PixelText>
            </View>
          )}

          {/* OVR + ability bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <View style={{ borderWidth: 2, borderColor: WK.tealLight, paddingHorizontal: 6, paddingVertical: 3 }}>
              <PixelText size={8} color={WK.tealLight}>OVR {player.overallRating}</PixelText>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 2, borderColor: WK.border }}>
                <View style={{ height: '100%', width: `${player.overallRating}%`, backgroundColor: WK.tealLight }} />
              </View>
            </View>
          </View>

          {/* Morale */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <PixelText size={13} variant="vt323" dim>{moraleLabel(player.morale ?? 70)}</PixelText>
          </View>
        </View>
      )}

      {/* ── Offer details ────────────────────────────────────────────────── */}
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 4,
        borderColor: WK.yellow,
        padding: 14,
        ...pixelShadow,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Badge label="TRANSFER OFFER" color="yellow" />
          <PixelText size={6} dim>WK {offer.week}</PixelText>
        </View>

        <PixelText size={8} upper style={{ marginBottom: 4 }}>
          {offer.playerName} → {offer.destinationClub}
        </PixelText>
        <PixelText size={13} variant="vt323" dim style={{ marginBottom: 12 }}>
          {offer.agentName} · {offer.agentCommissionRate}% COMMISSION
        </PixelText>

        <View style={{ gap: 4, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 2, borderBottomColor: WK.border }}>
            <PixelText size={14} variant="vt323" dim>GROSS FEE</PixelText>
            <PixelText size={18} variant="vt323" color={WK.text}>{formatCurrencyCompact(offer.estimatedFee)}</PixelText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 2, borderBottomColor: WK.border }}>
            <PixelText size={14} variant="vt323" dim>AGENT ({offer.agentCommissionRate}%)</PixelText>
            <PixelText size={18} variant="vt323" color={WK.red}>-{formatCurrencyCompact(agentCutPence)}</PixelText>
          </View>
          {investorCutPence > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 2, borderBottomColor: WK.border }}>
              <PixelText size={14} variant="vt323" dim>INVESTOR ({investorEquityPct}% EQUITY)</PixelText>
              <PixelText size={18} variant="vt323" color={WK.red}>-{formatCurrencyCompact(investorCutPence)}</PixelText>
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
            <PixelText size={14} variant="vt323" color={WK.green}>NET PROCEEDS</PixelText>
            <PixelText size={18} variant="vt323" color={WK.green}>{formatCurrencyCompact(trueNetPence)}</PixelText>
          </View>
        </View>

        <PixelText size={14} variant="vt323" dim>
          EXPIRES IN {weeksLeft} {weeksLeft === 1 ? 'WEEK' : 'WEEKS'}
        </PixelText>
      </View>

      {/* ── Coach opinion ─────────────────────────────────────────────────── */}
      {coachOpinion && headCoach && (
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 14,
          ...pixelShadow,
        }}>
          <PixelText size={9} upper style={{ marginBottom: 10 }}>Coach Opinion</PixelText>

          <View style={{ gap: 4, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 2, borderBottomColor: WK.border }}>
              <PixelText size={14} variant="vt323" dim>HEAD COACH</PixelText>
              <PixelText size={18} variant="vt323" color={WK.text}>{headCoach.name}</PixelText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 2, borderBottomColor: WK.border }}>
              <PixelText size={14} variant="vt323" dim>EST. MARKET VALUE</PixelText>
              <PixelText size={18} variant="vt323" color={WK.text}>{formatCurrencyCompact(coachOpinion.perceivedValue)}</PixelText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
              <PixelText size={14} variant="vt323" dim>OFFER vs VALUATION</PixelText>
              <PixelText size={18} variant="vt323" color={coachOpinion.deltaPercent < -10 ? WK.green : coachOpinion.deltaPercent > 10 ? WK.red : WK.text}>
                {coachOpinion.deltaPercent > 0 ? '+' : ''}{coachOpinion.deltaPercent.toFixed(0)}%
              </PixelText>
            </View>
          </View>

          <View style={{
            borderWidth: 2,
            borderColor: verdictColorMap[coachOpinion.verdictColor] ?? WK.border,
            padding: 10,
          }}>
            <PixelText variant="body" size={14} color={verdictColorMap[coachOpinion.verdictColor] ?? WK.text}>
              "{coachOpinion.coachNote}"
            </PixelText>
          </View>
        </View>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <SwipeConfirm
          onAccept={handleAccept}
          onDecline={handleDecline}
          acceptLabel="ACCEPT OFFER"
          declineLabel="DECLINE OFFER"
        />
      </View>
    </ScrollView>
  );
}

// ─── Type config ───────────────────────────────────────────────────────────────

type IconComponent = React.ComponentType<{ size: number; color: string }>;

const TYPE_CONFIG: Record<InboxMessageType, {
  label: string;
  color: 'yellow' | 'red' | 'green' | 'dim';
  icon: IconComponent;
  stripeColor: string;
  iconColor: string;
}> = {
  guardian: { label: 'GUARDIAN', color: 'yellow',  icon: Users,          stripeColor: WK.yellow,    iconColor: WK.yellow    },
  agent:    { label: 'TRANSFER', color: 'yellow',  icon: ArrowLeftRight, stripeColor: WK.yellow,    iconColor: WK.yellow    },
  sponsor:  { label: 'SPONSOR',  color: 'green',   icon: Building,       stripeColor: WK.green,     iconColor: WK.green     },
  investor: { label: 'INVESTOR', color: 'yellow',  icon: TrendingUp,     stripeColor: WK.yellow,    iconColor: WK.yellow    },
  system:   { label: 'SYSTEM',   color: 'red',     icon: Bell,           stripeColor: WK.red,       iconColor: WK.red       },
  scout:       { label: 'SCOUT',       color: 'yellow', icon: Gem,   stripeColor: WK.tealLight, iconColor: WK.tealLight },
  development: { label: 'DEVELOPMENT', color: 'green',  icon: Award, stripeColor: WK.green,     iconColor: WK.green     },
};

// ─── Unified list item ─────────────────────────────────────────────────────────

type ListItem =
  | { kind: 'inbox';       message: InboxMessage }
  | { kind: 'narrative';   message: NarrativeMessage }
  | { kind: 'agent_offer'; offer: AgentOffer };

// ─── Investor offer metadata ───────────────────────────────────────────────────

interface InvestorOfferMeta {
  investmentAmount: number;
  equityPct: number;
  investorName: string;
  investorSize: string;
}

function isInvestorMeta(meta: unknown): meta is InvestorOfferMeta {
  return (
    typeof meta === 'object' &&
    meta !== null &&
    typeof (meta as InvestorOfferMeta).investmentAmount === 'number'
  );
}

// ─── Gem discovery metadata ────────────────────────────────────────────────────

interface GemPlayerMeta {
  gemDiscovery: true;
  playerId: string;
}

function isGemMeta(meta: unknown): meta is GemPlayerMeta {
  return (
    typeof meta === 'object' &&
    meta !== null &&
    (meta as GemPlayerMeta).gemDiscovery === true &&
    typeof (meta as GemPlayerMeta).playerId === 'string'
  );
}

// ─── Multi-gem (mission) metadata ─────────────────────────────────────────────

interface MultiGemMeta {
  gemDiscovery: true;
  playerIds: string[];
}

function isMultiGemMeta(meta: unknown): meta is MultiGemMeta {
  return (
    (meta as MultiGemMeta)?.gemDiscovery === true &&
    Array.isArray((meta as MultiGemMeta)?.playerIds)
  );
}

// ─── Mission summary metadata ─────────────────────────────────────────────────

interface MissionSummaryMeta {
  missionSummary: {
    scoutName: string;
    position: string;
    targetNationality: string | null;
    weeksTotal: number;
    gemsFound: number;
  };
}

function isMissionSummaryMeta(meta: unknown): meta is MissionSummaryMeta {
  return typeof (meta as MissionSummaryMeta)?.missionSummary === 'object' &&
    (meta as MissionSummaryMeta)?.missionSummary !== null;
}

// ─── Guardian request metadata ─────────────────────────────────────────────────

interface GuardianMeta {
  costPence?: number;
  guardianIds?: string[];
  worstGuardianId?: string;
}

function isGuardianMeta(meta: unknown): meta is GuardianMeta {
  return typeof meta === 'object' && meta !== null;
}

// ─── Guardian player card ──────────────────────────────────────────────────────

function GuardianPlayerCard({ playerId }: { playerId: string }) {
  const player = useSquadStore((s) => s.players.find((p) => p.id === playerId));
  if (!player) return null;

  const stars = Math.round((player.overallRating / 100) * 5);
  const starStr = '★'.repeat(stars) + '☆'.repeat(5 - stars);

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.border,
      padding: 14,
      flexDirection: 'row',
      gap: 14,
      marginTop: 10,
      ...pixelShadow,
    }}>
      {player.appearance && (
        <Avatar appearance={player.appearance} role="PLAYER" size={60} morale={player.morale ?? 70} age={player.age} />
      )}
      <View style={{ flex: 1, justifyContent: 'center', gap: 6 }}>
        <PixelText size={10} upper numberOfLines={1}>{player.name}</PixelText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Badge label={player.position} color="dim" />
          <FlagText nationality={player.nationality} size={14} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <PixelText size={13} variant="vt323" color={WK.yellow}>{starStr}</PixelText>
          <PixelText size={12} variant="vt323" dim>AGE {player.age}</PixelText>
        </View>
      </View>
    </View>
  );
}

// ─── Guardian overview card ────────────────────────────────────────────────────
// Matches the guardian card layout on the player profile page exactly.

function GuardianOverview({ guardianIds, worstGuardianId }: { guardianIds: string[]; worstGuardianId?: string }) {
  const allGuardians = useGuardianStore((s) => s.guardians);
  const guardians = allGuardians.filter((g) => guardianIds.includes(g.id));
  const academyName = useAcademyStore((s) => s.academy.name ?? 'the academy');
  if (guardians.length === 0) return null;

  function guardianRoleLabel(g: typeof guardians[0], i: number): string {
    const sameGender = guardians.filter((x) => x.gender === g.gender).length;
    if (sameGender > 1) return `GUARDIAN ${i + 1}`;
    return g.gender === 'female' ? 'MUM' : 'DAD';
  }

  function loyaltyChip(loyalty: number): { label: string; color: 'green' | 'yellow' | 'red' } {
    if (loyalty >= 70) return { label: 'LOYAL', color: 'green' };
    if (loyalty >= 40) return { label: 'NEUTRAL', color: 'yellow' };
    return { label: 'HOSTILE', color: 'red' };
  }

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.border,
      marginTop: 10,
      ...pixelShadow,
    }}>
      {/* Header row — matches player profile */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10,
        borderBottomWidth: 2, borderBottomColor: WK.border,
      }}>
        <PixelText size={8} color={WK.yellow}>GUARDIANS</PixelText>
        <BodyText size={12} dim>
          {guardians.length === 1 ? '1 GUARDIAN' : `${guardians.length} GUARDIANS`}
        </BodyText>
      </View>

      {/* Per-guardian rows */}
      {guardians.map((g, i) => {
        const chip = loyaltyChip(g.loyaltyToAcademy);
        const isKeyConcern = g.id === worstGuardianId && guardians.length > 1;
        return (
          <View key={g.id} style={{
            paddingHorizontal: 14, paddingVertical: 12,
            borderBottomWidth: i < guardians.length - 1 ? 2 : 0,
            borderBottomColor: WK.border,
          }}>
            {/* Name row: role box + name + loyalty chip + key concern flag */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <View style={{
                paddingHorizontal: 6, paddingVertical: 3,
                borderWidth: 2, borderColor: WK.border, backgroundColor: WK.tealDark,
              }}>
                <BodyText size={11} dim>{guardianRoleLabel(g, i)}</BodyText>
              </View>
              <PixelText size={8}>{g.firstName} {g.lastName}</PixelText>
              <Badge label={chip.label} color={chip.color} />
              {isKeyConcern && <Badge label="KEY CONCERN" color="red" />}
            </View>

            {/* Narrative body — same as player profile */}
            <View style={{ gap: 6 }}>
              <BodyText size={13} style={{ lineHeight: 20 }}>
                {getLoyaltyNote(g.loyaltyToAcademy, academyName)}
              </BodyText>
              <BodyText size={12} dim style={{ lineHeight: 18 }}>
                {getDemandNote(g.demandLevel)}
              </BodyText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Gem player card ───────────────────────────────────────────────────────────

function GemPlayerCard({ playerId, messageId }: { playerId: string; messageId: string }) {
  const player = useMarketStore((s) => s.players.find((p) => p.id === playerId));
  const inSquad = useSquadStore((s) => s.players.some((p) => p.id === playerId));
  const { signPlayer } = useMarketStore.getState();
  const { respond } = useInboxStore.getState();
  const [recruited, setRecruited] = useState(false);

  // Player was signed this session or is already in the squad
  if (recruited || inSquad) {
    return (
      <View style={{
        marginTop: 12,
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.green,
        padding: 16,
        alignItems: 'center',
        gap: 6,
        ...pixelShadow,
      }}>
        <PixelText size={8} color={WK.green}>✓ PLAYER SIGNED</PixelText>
        <PixelText size={6} dim>CHECK YOUR SQUAD</PixelText>
      </View>
    );
  }

  // Player not found in market — gem was lost to a market refresh before the player could act
  if (!player) {
    return (
      <View style={{
        marginTop: 12,
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.border,
        padding: 16,
        alignItems: 'center',
        gap: 6,
        ...pixelShadow,
      }}>
        <PixelText size={8} color={WK.dim}>PROSPECT UNAVAILABLE</PixelText>
        <PixelText size={6} dim>This player is no longer on the market.</PixelText>
      </View>
    );
  }

  // Compute age from dateOfBirth
  const age = player.dateOfBirth
    ? Math.floor((Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const ovr = player.perceivedAbility ?? player.currentAbility;
  const potential = Math.min(5, Math.max(0, player.potential ?? 0));
  const stars = '★'.repeat(potential) + '☆'.repeat(5 - potential);
  const askingPrice = getPlayerAskingPrice(player);

  function handleRecruit() {
    signPlayer(playerId);
    respond(messageId, 'accepted');
    setRecruited(true);
  }

  return (
    <View style={{
      marginTop: 12,
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.tealLight,
      padding: 14,
      ...pixelShadow,
    }}>
      <PixelText size={14} variant="vt323" color={WK.tealLight} style={{ marginBottom: 8 }}>GEM PROSPECT</PixelText>

      {/* Name + position */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <PixelText size={10} upper style={{ flex: 1 }}>
          {player.firstName} {player.lastName}
        </PixelText>
        <View style={{
          borderWidth: 2,
          borderColor: WK.yellow,
          paddingHorizontal: 6,
          paddingVertical: 3,
        }}>
          <PixelText size={14} variant="vt323" color={WK.yellow}>{player.position}</PixelText>
        </View>
      </View>

      {/* Age / nationality */}
      {(age !== null || player.nationality) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          {age !== null && <PixelText size={13} variant="vt323" dim>AGE {age} · </PixelText>}
          <FlagText nationality={player.nationality} size={12} />
          <PixelText size={13} variant="vt323" dim>{player.nationality}</PixelText>
        </View>
      )}

      {/* Potential stars */}
      <PixelText size={18} variant="vt323" color={WK.yellow} style={{ marginBottom: 8 }}>{stars}</PixelText>

      {/* OVR badge + ability bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <View style={{
          borderWidth: 2,
          borderColor: WK.green,
          paddingHorizontal: 8,
          paddingVertical: 4,
        }}>
          <PixelText size={9} color={WK.green}>OVR {ovr}</PixelText>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{
            height: 8,
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderWidth: 2,
            borderColor: WK.border,
          }}>
            <View style={{ height: '100%', width: `${ovr}%`, backgroundColor: WK.green }} />
          </View>
        </View>
      </View>

      {/* Asking price */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <PixelText size={14} variant="vt323" dim>ASKING PRICE</PixelText>
        <PixelText size={18} variant="vt323" color={WK.text}>
          {askingPrice === 0 ? 'FREE' : `£${askingPrice.toLocaleString()}`}
        </PixelText>
      </View>

      <Button label="✓ RECRUIT" variant="yellow" fullWidth onPress={handleRecruit} />
    </View>
  );
}

// ─── Offer detail row ──────────────────────────────────────────────────────────

function OfferRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
      borderBottomWidth: 2,
      borderBottomColor: WK.border,
    }}>
      <PixelText size={14} variant="vt323" dim>{label}</PixelText>
      <PixelText size={18} variant="vt323" color={WK.yellow}>{value}</PixelText>
    </View>
  );
}

// ─── Inbox message row ─────────────────────────────────────────────────────────

function InboxMessageRow({
  message,
  onPress,
  onDelete,
}: {
  message: InboxMessage;
  onPress: (m: InboxMessage) => void;
  onDelete: (m: InboxMessage) => void;
}) {
  const isUnread = !message.isRead;
  const typeConf = TYPE_CONFIG[message.type] ?? TYPE_CONFIG.system;
  const canDelete = !(message.requiresResponse && !message.response);
  const Icon = typeConf.icon;

  return (
    <Pressable onPress={() => { hapticTap(); onPress(message); }}>
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.border,
        borderLeftWidth: 5,
        borderLeftColor: typeConf.stripeColor,
        marginBottom: 10,
        flexDirection: 'row',
        ...pixelShadow,
      }}>
        {/* Icon column */}
        <View style={{ width: 44, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 14 }}>
          <Icon size={18} color={typeConf.iconColor} />
        </View>

        {/* Content column */}
        <View style={{ flex: 1, paddingTop: 12, paddingBottom: 12, paddingRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
            <PixelText
              size={8}
              color={isUnread ? WK.text : WK.dim}
              style={{ flex: 1, marginRight: 8 }}
              numberOfLines={2}
            >
              {message.subject.toUpperCase()}
            </PixelText>
            {isUnread && <Badge label="NEW" color="yellow" />}
            {canDelete && (
              <Pressable onPress={(e) => { e.stopPropagation?.(); hapticWarning(); onDelete(message); }} hitSlop={12} style={{ marginLeft: 6 }}>
                <Trash2 size={18} color={WK.red} />
              </Pressable>
            )}
          </View>
          <PixelText variant="body" size={13} dim numberOfLines={2}>{message.body}</PixelText>
          <PixelText size={13} variant="vt323" dim style={{ marginTop: 5 }}>WK {message.week}</PixelText>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Management panel (narrative messages with affected players) ───────────────

function ManagementPanel({ playerIds }: { playerIds: string[] }) {
  const router = useRouter();
  const allPlayers = useSquadStore((s) => s.players);
  const players = allPlayers.filter((p) => playerIds.includes(p.id));
  const updatePlayer = useSquadStore((s) => s.updatePlayer);
  const logInteraction = useInteractionStore((s) => s.logInteraction);
  const allRecords = useInteractionStore((s) => s.records);
  const weekNumber = useAcademyStore((s) => s.academy.weekNumber ?? 1);
  const [feedback, setFeedback] = useState<Record<string, 'SUPPORTED' | 'DISCIPLINED'>>({});

  function getCooldown(playerId: string) {
    const last = allRecords
      .filter((r) => r.actorId === 'amp' && r.targetId === playerId && (r.subtype === 'support' || r.subtype === 'punish'))
      .sort((a, b) => b.week - a.week)[0];
    if (!last) return { locked: false, availableWeek: weekNumber };
    const availableWeek = last.week + 4;
    return { locked: weekNumber < availableWeek, availableWeek };
  }

  if (players.length === 0) return null;

  function handleSupport(p: typeof players[0]) {
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
    hapticTap();
    setFeedback((prev) => ({ ...prev, [p.id]: 'SUPPORTED' }));
    setTimeout(() => setFeedback((prev) => { const n = { ...prev }; delete n[p.id]; return n; }), 2000);
  }

  function handlePunish(p: typeof players[0]) {
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
    hapticWarning();
    setFeedback((prev) => ({ ...prev, [p.id]: 'DISCIPLINED' }));
    setTimeout(() => setFeedback((prev) => { const n = { ...prev }; delete n[p.id]; return n; }), 2000);
  }

  return (
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: WK.border,
      padding: 14,
      marginTop: 10,
      ...pixelShadow,
    }}>
      <PixelText size={9} upper style={{ marginBottom: 12 }}>Management</PixelText>
      {players.map((p, idx) => {
        const cooldown = getCooldown(p.id);
        return (
          <View key={p.id} style={idx < players.length - 1 ? { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: WK.border } : {}}>
            {/* Player row: avatar + name/morale */}
            <Pressable
              onPress={() => { hapticTap(); router.push(`/player/${p.id}`); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}
            >
              <Avatar appearance={p.appearance} role="PLAYER" size={56} morale={p.morale ?? 70} age={p.age} />
              <View style={{ flex: 1 }}>
                <PixelText size={10} upper color={WK.yellow} numberOfLines={1}>{p.name}</PixelText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <View style={{ borderWidth: 2, borderColor: WK.tealLight, paddingHorizontal: 5, paddingVertical: 2 }}>
                    <PixelText size={14} variant="vt323" color={WK.tealLight}>{p.position}</PixelText>
                  </View>
                  <PixelText size={14} variant="vt323" color={
                    (p.morale ?? 70) >= 60 ? WK.green : (p.morale ?? 70) >= 40 ? WK.yellow : WK.red
                  }>
                    {moraleLabel(p.morale ?? 70)}
                  </PixelText>
                </View>
              </View>
              <PixelText size={20} variant="vt323" color={WK.yellow}>›</PixelText>
            </Pressable>

            {/* Feedback */}
            {feedback[p.id] && (
              <View style={{
                marginBottom: 8,
                paddingVertical: 4,
                paddingHorizontal: 8,
                borderWidth: 2,
                borderColor: feedback[p.id] === 'SUPPORTED' ? WK.green : WK.red,
                alignSelf: 'flex-start',
              }}>
                <PixelText size={14} variant="vt323" color={feedback[p.id] === 'SUPPORTED' ? WK.green : WK.red}>
                  ✓ {feedback[p.id]}
                </PixelText>
              </View>
            )}

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={cooldown.locked ? undefined : () => handleSupport(p)}
                style={{
                  flex: 1,
                  backgroundColor: cooldown.locked ? WK.tealMid : WK.green,
                  borderWidth: 2,
                  borderColor: WK.border,
                  padding: 10,
                  alignItems: 'center',
                  opacity: cooldown.locked ? 0.45 : 1,
                }}
              >
                <PixelText size={16} variant="vt323" color={cooldown.locked ? WK.dim : WK.text}>SUPPORT</PixelText>
              </Pressable>
              <Pressable
                onPress={cooldown.locked ? undefined : () => handlePunish(p)}
                style={{
                  flex: 1,
                  backgroundColor: cooldown.locked ? WK.tealMid : WK.red,
                  borderWidth: 2,
                  borderColor: WK.border,
                  padding: 10,
                  alignItems: 'center',
                  opacity: cooldown.locked ? 0.45 : 1,
                }}
              >
                <PixelText size={16} variant="vt323" color={cooldown.locked ? WK.dim : WK.text}>PUNISH</PixelText>
              </Pressable>
            </View>
            {cooldown.locked && (
              <PixelText size={13} variant="vt323" dim style={{ marginTop: 6, textAlign: 'center' }}>
                AVAILABLE WK {cooldown.availableWeek}
              </PixelText>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Narrative message row ─────────────────────────────────────────────────────

function NarrativeMessageRow({
  message,
  onPress,
  onDelete,
}: {
  message: NarrativeMessage;
  onPress: (m: NarrativeMessage) => void;
  onDelete: (m: NarrativeMessage) => void;
}) {
  const isUnread = !message.readAt;
  const isPending = message.isActionable && !message.respondedAt;
  const canDelete = !isPending;
  const stripeColor = isPending ? WK.green : WK.tealLight;
  const iconColor = isPending ? WK.green : WK.tealLight;

  return (
    <Pressable onPress={() => { hapticTap(); onPress(message); }}>
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.border,
        borderLeftWidth: 5,
        borderLeftColor: stripeColor,
        marginBottom: 10,
        flexDirection: 'row',
        ...pixelShadow,
      }}>
        {/* Icon column */}
        <View style={{ width: 44, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 14 }}>
          <BookOpen size={18} color={iconColor} />
        </View>

        {/* Content column */}
        <View style={{ flex: 1, paddingTop: 12, paddingBottom: 12, paddingRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
            <PixelText
              size={8}
              color={isUnread ? WK.text : WK.dim}
              style={{ flex: 1, marginRight: 8 }}
              numberOfLines={2}
            >
              {message.title.toUpperCase()}
            </PixelText>
            {isPending && <Badge label="ACT" color="green" />}
            {isUnread && !isPending && <Badge label="NEW" color="yellow" />}
            {canDelete && (
              <Pressable onPress={(e) => { e.stopPropagation?.(); hapticWarning(); onDelete(message); }} hitSlop={12} style={{ marginLeft: 6 }}>
                <Trash2 size={18} color={WK.red} />
              </Pressable>
            )}
          </View>
          <PixelText variant="body" size={13} dim numberOfLines={2}>{message.body}</PixelText>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Inbox message detail ──────────────────────────────────────────────────────

function InboxMessageDetail({
  message,
  onBack,
}: {
  message: InboxMessage;
  onBack: () => void;
}) {
  const { markRead, respond } = useInboxStore();
  const { setInvestorId, setSponsorIds, addBalance, academy } = useAcademyStore();

  const stableOnBack = useCallback(onBack, []);
  useEffect(() => {
    useNavStore.getState().setBackFab(stableOnBack);
    return () => useNavStore.getState().setBackFab(null);
  }, [stableOnBack]);

  useEffect(() => {
    if (!message.isRead) markRead(message.id);
  }, [message.id]);

  const typeConf = TYPE_CONFIG[message.type] ?? TYPE_CONFIG.system;
  const canRespond = message.requiresResponse && !message.response;
  const investorMeta = isInvestorMeta(message.metadata) ? message.metadata : null;
  const multiGemMeta = !investorMeta && isMultiGemMeta(message.metadata) && Array.isArray(message.metadata?.playerIds) && (message.metadata as MultiGemMeta).playerIds.length > 0
    ? (message.metadata as MultiGemMeta)
    : null;
  const gemMeta = !investorMeta && !multiGemMeta && isGemMeta(message.metadata) ? message.metadata : null;
  const missionSummaryMeta = isMissionSummaryMeta(message.metadata) ? message.metadata : null;
  const guardianMeta = message.type === 'guardian' && isGuardianMeta(message.metadata) ? message.metadata : null;
  const behaviouralPlayerIds: string[] = !multiGemMeta && Array.isArray(message.metadata?.playerIds)
    ? (message.metadata!.playerIds as string[])
    : [];
  const sponsorMeta = message.type === 'sponsor' && message.metadata ? message.metadata as {
    sponsorId: string; sponsorName: string; weeklyPayment: number; contractWeeks: number; companySize: string;
  } : null;

  function handleAccept() {
    if (message.type === 'investor' && message.entityId && investorMeta) {
      addBalance(investorMeta.investmentAmount); // investmentAmount is pence
      setInvestorId(message.entityId);
      useFinanceStore.getState().addTransaction({
        amount: Math.round(investorMeta.investmentAmount / 100), // pence → whole pounds for ledger
        category: 'investment',
        description: `${investorMeta.investorName} — ${investorMeta.equityPct}% equity deal`,
        weekNumber: message.week,
      });
    }
    if (message.type === 'sponsor' && message.entityId && sponsorMeta) {
      setSponsorIds([...academy.sponsorIds, message.entityId]);
    }
    respond(message.id, 'accepted');
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: FAB_CLEARANCE }}>

      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.yellow,
        padding: 16,
        ...pixelShadow,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Badge label={typeConf.label} color={typeConf.color} />
          <PixelText size={14} variant="vt323" dim>WK {message.week}</PixelText>
        </View>
        <PixelText size={11} upper style={{ marginBottom: 14 }}>{message.subject}</PixelText>
        <PixelText size={14} variant="body" style={{ color: WK.dim }}>{message.body}</PixelText>

        {message.type === 'sponsor' && sponsorMeta && (
          <View style={{ marginTop: 16, borderWidth: 2, borderColor: WK.tealMid, padding: 12 }}>
            <PixelText size={16} variant="vt323" color={WK.tealLight} style={{ marginBottom: 10 }}>OFFER DETAILS</PixelText>
            <OfferRow label="WEEKLY INCOME" value={`£${sponsorMeta.weeklyPayment.toLocaleString()}`} />
            <OfferRow label="CONTRACT LENGTH" value={`${sponsorMeta.contractWeeks} WEEKS`} />
            <OfferRow label="SPONSOR SIZE" value={String(sponsorMeta.companySize)} />
            <View style={{ marginTop: 8 }}>
              <PixelText size={13} variant="vt323" dim>
                TOTAL VALUE: £{(sponsorMeta.weeklyPayment * sponsorMeta.contractWeeks).toLocaleString()}
              </PixelText>
            </View>
          </View>
        )}

        {message.type === 'investor' && investorMeta && (
          <View style={{ marginTop: 16, borderWidth: 2, borderColor: WK.tealMid, padding: 12 }}>
            <PixelText size={16} variant="vt323" color={WK.tealLight} style={{ marginBottom: 10 }}>OFFER DETAILS</PixelText>
            <OfferRow label="INVESTMENT" value={formatCurrencyCompact(investorMeta.investmentAmount)} />
            <OfferRow label="EQUITY STAKE" value={`${investorMeta.equityPct}%`} />
            <OfferRow label="INVESTOR SIZE" value={String(investorMeta.investorSize)} />
            <View style={{ marginTop: 8 }}>
              <PixelText size={13} variant="vt323" dim>
                INVESTOR RECEIVES {investorMeta.equityPct}% OF ALL FUTURE PLAYER SALES
              </PixelText>
            </View>
          </View>
        )}

        {guardianMeta?.costPence !== undefined && guardianMeta.costPence > 0 && (
          <View style={{ marginTop: 16, borderWidth: 2, borderColor: WK.tealMid, padding: 12 }}>
            <OfferRow label="COST IF CONVINCED" value={formatCurrencyWhole(guardianMeta.costPence)} />
          </View>
        )}

        {message.response && (
          <View style={{
            marginTop: 16, paddingVertical: 8, paddingHorizontal: 12,
            borderWidth: 2, borderColor: message.response === 'accepted' ? WK.green : WK.red,
          }}>
            <PixelText size={16} variant="vt323" color={message.response === 'accepted' ? WK.green : WK.red}>
              {message.response === 'accepted' ? '✓ CONVINCED' : '✗ IGNORED'}
            </PixelText>
          </View>
        )}
      </View>

      {message.type === 'guardian' && message.entityId && (
        <GuardianPlayerCard playerId={message.entityId} />
      )}

      {message.type === 'guardian' && guardianMeta?.guardianIds && guardianMeta.guardianIds.length > 0 && (
        <GuardianOverview
          guardianIds={guardianMeta.guardianIds}
          worstGuardianId={guardianMeta.worstGuardianId}
        />
      )}

      {multiGemMeta && multiGemMeta.playerIds.map((pid) => (
        <GemPlayerCard key={pid} playerId={pid} messageId={message.id} />
      ))}

      {!multiGemMeta && gemMeta && (
        <GemPlayerCard playerId={gemMeta.playerId} messageId={message.id} />
      )}

      {missionSummaryMeta && (
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.yellow,
          padding: 14,
          marginTop: 10,
          ...pixelShadow,
        }}>
          <PixelText size={9} upper style={{ marginBottom: 12 }}>Mission Complete</PixelText>
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: WK.border }}>
              <PixelText size={14} variant="vt323" dim>SCOUT</PixelText>
              <PixelText size={18} variant="vt323" color={WK.text}>{missionSummaryMeta.missionSummary.scoutName}</PixelText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: WK.border }}>
              <PixelText size={14} variant="vt323" dim>TARGET</PixelText>
              <PixelText size={18} variant="vt323" color={WK.text}>{missionSummaryMeta.missionSummary.position}</PixelText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: WK.border }}>
              <PixelText size={14} variant="vt323" dim>REGION</PixelText>
              <PixelText size={18} variant="vt323" color={WK.text}>{missionSummaryMeta.missionSummary.targetNationality ?? 'Domestic'}</PixelText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: WK.border }}>
              <PixelText size={14} variant="vt323" dim>DURATION</PixelText>
              <PixelText size={18} variant="vt323" color={WK.text}>{missionSummaryMeta.missionSummary.weeksTotal} WEEKS</PixelText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
              <PixelText size={14} variant="vt323" dim>GEMS FOUND</PixelText>
              <PixelText size={18} variant="vt323" color={missionSummaryMeta.missionSummary.gemsFound > 0 ? WK.green : WK.dim}>
                {missionSummaryMeta.missionSummary.gemsFound}
              </PixelText>
            </View>
          </View>
        </View>
      )}

      {behaviouralPlayerIds.length > 0 && (
        <ManagementPanel playerIds={behaviouralPlayerIds} />
      )}

      {canRespond && message.type === 'guardian' && (
        <View style={{ marginTop: 12, gap: 8 }}>
          <Button
            label="✓ CONVINCE"
            variant="yellow"
            fullWidth
            onPress={() => {
              hapticTap();
              handleGuardianResponse(message, 'accepted');
              respond(message.id, 'accepted');
            }}
          />
          <Button
            label="✗ IGNORE"
            variant="teal"
            fullWidth
            onPress={() => {
              hapticWarning();
              handleGuardianResponse(message, 'rejected');
              respond(message.id, 'rejected');
            }}
          />
        </View>
      )}

      {canRespond && message.type !== 'guardian' && (
        <View style={{ marginTop: 12, gap: 8 }}>
          <Button label="✓ ACCEPT" variant="yellow" fullWidth onPress={handleAccept} />
          <Button label="✗ REJECT" variant="teal" fullWidth onPress={() => respond(message.id, 'rejected')} />
        </View>
      )}
    </ScrollView>
  );
}

// ─── Narrative message detail ──────────────────────────────────────────────────

function NarrativeMessageDetail({
  message,
  onBack,
}: {
  message: NarrativeMessage;
  onBack: () => void;
}) {
  const { markAsRead } = useNarrativeStore();
  const isPending = message.isActionable && !message.respondedAt;

  const stableOnBack = useCallback(onBack, []);
  useEffect(() => {
    useNavStore.getState().setBackFab(stableOnBack);
    return () => useNavStore.getState().setBackFab(null);
  }, [stableOnBack]);

  useEffect(() => {
    if (!message.readAt) markAsRead(message.id);
  }, [message.id]);

  function handleChoice(choice: EventChoice) {
    reactionHandler.handleChoice(message, choice);
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: FAB_CLEARANCE }}>

      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.green,
        padding: 16,
        ...pixelShadow,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
          <BookOpen size={16} color={WK.tealLight} />
          <PixelText size={14} variant="vt323" color={WK.tealLight}>STORY EVENT</PixelText>
        </View>

        <PixelText size={9} upper style={{ marginBottom: 14 }}>{message.title}</PixelText>
        <PixelText variant="body" size={14} style={{ color: WK.dim }}>{message.body}</PixelText>

        {message.statImpacts && message.statImpacts.length > 0 && (
          <View style={{
            marginTop: 14,
            borderWidth: 2,
            borderColor: WK.border,
            padding: 10,
            gap: 6,
          }}>
            <PixelText size={14} variant="vt323" dim style={{ marginBottom: 4 }}>STAT IMPACT</PixelText>
            {message.statImpacts.map((impact, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <PixelText size={14} variant="vt323" dim>{impact.label}</PixelText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <PixelText size={14} variant="vt323" color={WK.dim}>{impact.from}</PixelText>
                  <PixelText size={14} variant="vt323" dim>→</PixelText>
                  <PixelText size={14} variant="vt323" color={impact.delta >= 0 ? WK.green : WK.red}>{impact.to}</PixelText>
                  <PixelText size={14} variant="vt323" color={impact.delta >= 0 ? WK.green : WK.red}>
                    ({impact.delta >= 0 ? '+' : ''}{impact.delta})
                  </PixelText>
                </View>
              </View>
            ))}
          </View>
        )}

        {message.respondedAt && (
          <View style={{
            marginTop: 16, paddingVertical: 8, paddingHorizontal: 12,
            borderWidth: 2, borderColor: WK.tealMid,
          }}>
            <PixelText size={16} variant="vt323" color={WK.tealLight}>✓ RESPONDED</PixelText>
          </View>
        )}
      </View>

      {message.affectedEntities.length > 0 && (
        <ManagementPanel playerIds={message.affectedEntities} />
      )}

      {isPending && message.choices && (
        <View style={{ marginTop: 12, gap: 8 }}>
          {message.choices.map((choice, i) => (
            <Button
              key={i}
              label={`${choice.emoji}  ${choice.label.toUpperCase()}`}
              variant={i === 0 ? 'yellow' : 'teal'}
              fullWidth
              onPress={() => handleChoice(choice)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function InboxScreen() {
  const inboxMessages = useInboxStore((s) => s.messages);
  const inboxUnread = useInboxStore((s) => s.messages.filter((m) => !m.isRead).length);
  const { markAllRead: inboxMarkAllRead, clearDeletable: inboxClearDeletable, deleteMessage: inboxDelete } = useInboxStore();
  const agentOffers = useInboxStore((s) => s.agentOffers);
  const pendingOffers = agentOffers.filter((o) => o.status === 'pending');
  const narrativeMessages = useNarrativeStore((s) => s.messages);
  const narrativeUnread = useNarrativeStore((s) => s.messages.filter((m) => !m.readAt).length);
  const { markAllRead: narrativeMarkAllRead, clearDeletable: narrativeClearDeletable, deleteMessage: narrativeDelete } = useNarrativeStore();

  const [selectedInbox, setSelectedInbox] = useState<InboxMessage | null>(null);
  const [selectedNarrative, setSelectedNarrative] = useState<NarrativeMessage | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<AgentOffer | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Keep selections in sync with live store updates
  const selectedInboxLive = selectedInbox
    ? (inboxMessages.find((m) => m.id === selectedInbox.id) ?? null)
    : null;
  const selectedNarrativeLive = selectedNarrative
    ? (narrativeMessages.find((m) => m.id === selectedNarrative.id) ?? null)
    : null;

  const totalUnread = inboxUnread + narrativeUnread + pendingOffers.length;
  const headerLabel = totalUnread > 0 ? `INBOX (${totalUnread})` : 'INBOX';

  // Priority order: pending agent offers → actionable narrative → narrative → inbox
  const allListItems: ListItem[] = [
    ...pendingOffers.map((o): ListItem => ({ kind: 'agent_offer', offer: o })),
    ...narrativeMessages
      .filter((m) => m.isActionable && !m.respondedAt)
      .map((m): ListItem => ({ kind: 'narrative', message: m })),
    ...narrativeMessages
      .filter((m) => !(m.isActionable && !m.respondedAt))
      .map((m): ListItem => ({ kind: 'narrative', message: m })),
    ...inboxMessages.map((m): ListItem => ({ kind: 'inbox', message: m })),
  ];

  const listItems = allListItems.filter((item) => {
    if (unreadOnly) {
      if (item.kind === 'narrative' && item.message.readAt) return false;
      if (item.kind === 'inbox' && item.message.isRead) return false;
    }
    if (typeFilter === null) return true;
    if (typeFilter === 'offer') return item.kind === 'agent_offer';
    if (typeFilter === 'story') return item.kind === 'narrative';
    if (item.kind === 'inbox') return item.message.type === typeFilter;
    return false;
  });

  function handleBack() {
    setSelectedInbox(null);
    setSelectedNarrative(null);
    setSelectedOffer(null);
  }

  function handleMarkAllRead() {
    inboxMarkAllRead();
    narrativeMarkAllRead();
  }

  function handleClearInbox() {
    setConfirmingClear(true);
  }

  function confirmClear() {
    inboxClearDeletable();
    narrativeClearDeletable();
    setConfirmingClear(false);
  }

  function handleDeleteInbox(m: InboxMessage) {
    inboxDelete(m.id);
  }

  function handleDeleteNarrative(m: NarrativeMessage) {
    narrativeDelete(m.id);
  }

  const isListView = !selectedInboxLive && !selectedNarrativeLive && !selectedOffer;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }} edges={['bottom', 'left', 'right']}>
      <PitchBackground />

      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 4,
        borderBottomColor: WK.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}>
        <PixelText size={10} upper>{headerLabel}</PixelText>

        {isListView && (
          <>
            {/* ── Filter row ──────────────────────────────────────────────── */}
            {allListItems.length > 0 && (() => {
              const FILTERS: { key: string | null; label: string }[] = [
                { key: null,          label: 'ALL' },
                { key: 'offer',       label: 'OFFERS' },
                { key: 'guardian',    label: 'GUARDIAN' },
                { key: 'story',       label: 'STORY' },
                { key: 'sponsor',     label: 'SPONSOR' },
                { key: 'investor',    label: 'INVESTOR' },
                { key: 'scout',       label: 'SCOUT' },
                { key: 'development', label: 'DEV' },
                { key: 'system',      label: 'SYSTEM' },
              ];
              const countFor = (key: string | null) => {
                if (key === null) return allListItems.length;
                if (key === 'offer') return allListItems.filter((i) => i.kind === 'agent_offer').length;
                if (key === 'story') return allListItems.filter((i) => i.kind === 'narrative').length;
                return allListItems.filter((i) => i.kind === 'inbox' && i.message.type === key).length;
              };
              return (
                <View style={{ marginTop: 8, gap: 6 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -14 }} contentContainerStyle={{ paddingHorizontal: 14, gap: 6 }}>
                    {FILTERS.filter((f) => countFor(f.key) > 0 || f.key === null).map((f) => {
                      const isActive = typeFilter === f.key;
                      const count = countFor(f.key);
                      return (
                        <Pressable
                          key={String(f.key)}
                          onPress={() => { hapticTap(); setTypeFilter(f.key); }}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            backgroundColor: isActive ? WK.yellow : WK.tealCard,
                            borderWidth: 2,
                            borderColor: isActive ? WK.border : WK.tealMid,
                          }}
                        >
                          <PixelText size={6} color={isActive ? WK.border : WK.dim}>
                            {f.label}{count > 0 && f.key !== null ? ` ${count}` : ''}
                          </PixelText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {/* Unread toggle */}
                  <TouchableOpacity
                    onPress={() => { hapticTap(); setUnreadOnly((v) => !v); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
                    activeOpacity={0.7}
                  >
                    <View style={{
                      width: 14,
                      height: 14,
                      borderWidth: 2,
                      borderColor: unreadOnly ? WK.yellow : WK.dim,
                      backgroundColor: unreadOnly ? WK.yellow : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {unreadOnly && <PixelText size={8} color={WK.border}>✓</PixelText>}
                    </View>
                    <PixelText size={6} color={unreadOnly ? WK.yellow : WK.dim}>UNREAD ONLY</PixelText>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </>
        )}

        {isListView && listItems.length > 0 && (
          confirmingClear ? (
            <View style={{ marginTop: 8, borderWidth: 2, borderColor: WK.red, padding: 10, gap: 8 }}>
              <PixelText size={6} color={WK.red}>DELETE ALL DELETABLE MESSAGES?</PixelText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => { hapticTap(); setConfirmingClear(false); }}
                  style={{
                    flex: 1, paddingVertical: 6, backgroundColor: WK.tealCard,
                    borderWidth: 2, borderColor: WK.border, alignItems: 'center',
                  }}
                >
                  <PixelText size={6} dim>CANCEL</PixelText>
                </Pressable>
                <Pressable
                  onPress={() => { hapticError(); confirmClear(); }}
                  style={{
                    flex: 1, paddingVertical: 6, backgroundColor: WK.red,
                    borderWidth: 2, borderColor: '#8b0000', alignItems: 'center',
                  }}
                >
                  <PixelText size={6} color={WK.text}>CONFIRM DELETE</PixelText>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pressable
                onPress={() => { hapticTap(); handleMarkAllRead(); }}
                style={{
                  flex: 1, paddingVertical: 6, backgroundColor: WK.tealCard,
                  borderWidth: 2, borderColor: WK.border, alignItems: 'center',
                }}
              >
                <PixelText size={6} dim>MARK ALL READ</PixelText>
              </Pressable>
              <Pressable
                onPress={() => { hapticTap(); handleClearInbox(); }}
                style={{
                  flex: 1, paddingVertical: 6, backgroundColor: WK.tealCard,
                  borderWidth: 2, borderColor: WK.red, alignItems: 'center',
                }}
              >
                <PixelText size={6} color={WK.red}>DELETE INBOX</PixelText>
              </Pressable>
            </View>
          )
        )}
      </View>

      {selectedOffer ? (
        <AgentOfferDetail offer={selectedOffer} onBack={handleBack} />
      ) : selectedInboxLive ? (
        <InboxMessageDetail message={selectedInboxLive} onBack={handleBack} />
      ) : selectedNarrativeLive ? (
        <NarrativeMessageDetail message={selectedNarrativeLive} onBack={handleBack} />
      ) : listItems.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <PixelText size={16}>📭</PixelText>
          <PixelText size={8} dim>
            {allListItems.length > 0 ? 'NO MATCHING MESSAGES' : 'NO MESSAGES YET'}
          </PixelText>
        </View>
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(item) =>
            item.kind === 'agent_offer' ? item.offer.id : item.message.id
          }
          renderItem={({ item }) =>
            item.kind === 'agent_offer' ? (
              <AgentOfferCard offer={item.offer} onViewOffer={setSelectedOffer} />
            ) : item.kind === 'narrative' ? (
              <NarrativeMessageRow
                message={item.message}
                onPress={setSelectedNarrative}
                onDelete={handleDeleteNarrative}
              />
            ) : (
              <InboxMessageRow
                message={item.message}
                onPress={setSelectedInbox}
                onDelete={handleDeleteInbox}
              />
            )
          }
          contentContainerStyle={{ padding: 10, paddingBottom: FAB_CLEARANCE }}
        />
      )}
    </SafeAreaView>
  );
}

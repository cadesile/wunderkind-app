import { useEffect, useState } from 'react';
import { View, FlatList, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trash2 } from 'lucide-react-native';
import { useInboxStore, InboxMessage, InboxMessageType } from '@/stores/inboxStore';
import { useNarrativeStore } from '@/stores/narrativeStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useSquadStore } from '@/stores/squadStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useMarketStore } from '@/stores/marketStore';
import { useCoachStore } from '@/stores/coachStore';
import { getCoachPerception, getHeadCoach } from '@/engine/CoachPerception';
import { MarketPlayer } from '@/types/market';
import { reactionHandler } from '@/engine/ReactionHandler';
import { handleAcceptAgentOffer, handleRejectAgentOffer } from '@/utils/agentOfferHandlers';
import { NarrativeMessage, EventChoice, AgentOffer } from '@/types/narrative';
import { PixelText } from '@/components/ui/PixelText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SwipeConfirm } from '@/components/ui/SwipeConfirm';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { formatCurrencyCompact, getPlayerAskingPrice } from '@/utils/currency';
import { moraleEmoji } from '@/utils/morale';
import { WK, pixelShadow } from '@/constants/theme';
import { hapticTap, hapticWarning, hapticError } from '@/utils/haptics';

// ─── Agent offer card (list item) ────────────────────────────────────────────

function AgentOfferCard({ offer, onViewOffer }: { offer: AgentOffer; onViewOffer: (o: AgentOffer) => void }) {
  const currentWeek = useAcademyStore((s) => s.academy.weekNumber ?? 1);
  const player = useSquadStore((s) => s.players.find((p) => p.id === offer.playerId));
  const weeksLeft = offer.expiresWeek - currentWeek;

  return (
    <Pressable onPress={() => { hapticTap(); onViewOffer(offer); }}>
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 4,
        borderColor: WK.yellow,
        padding: 12,
        marginBottom: 10,
        ...pixelShadow,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Badge label="TRANSFER OFFER" color="yellow" />
          <PixelText size={6} dim>WK {offer.week}</PixelText>
        </View>

        <PixelText size={8} upper numberOfLines={2} style={{ marginBottom: 4 }}>
          {offer.playerName} → {offer.destinationClub}
        </PixelText>
        <PixelText size={6} dim style={{ marginBottom: 10 }}>
          {player?.position ?? '?'} · {offer.agentName} ({offer.agentCommissionRate}% comm.)
        </PixelText>

        <View style={{ gap: 4, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <PixelText size={6} dim>GROSS FEE</PixelText>
            <PixelText size={6} color={WK.text}>{formatCurrencyCompact(offer.estimatedFee)}</PixelText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <PixelText size={6} dim>NET PROCEEDS</PixelText>
            <PixelText size={6} color={WK.green}>{formatCurrencyCompact(offer.netProceeds)}</PixelText>
          </View>
        </View>

        <PixelText size={6} dim style={{ marginBottom: 12 }}>
          EXPIRES IN {weeksLeft} {weeksLeft === 1 ? 'WEEK' : 'WEEKS'}
        </PixelText>

        <Button label="VIEW OFFER →" variant="yellow" fullWidth onPress={() => { hapticTap(); onViewOffer(offer); }} />
      </View>
    </Pressable>
  );
}

// ─── Agent offer detail screen ────────────────────────────────────────────────

function AgentOfferDetail({ offer, onBack }: { offer: AgentOffer; onBack: () => void }) {
  const currentWeek = useAcademyStore((s) => s.academy.weekNumber ?? 1);
  const player = useSquadStore((s) => s.players.find((p) => p.id === offer.playerId));
  const coaches = useCoachStore((s) => s.coaches);
  const headCoach = getHeadCoach(coaches);
  const weeksLeft = offer.expiresWeek - currentWeek;

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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 10 }}>
      <Pressable onPress={() => { hapticTap(); onBack(); }} style={{ marginBottom: 4 }}>
        <PixelText size={8} color={WK.tealLight}>← BACK</PixelText>
      </Pressable>

      {/* ── Player mini-profile ─────────────────────────────────────────── */}
      {player && (
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.border,
          padding: 14,
          ...pixelShadow,
        }}>
          <PixelText size={6} color={WK.tealLight} style={{ marginBottom: 8 }}>PLAYER</PixelText>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <PixelText size={9} upper style={{ flex: 1 }}>{player.name}</PixelText>
            <View style={{ borderWidth: 2, borderColor: WK.yellow, paddingHorizontal: 6, paddingVertical: 3 }}>
              <PixelText size={7} color={WK.yellow}>{player.position}</PixelText>
            </View>
          </View>

          {age !== null && (
            <PixelText size={6} dim style={{ marginBottom: 8 }}>
              AGE {age} · {player.nationality}
            </PixelText>
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
            <PixelText size={14}>{moraleEmoji(player.morale ?? 70)}</PixelText>
            <PixelText size={6} dim>MORALE {player.morale ?? 70}</PixelText>
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
        <PixelText size={6} dim style={{ marginBottom: 12 }}>
          {offer.agentName} · {offer.agentCommissionRate}% COMMISSION
        </PixelText>

        <View style={{ gap: 6, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 2, borderBottomColor: WK.border }}>
            <PixelText size={6} dim>GROSS FEE</PixelText>
            <PixelText size={6} color={WK.text}>{formatCurrencyCompact(offer.estimatedFee)}</PixelText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 2, borderBottomColor: WK.border }}>
            <PixelText size={6} dim>AGENT COMMISSION</PixelText>
            <PixelText size={6} color={WK.red}>
              -{formatCurrencyCompact(offer.estimatedFee - offer.netProceeds)}
            </PixelText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
            <PixelText size={6} color={WK.green}>NET PROCEEDS</PixelText>
            <PixelText size={7} color={WK.green}>{formatCurrencyCompact(offer.netProceeds)}</PixelText>
          </View>
        </View>

        <PixelText size={6} dim>
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
          <PixelText size={6} color={WK.tealLight} style={{ marginBottom: 10 }}>COACH OPINION</PixelText>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <PixelText size={6} dim>HEAD COACH</PixelText>
            <PixelText size={6} color={WK.text}>{headCoach.name}</PixelText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <PixelText size={6} dim>EST. MARKET VALUE</PixelText>
            <PixelText size={6} color={WK.text}>{formatCurrencyCompact(coachOpinion.perceivedValue * 100)}</PixelText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <PixelText size={6} dim>OFFER vs VALUATION</PixelText>
            <PixelText size={6} color={coachOpinion.deltaPercent < -10 ? WK.green : coachOpinion.deltaPercent > 10 ? WK.red : WK.text}>
              {coachOpinion.deltaPercent > 0 ? '+' : ''}{coachOpinion.deltaPercent.toFixed(0)}%
            </PixelText>
          </View>

          <View style={{
            borderWidth: 2,
            borderColor: verdictColorMap[coachOpinion.verdictColor] ?? WK.border,
            padding: 10,
          }}>
            <PixelText size={7} color={verdictColorMap[coachOpinion.verdictColor] ?? WK.text}>
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

// ─── Type badge config ─────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<InboxMessageType, { label: string; color: 'yellow' | 'red' | 'green' | 'dim' }> = {
  guardian: { label: 'G', color: 'dim' },
  agent:    { label: 'A', color: 'dim' },
  sponsor:  { label: '$', color: 'green' },
  investor: { label: '£', color: 'yellow' },
  system:   { label: '!', color: 'red' },
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
  playerId: string;
}

function isGemMeta(meta: unknown): meta is GemPlayerMeta {
  return (
    typeof meta === 'object' &&
    meta !== null &&
    typeof (meta as GemPlayerMeta).playerId === 'string'
  );
}

// ─── Gem player card ───────────────────────────────────────────────────────────

function GemPlayerCard({ playerId, messageId }: { playerId: string; messageId: string }) {
  const player = useMarketStore((s) => s.players.find((p) => p.id === playerId));
  const { signPlayer } = useMarketStore.getState();
  const { respond } = useInboxStore.getState();
  const [recruited, setRecruited] = useState(false);

  // Already signed (player removed from market) or just signed this session
  if (!player || recruited) {
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

  // Compute age from dateOfBirth
  const age = player.dateOfBirth
    ? Math.floor((Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const ovr = player.perceivedAbility ?? player.currentAbility;
  const stars = '★'.repeat(player.potential ?? 0) + '☆'.repeat(5 - (player.potential ?? 0));
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
      <PixelText size={6} color={WK.tealLight} style={{ marginBottom: 8 }}>GEM PROSPECT</PixelText>

      {/* Name + position */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <PixelText size={8} upper style={{ flex: 1 }}>
          {player.firstName} {player.lastName}
        </PixelText>
        <View style={{
          borderWidth: 2,
          borderColor: WK.yellow,
          paddingHorizontal: 6,
          paddingVertical: 3,
        }}>
          <PixelText size={7} color={WK.yellow}>{player.position}</PixelText>
        </View>
      </View>

      {/* Age / nationality */}
      {(age !== null || player.nationality) && (
        <PixelText size={6} dim style={{ marginBottom: 8 }}>
          {[age !== null ? `AGE ${age}` : null, player.nationality].filter(Boolean).join(' · ')}
        </PixelText>
      )}

      {/* Potential stars */}
      <PixelText size={7} color={WK.yellow} style={{ marginBottom: 8 }}>{stars}</PixelText>

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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
        <PixelText size={6} dim>ASKING PRICE</PixelText>
        <PixelText size={6} color={WK.text}>
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
      paddingVertical: 6,
      borderBottomWidth: 2,
      borderBottomColor: WK.border,
    }}>
      <PixelText size={7} dim>{label}</PixelText>
      <PixelText size={7} color={WK.yellow}>{value}</PixelText>
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

  return (
    <Pressable onPress={() => { hapticTap(); onPress(message); }}>
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: isUnread ? WK.yellow : WK.border,
        borderLeftWidth: isUnread ? 4 : 3,
        borderLeftColor: isUnread ? WK.yellow : WK.border,
        padding: 12,
        marginBottom: 10,
        ...pixelShadow,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, gap: 6 }}>
          <Badge label={typeConf.label} color={typeConf.color} />
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
            <Pressable onPress={(e) => { e.stopPropagation?.(); hapticWarning(); onDelete(message); }} hitSlop={8}>
              <Trash2 size={14} color={WK.dim} />
            </Pressable>
          )}
        </View>
        <PixelText size={7} dim numberOfLines={2}>{message.body}</PixelText>
        <PixelText size={7} dim style={{ marginTop: 6 }}>WK {message.week}</PixelText>
      </View>
    </Pressable>
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
  const borderColor = isPending ? WK.green : isUnread ? WK.yellow : WK.border;

  return (
    <Pressable onPress={() => { hapticTap(); onPress(message); }}>
      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor,
        borderLeftWidth: 4,
        borderLeftColor: borderColor,
        padding: 12,
        marginBottom: 10,
        ...pixelShadow,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, gap: 6 }}>
          <Badge label="★" color="green" />
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
            <Pressable onPress={(e) => { e.stopPropagation?.(); hapticWarning(); onDelete(message); }} hitSlop={8}>
              <Trash2 size={14} color={WK.dim} />
            </Pressable>
          )}
        </View>
        <PixelText size={7} dim numberOfLines={2}>{message.body}</PixelText>
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

  useEffect(() => {
    if (!message.isRead) markRead(message.id);
  }, [message.id]);

  const typeConf = TYPE_CONFIG[message.type] ?? TYPE_CONFIG.system;
  const canRespond = message.requiresResponse && !message.response;
  const investorMeta = isInvestorMeta(message.metadata) ? message.metadata : null;
  const gemMeta = !investorMeta && isGemMeta(message.metadata) ? message.metadata : null;
  const sponsorMeta = message.type === 'sponsor' && message.metadata ? message.metadata as {
    sponsorId: string; sponsorName: string; weeklyPayment: number; contractWeeks: number; companySize: string;
  } : null;

  function handleAccept() {
    if (message.type === 'investor' && message.entityId && investorMeta) {
      addBalance(investorMeta.investmentAmount);
      setInvestorId(message.entityId);
      useFinanceStore.getState().addTransaction({
        amount: investorMeta.investmentAmount,
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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
      <Pressable onPress={() => { hapticTap(); onBack(); }} style={{ marginBottom: 12 }}>
        <PixelText size={8} color={WK.tealLight}>← BACK</PixelText>
      </Pressable>

      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.yellow,
        padding: 16,
        ...pixelShadow,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Badge label={typeConf.label} color={typeConf.color} />
          <PixelText size={7} dim>WK {message.week}</PixelText>
        </View>
        <PixelText size={9} upper style={{ marginBottom: 14 }}>{message.subject}</PixelText>
        <PixelText size={7} style={{ lineHeight: 16, color: WK.dim }}>{message.body}</PixelText>

        {message.type === 'sponsor' && sponsorMeta && (
          <View style={{ marginTop: 16, borderWidth: 2, borderColor: WK.tealMid, padding: 12 }}>
            <PixelText size={7} color={WK.tealLight} style={{ marginBottom: 8 }}>OFFER DETAILS</PixelText>
            <OfferRow label="WEEKLY INCOME" value={`£${sponsorMeta.weeklyPayment.toLocaleString()}`} />
            <OfferRow label="CONTRACT LENGTH" value={`${sponsorMeta.contractWeeks} WEEKS`} />
            <OfferRow label="SPONSOR SIZE" value={String(sponsorMeta.companySize)} />
            <View style={{ marginTop: 8 }}>
              <PixelText size={6} dim>
                TOTAL VALUE: £{(sponsorMeta.weeklyPayment * sponsorMeta.contractWeeks).toLocaleString()}
              </PixelText>
            </View>
          </View>
        )}

        {message.type === 'investor' && investorMeta && (
          <View style={{ marginTop: 16, borderWidth: 2, borderColor: WK.tealMid, padding: 12 }}>
            <PixelText size={7} color={WK.tealLight} style={{ marginBottom: 8 }}>OFFER DETAILS</PixelText>
            <OfferRow label="INVESTMENT" value={`£${investorMeta.investmentAmount.toLocaleString()}`} />
            <OfferRow label="EQUITY STAKE" value={`${investorMeta.equityPct}%`} />
            <OfferRow label="INVESTOR SIZE" value={String(investorMeta.investorSize)} />
            <View style={{ marginTop: 8 }}>
              <PixelText size={6} dim>
                INVESTOR RECEIVES {investorMeta.equityPct}% OF ALL FUTURE PLAYER SALES
              </PixelText>
            </View>
          </View>
        )}

        {message.response && (
          <View style={{
            marginTop: 16, paddingVertical: 8, paddingHorizontal: 12,
            borderWidth: 2, borderColor: message.response === 'accepted' ? WK.green : WK.red,
          }}>
            <PixelText size={7} color={message.response === 'accepted' ? WK.green : WK.red}>
              {message.response === 'accepted' ? '✓ ACCEPTED' : '✗ REJECTED'}
            </PixelText>
          </View>
        )}
      </View>

      {gemMeta && (
        <GemPlayerCard playerId={gemMeta.playerId} messageId={message.id} />
      )}

      {canRespond && (
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

  useEffect(() => {
    if (!message.readAt) markAsRead(message.id);
  }, [message.id]);

  function handleChoice(choice: EventChoice) {
    reactionHandler.handleChoice(message, choice);
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
      <Pressable onPress={() => { hapticTap(); onBack(); }} style={{ marginBottom: 12 }}>
        <PixelText size={8} color={WK.tealLight}>← BACK</PixelText>
      </Pressable>

      <View style={{
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.green,
        padding: 16,
        ...pixelShadow,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
          <Badge label="★" color="green" />
          <PixelText size={7} dim color={WK.tealLight}>STORY EVENT</PixelText>
        </View>

        <PixelText size={9} upper style={{ marginBottom: 14 }}>{message.title}</PixelText>
        <PixelText size={7} style={{ lineHeight: 16, color: WK.dim }}>{message.body}</PixelText>

        {message.statImpacts && message.statImpacts.length > 0 && (
          <View style={{
            marginTop: 14,
            borderWidth: 2,
            borderColor: WK.border,
            padding: 10,
            gap: 6,
          }}>
            <PixelText size={6} dim style={{ marginBottom: 4 }}>STAT IMPACT</PixelText>
            {message.statImpacts.map((impact, i) => {
              const isMorale = impact.label.toUpperCase().includes('MORALE');
              return (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <PixelText size={6} dim>{impact.label}</PixelText>
                  {isMorale ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <PixelText size={14}>{moraleEmoji(impact.from)}</PixelText>
                      <PixelText size={6} dim>→</PixelText>
                      <PixelText size={14}>{moraleEmoji(impact.to)}</PixelText>
                      <PixelText size={6} color={impact.delta >= 0 ? WK.green : WK.red}>
                        ({impact.delta >= 0 ? '+' : ''}{impact.delta})
                      </PixelText>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <PixelText size={6} dim>{impact.from}</PixelText>
                      <PixelText size={6} dim>→</PixelText>
                      <PixelText size={6} color={impact.delta >= 0 ? WK.green : WK.red}>{impact.to}</PixelText>
                      <PixelText size={6} color={impact.delta >= 0 ? WK.green : WK.red}>
                        ({impact.delta >= 0 ? '+' : ''}{impact.delta})
                      </PixelText>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {message.respondedAt && (
          <View style={{
            marginTop: 16, paddingVertical: 8, paddingHorizontal: 12,
            borderWidth: 2, borderColor: WK.tealMid,
          }}>
            <PixelText size={7} dim>✓ RESPONDED</PixelText>
          </View>
        )}
      </View>

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
  const inboxUnread = useInboxStore((s) => s.unreadCount());
  const { markAllRead: inboxMarkAllRead, clearDeletable: inboxClearDeletable, deleteMessage: inboxDelete } = useInboxStore();
  const agentOffers = useInboxStore((s) => s.agentOffers);
  const pendingOffers = agentOffers.filter((o) => o.status === 'pending');
  const narrativeMessages = useNarrativeStore((s) => s.messages);
  const narrativeUnread = useNarrativeStore((s) => s.unreadCount());
  const { markAllRead: narrativeMarkAllRead, clearDeletable: narrativeClearDeletable, deleteMessage: narrativeDelete } = useNarrativeStore();

  const [selectedInbox, setSelectedInbox] = useState<InboxMessage | null>(null);
  const [selectedNarrative, setSelectedNarrative] = useState<NarrativeMessage | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<AgentOffer | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  // Keep selections in sync with live store updates
  const selectedInboxLive = selectedInbox
    ? (inboxMessages.find((m) => m.id === selectedInbox.id) ?? null)
    : null;
  const selectedNarrativeLive = selectedNarrative
    ? (narrativeMessages.find((m) => m.id === selectedNarrative.id) ?? null)
    : null;

  const totalUnread = inboxUnread + narrativeUnread;
  const headerLabel = totalUnread > 0 ? `INBOX (${totalUnread})` : 'INBOX';

  // Priority order: pending agent offers → actionable narrative → narrative → inbox
  const listItems: ListItem[] = [
    ...pendingOffers.map((o): ListItem => ({ kind: 'agent_offer', offer: o })),
    ...narrativeMessages
      .filter((m) => m.isActionable && !m.respondedAt)
      .map((m): ListItem => ({ kind: 'narrative', message: m })),
    ...narrativeMessages
      .filter((m) => !(m.isActionable && !m.respondedAt))
      .map((m): ListItem => ({ kind: 'narrative', message: m })),
    ...inboxMessages.map((m): ListItem => ({ kind: 'inbox', message: m })),
  ];

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
          <PixelText size={8} dim>NO MESSAGES YET</PixelText>
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
          contentContainerStyle={{ padding: 10 }}
        />
      )}
    </SafeAreaView>
  );
}

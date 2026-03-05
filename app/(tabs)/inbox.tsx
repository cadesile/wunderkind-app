import { useEffect, useState } from 'react';
import { View, FlatList, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInboxStore, InboxMessage, InboxMessageType } from '@/stores/inboxStore';
import { useNarrativeStore } from '@/stores/narrativeStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useSquadStore } from '@/stores/squadStore';
import { useFinanceStore } from '@/stores/financeStore';
import { reactionHandler } from '@/engine/ReactionHandler';
import { handleAcceptAgentOffer, handleRejectAgentOffer } from '@/utils/agentOfferHandlers';
import { NarrativeMessage, EventChoice, AgentOffer } from '@/types/narrative';
import { PixelText } from '@/components/ui/PixelText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { formatCurrencyCompact } from '@/utils/currency';
import { WK, pixelShadow } from '@/constants/theme';

// ─── Agent offer card ─────────────────────────────────────────────────────────

function AgentOfferCard({ offer }: { offer: AgentOffer }) {
  const currentWeek = useAcademyStore((s) => s.academy.weekNumber ?? 1);
  const player = useSquadStore((s) => s.players.find((p) => p.id === offer.playerId));
  const weeksLeft = offer.expiresWeek - currentWeek;

  return (
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

      <View style={{ gap: 4, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <PixelText size={6} dim>GROSS FEE</PixelText>
          <PixelText size={6} color={WK.text}>{formatCurrencyCompact(offer.estimatedFee)}</PixelText>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <PixelText size={6} dim>NET PROCEEDS</PixelText>
          <PixelText size={6} color={WK.green}>{formatCurrencyCompact(offer.netProceeds)}</PixelText>
        </View>
      </View>

      <PixelText size={6} dim style={{ marginBottom: 10 }}>
        EXPIRES IN {weeksLeft} {weeksLeft === 1 ? 'WEEK' : 'WEEKS'}
      </PixelText>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => handleAcceptAgentOffer(offer.id)}
          style={{
            flex: 1,
            backgroundColor: WK.green,
            borderWidth: 3,
            borderColor: WK.border,
            padding: 10,
            alignItems: 'center',
            minHeight: 44,
            justifyContent: 'center',
          }}
        >
          <PixelText size={7} color={WK.text}>ACCEPT</PixelText>
        </Pressable>
        <Pressable
          onPress={() => handleRejectAgentOffer(offer.id)}
          style={{
            flex: 1,
            backgroundColor: WK.red,
            borderWidth: 3,
            borderColor: WK.border,
            padding: 10,
            alignItems: 'center',
            minHeight: 44,
            justifyContent: 'center',
          }}
        >
          <PixelText size={7} color={WK.text}>DECLINE</PixelText>
        </Pressable>
      </View>
    </View>
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
}: {
  message: InboxMessage;
  onPress: (m: InboxMessage) => void;
}) {
  const isUnread = !message.isRead;
  const typeConf = TYPE_CONFIG[message.type] ?? TYPE_CONFIG.system;

  return (
    <Pressable onPress={() => onPress(message)}>
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
}: {
  message: NarrativeMessage;
  onPress: (m: NarrativeMessage) => void;
}) {
  const isUnread = !message.readAt;
  const isPending = message.isActionable && !message.respondedAt;
  const borderColor = isPending ? WK.green : isUnread ? WK.yellow : WK.border;

  return (
    <Pressable onPress={() => onPress(message)}>
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
  const { setInvestorId, addBalance } = useAcademyStore();

  useEffect(() => {
    if (!message.isRead) markRead(message.id);
  }, [message.id]);

  const typeConf = TYPE_CONFIG[message.type] ?? TYPE_CONFIG.system;
  const canRespond = message.requiresResponse && !message.response;
  const investorMeta = isInvestorMeta(message.metadata) ? message.metadata : null;

  function handleAccept() {
    if (message.type === 'investor' && message.entityId && investorMeta) {
      addBalance(investorMeta.investmentAmount);
      setInvestorId(message.entityId);
      useFinanceStore.getState().addTransaction({
        amount: investorMeta.investmentAmount * 100, // convert whole pounds → pence
        category: 'investment',
        description: `${investorMeta.investorName} — ${investorMeta.equityPct}% equity deal`,
        weekNumber: message.week,
      });
    }
    respond(message.id, 'accepted');
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
      <Pressable onPress={onBack} style={{ marginBottom: 12 }}>
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
      <Pressable onPress={onBack} style={{ marginBottom: 12 }}>
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
  const pendingOffers = useInboxStore((s) => s.agentOffers.filter((o) => o.status === 'pending'));
  const narrativeMessages = useNarrativeStore((s) => s.messages);
  const narrativeUnread = useNarrativeStore((s) => s.unreadCount());

  const [selectedInbox, setSelectedInbox] = useState<InboxMessage | null>(null);
  const [selectedNarrative, setSelectedNarrative] = useState<NarrativeMessage | null>(null);

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
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      <PitchBackground />

      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 4,
        borderBottomColor: WK.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}>
        <PixelText size={10} upper>{headerLabel}</PixelText>
      </View>

      {selectedInboxLive ? (
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
              <AgentOfferCard offer={item.offer} />
            ) : item.kind === 'narrative' ? (
              <NarrativeMessageRow
                message={item.message}
                onPress={setSelectedNarrative}
              />
            ) : (
              <InboxMessageRow
                message={item.message}
                onPress={setSelectedInbox}
              />
            )
          }
          contentContainerStyle={{ padding: 10 }}
        />
      )}
    </SafeAreaView>
  );
}

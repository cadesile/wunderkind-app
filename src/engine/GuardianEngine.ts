import { Guardian, GuardianGender } from '@/types/guardian';
import { Player } from '@/types/player';
import { InboxMessage } from '@/stores/inboxStore';
import { useGuardianStore } from '@/stores/guardianStore';
import { useSquadStore } from '@/stores/squadStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useAcademyStore } from '@/stores/academyStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useEventStore } from '@/stores/eventStore';
import { EventCategory } from '@/types/narrative';
import { uuidv7 } from '@/utils/uuidv7';

// ─── Name banks ───────────────────────────────────────────────────────────────

const MALE_FIRST_NAMES = [
  'David', 'James', 'Michael', 'Robert', 'William', 'Richard', 'Thomas',
  'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Paul', 'Mark', 'George',
  'Steven', 'Kevin', 'Brian', 'Timothy', 'Andrew', 'Kenneth', 'Edward',
  'Samuel', 'Patrick', 'Raymond', 'Peter', 'Carlos', 'Mohammed', 'Seun',
  'Liam', 'Kwame',
];

const FEMALE_FIRST_NAMES = [
  'Sarah', 'Jennifer', 'Emily', 'Amanda', 'Jessica', 'Ashley', 'Stephanie',
  'Melissa', 'Nicole', 'Michelle', 'Rachel', 'Elizabeth', 'Amy', 'Angela',
  'Christine', 'Rebecca', 'Laura', 'Linda', 'Patricia', 'Sandra', 'Karen',
  'Lisa', 'Barbara', 'Dorothy', 'Susan', 'Carol', 'Nancy', 'Donna', 'Marie',
  'Claire',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Guardian generation ──────────────────────────────────────────────────────

/**
 * Generates 1 or 2 guardians for a player.
 * Configuration: 80% = 1 male + 1 female; 10% = 1 guardian; 10% = same-sex pair.
 * Does NOT write to the store — caller is responsible.
 */
export function generateGuardiansForPlayer(player: { id: string; name: string }): Guardian[] {
  const lastName = player.name.split(' ').at(-1) ?? player.name;

  function makeGuardian(gender: GuardianGender): Guardian {
    const namePool = gender === 'male' ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES;
    return {
      id: uuidv7(),
      playerId: player.id,
      firstName: pick(namePool),
      lastName,
      gender,
      demandLevel: 1 + Math.floor(Math.random() * 10),
      loyaltyToAcademy: 50,
      ignoredRequestCount: 0,
    };
  }

  const roll = Math.random();
  if (roll < 0.80) {
    // Most common: one male + one female guardian
    return [makeGuardian('male'), makeGuardian('female')];
  } else if (roll < 0.90) {
    // Single guardian — 70% chance female, 30% male
    return [makeGuardian(Math.random() < 0.70 ? 'female' : 'male')];
  } else {
    // Same-sex pair
    const gender: GuardianGender = Math.random() < 0.5 ? 'male' : 'female';
    return [makeGuardian(gender), makeGuardian(gender)];
  }
}

// ─── Guardian note generation ─────────────────────────────────────────────────

type DemandBucket = 'low' | 'moderate' | 'high';
type LoyaltyBucket = 'low' | 'neutral' | 'warm';

const VAGUE_TEMPLATES = [
  'Spoke briefly with the family. Seem like decent people — hard to get a proper read in the time I had.',
  "Had a short exchange with them before I had to leave. Couldn't form a strong impression either way.",
  "The family were present but quiet. I wouldn't read too much into it — plenty of families take time to open up.",
  "I managed a brief introduction before the session ended. They seem engaged, but I didn't get long enough to really assess the situation.",
  'Polite enough conversation, nothing particularly memorable. You never really know until the relationship develops.',
];

const MODERATE_TEMPLATES: Record<DemandBucket, Record<LoyaltyBucket, string[]>> = {
  high: {
    low: [
      '{guardian_name} came across as quite direct and protective. There\'s a sense they\'ve been through this process before and won\'t be shy about making their expectations known.',
      'The family are clearly very invested. They asked a lot of questions and gave the impression they\'d want regular contact — possibly more than most.',
      '{guardian_name} was polished and professional in the meeting, which usually means they know their worth. Worth keeping them close.',
    ],
    neutral: [
      'A very engaged family — {guardian_name} in particular had plenty of questions and will clearly want to be kept in the loop.',
      'They\'re enthusiastic about the opportunity but will need nurturing. Expect regular communication requests going forward.',
      '{guardian_name} struck me as someone who takes an active interest in their child\'s career. They\'ll want to see clear development plans.',
    ],
    warm: [
      'A really positive meeting — {guardian_name} was warm and enthusiastic, but clearly very involved. They\'ll be engaged, which can be a good thing.',
      'Very supportive family, lots of energy in the room. They\'ll be active participants — worth setting expectations early.',
      '{guardian_name} was genuinely excited about the academy, though they\'ll likely want regular updates and involvement.',
    ],
  },
  moderate: {
    low: [
      'They came across as cautious — understandably so. {guardian_name} had a few pointed questions and seemed to be weighing things up carefully.',
      'A measured family. They weren\'t hostile but weren\'t easily won over either. I\'d say there\'s work to do before they\'re fully on board.',
      '{guardian_name} was polite but reserved. I get the sense they\'ve been disappointed before — handle with care.',
    ],
    neutral: [
      'Sensible, pragmatic family. {guardian_name} asked fair questions and seemed to take the answers at face value. Should be manageable.',
      'A fairly typical meeting — nothing to set alarm bells off, nothing to get particularly excited about.',
      '{guardian_name} was professional throughout. I think they\'ll be straightforward to work with as long as we communicate clearly.',
    ],
    warm: [
      '{guardian_name} was genuinely warm and supportive. Seemed comfortable with the setup and happy with how the visit went.',
      'A very positive meeting. The family are bought in and seem to trust the process — good foundation to build from.',
      '{guardian_name} left the visit clearly impressed. They\'ll be a pleasure to work with if this progresses.',
    ],
  },
  low: {
    low: [
      "A quiet meeting. {guardian_name} wasn't particularly open, but they weren't difficult either — just hard to read.",
      "They didn't give much away. The meeting was fine but brief — I left without a strong sense of where they stand.",
      '{guardian_name} was present but distracted. I wouldn\'t draw strong conclusions either way.',
    ],
    neutral: [
      "Relaxed family — {guardian_name} seemed comfortable and undemanding. Should be easy to manage.",
      "A straightforward meeting. No red flags, no particular concerns. {guardian_name} seemed happy to leave decisions to the academy.",
      "The family came across as laid back about the whole thing. {guardian_name} didn't press on many issues.",
    ],
    warm: [
      '{guardian_name} was genuinely lovely — very supportive, easy conversation. Low-maintenance and positive.',
      'A pleasure to meet. {guardian_name} asked sensible questions and left the meeting clearly happy.',
      'Exactly the kind of family you want — warm, trusting, and low on demands. {guardian_name} would be a pleasure to work with.',
    ],
  },
};

const ACCURATE_TEMPLATES: Record<DemandBucket, Record<LoyaltyBucket, string[]>> = {
  high: {
    low: [
      "{guardian_name} was polite but direct — they've had bad experiences with academies before and will need careful handling. This one could be high-maintenance if ignored.",
      "I'll be honest: {guardian_name} is going to be a handful if the communication isn't consistent. They have high expectations and low trust at the moment.",
      "Very demanding family, and frankly not particularly warm about the setup. {guardian_name} will need to be actively managed — don't let this one slip.",
    ],
    neutral: [
      '{guardian_name} is clearly invested and will want regular dialogue. They\'re open to the relationship working but won\'t tolerate being left out of the loop.',
      "High expectations from {guardian_name} — they're not hostile, but they'll hold us to account. Stay on top of communication.",
      "A demanding family who are broadly positive but have plenty of questions. {guardian_name} will want to feel like a partner in the process, not an afterthought.",
    ],
    warm: [
      '{guardian_name} was genuinely warm about the academy and clearly excited. They\'re involved and will be demanding, but from a place of real enthusiasm.',
      'Very active family who are fully on board with the project. {guardian_name} will want regular updates, but they\'re pushing in the right direction.',
      'A positive meeting, though {guardian_name} made it clear they\'ll want to be kept informed at every step. That\'s manageable given how positive they were overall.',
    ],
  },
  moderate: {
    low: [
      "{guardian_name} had reasonable expectations but wasn't particularly sold on the academy. Worth investing time to bring them on side.",
      'Moderate demands, cautious disposition. {guardian_name} will need some early wins to build trust before they\'re fully committed.',
      '{guardian_name} made clear they\'ll be watching closely. Keep them informed and they should be manageable.',
    ],
    neutral: [
      "Straightforward meeting with {guardian_name}. Reasonable expectations and an open mind — should be a perfectly workable relationship.",
      "{guardian_name} was professional and easy to talk to. They have sensible requirements and seem content to trust the process.",
      "Nothing to worry about here. {guardian_name} was engaged and balanced — standard family dynamic, easy to manage.",
    ],
    warm: [
      '{guardian_name} left the meeting clearly positive about the academy. Reasonable in their expectations and very warm in their outlook.',
      'A genuinely easy meeting. {guardian_name} is supportive and has sensible expectations — this should be a smooth relationship.',
      'Positive family dynamic. {guardian_name} is engaged without being demanding, and left the session in good spirits.',
    ],
  },
  low: {
    low: [
      "Hard to read — {guardian_name} was quiet throughout and gave little away. They weren't hostile, but something felt off.",
      "{guardian_name} didn't ask much and didn't say much. That could be fine, or it could mean they're not fully engaged. I'd keep an eye on it.",
      'A surprisingly flat meeting. {guardian_name} seemed disengaged. Low demands, but also low enthusiasm — not sure where their head is at.',
    ],
    neutral: [
      'Easy going family. {guardian_name} had few demands and seemed relaxed about the arrangement.',
      "{guardian_name} was pleasant but undemanding. I'd expect minimal friction from this side.",
      "A calm, unassuming family. {guardian_name} seemed comfortable leaving things in our hands — straightforward.",
    ],
    warm: [
      "{guardian_name} was genuinely warm about the academy setup. Easy conversation — I think they'd be a pleasure to work with.",
      '{guardian_name} had nothing but positive things to say and asked almost nothing of us.',
      'A lovely meeting. {guardian_name} was enthusiastic, supportive, and low on demands. This one\'s a tick in the win column.',
    ],
  },
};

function getDemandBucket(demandLevel: number): DemandBucket {
  if (demandLevel >= 7) return 'high';
  if (demandLevel >= 4) return 'moderate';
  return 'low';
}

function getLoyaltyBucket(loyalty: number): LoyaltyBucket {
  if (loyalty <= 35) return 'low';
  if (loyalty <= 65) return 'neutral';
  return 'warm';
}

function getWorstGuardianFromArray(guardians: Guardian[]): Guardian {
  return guardians.reduce((worst, g) => {
    if (g.demandLevel > worst.demandLevel) return g;
    if (g.demandLevel === worst.demandLevel && g.loyaltyToAcademy < worst.loyaltyToAcademy) return g;
    return worst;
  });
}

/**
 * Generates a scout's flavour-text paragraph about a player's guardians.
 * Scout successRate determines how accurate the note is.
 * Never exposes raw numbers — only narrative text.
 */
export function generateGuardianNote(guardians: Guardian[], scoutSuccessRate: number): string {
  if (guardians.length === 0) return '';

  const worst = getWorstGuardianFromArray(guardians);
  const guardianName = `${worst.firstName} ${worst.lastName}`;

  let template: string;

  if (scoutSuccessRate < 55) {
    // Vague: generic, no real signal
    template = pick(VAGUE_TEMPLATES);
  } else {
    const demand = getDemandBucket(worst.demandLevel);
    const loyalty = getLoyaltyBucket(worst.loyaltyToAcademy);
    const pool = scoutSuccessRate >= 75
      ? ACCURATE_TEMPLATES[demand][loyalty]
      : MODERATE_TEMPLATES[demand][loyalty];
    template = pick(pool);
  }

  return template.replace(/{guardian_name}/g, guardianName);
}

// ─── Financial helpers ────────────────────────────────────────────────────────

const FINANCIAL_SLUGS = new Set([
  'guardian_request_financial_gift',
  'guardian_request_travel_upgrade',
]);

function isFinancialRequest(slug: string): boolean {
  return FINANCIAL_SLUGS.has(slug);
}

function calculateGuardianCost(): number {
  const { academy } = useAcademyStore.getState();
  // Both totalCareerEarnings and balance are stored in pence
  const academyValuePence = academy.totalCareerEarnings + (academy.balance * 0.5);
  const rate = 0.0025 + Math.random() * 0.0075; // 0.25%–1.0%
  const rawCost = Math.round(academyValuePence * rate);
  const minimumCost = 5000; // £50 minimum (in pence)
  return Math.max(minimumCost, rawCost);
}

// ─── Weekly tick ──────────────────────────────────────────────────────────────

/**
 * Process guardian system for one weekly tick:
 * 1. Event-driven spikes (threat warnings, low-morale concerns)
 * 2. Regular message generation (capped, probability-gated)
 * 3. Demand decay (every 4 weeks)
 * 4. Threat execution (withdrawal when loyalty < 20)
 */
export function processGuardianTick(weekNumber: number): void {
  const { messages: inboxMessages, addMessage } = useInboxStore.getState();
  const { players } = useSquadStore.getState();
  const allGuardians = useGuardianStore.getState().guardians;

  const activePlayers = players.filter((p) => p.isActive);

  // ── Event-driven spikes ──────────────────────────────────────────────────────

  for (const player of activePlayers) {
    const guardians = allGuardians.filter((g) => g.playerId === player.id);
    if (guardians.length === 0) continue;

    const worstGuardian = getWorstGuardianFromArray(guardians);

    // Spike 1: Threat warning when loyalty < 20
    if (worstGuardian.loyaltyToAcademy < 20) {
      const alreadyFired = inboxMessages.some(
        (m) => m.week === weekNumber &&
               m.entityId === player.id &&
               (m.metadata as Record<string, unknown> | undefined)?.templateSlug === 'guardian_threat_withdrawal',
      );
      if (!alreadyFired) {
        const template = useEventStore.getState().getTemplateBySlug('guardian_threat_withdrawal');
        if (template) {
          const guardianNames = guardians.map((g) => g.firstName).join(' & ');
          const body = template.bodyTemplate
            .replace('{guardian_name}', guardianNames)
            .replace('{player_name}', player.name);
          addMessage({
            id: uuidv7(),
            type: 'guardian',
            week: weekNumber,
            subject: template.title,
            body,
            isRead: false,
            requiresResponse: false,
            entityId: player.id,
            metadata: {
              templateSlug: template.slug,
              guardianIds: guardians.map((g) => g.id),
              worstGuardianId: worstGuardian.id,
            },
          });
        }
      }
    }

    // Spike 2: Low-morale concern when player morale < 30
    if ((player.morale ?? 70) < 30) {
      const alreadyFired = inboxMessages.some(
        (m) => m.week === weekNumber &&
               m.entityId === player.id &&
               (m.metadata as Record<string, unknown> | undefined)?.templateSlug === 'guardian_low_morale_concern',
      );
      if (!alreadyFired) {
        const template = useEventStore.getState().getTemplateBySlug('guardian_low_morale_concern');
        if (template) {
          const guardianNames = guardians.map((g) => g.firstName).join(' & ');
          const body = template.bodyTemplate
            .replace('{guardian_name}', guardianNames)
            .replace('{player_name}', player.name);
          addMessage({
            id: uuidv7(),
            type: 'guardian',
            week: weekNumber,
            subject: template.title,
            body,
            isRead: false,
            requiresResponse: false,
            entityId: player.id,
            metadata: {
              templateSlug: template.slug,
              guardianIds: guardians.map((g) => g.id),
              worstGuardianId: worstGuardian.id,
            },
          });
        }
      }
    }
  }

  // ── Regular message generation ───────────────────────────────────────────────

  const maxMessages = Math.max(1, Math.floor(activePlayers.length / 5));
  const eligiblePlayers = activePlayers.filter(
    (p) => allGuardians.some((g) => g.playerId === p.id),
  );

  let messagesGenerated = 0;
  // Shuffle to avoid always picking the same player first
  const shuffled = [...eligiblePlayers].sort(() => Math.random() - 0.5);

  for (const player of shuffled) {
    if (messagesGenerated >= maxMessages) break;
    if (Math.random() > 0.25) continue; // 25% base chance per slot

    const guardians = allGuardians.filter((g) => g.playerId === player.id);
    if (guardians.length === 0) continue;

    const worstGuardian = getWorstGuardianFromArray(guardians);

    // Loyalty-based suppression
    if (worstGuardian.loyaltyToAcademy >= 90 && Math.random() > 0.0625) continue;
    else if (worstGuardian.loyaltyToAcademy >= 70 && Math.random() > 0.125) continue;

    const template = useEventStore.getState().getWeightedRandomTemplate(EventCategory.GUARDIAN);
    if (!template) continue;

    const guardianNames = guardians.map((g) => g.firstName).join(' & ');
    const body = template.bodyTemplate
      .replace('{guardian_name}', guardianNames)
      .replace('{player_name}', player.name);

    const costPence = isFinancialRequest(template.slug) ? calculateGuardianCost() : undefined;

    const message: InboxMessage = {
      id: uuidv7(),
      type: 'guardian',
      week: weekNumber,
      subject: template.title,
      body,
      isRead: false,
      requiresResponse: true,
      entityId: player.id,
      metadata: {
        templateSlug: template.slug,
        guardianIds: guardians.map((g) => g.id),
        worstGuardianId: worstGuardian.id,
        ...(costPence !== undefined ? { costPence } : {}),
      },
    };

    addMessage(message);
    messagesGenerated++;
  }

  // ── Demand decay (every 4 weeks) ─────────────────────────────────────────────

  if (weekNumber % 4 === 0) {
    allGuardians.forEach((g) => {
      if (g.loyaltyToAcademy >= 70 && g.demandLevel > 1) {
        useGuardianStore.getState().updateGuardian(g.id, {
          demandLevel: g.demandLevel - 1,
        });
      }
    });
  }

  // ── Threat execution ─────────────────────────────────────────────────────────
  // Guardians with loyalty < 20 withdraw the player from the academy.

  for (const player of activePlayers) {
    const guardians = allGuardians.filter((g) => g.playerId === player.id);
    if (guardians.length === 0) continue;

    const hasLowLoyalty = guardians.some((g) => g.loyaltyToAcademy < 20);
    if (!hasLowLoyalty) continue;

    // Check we haven't already processed a withdrawal for this player this week
    const alreadyWithdrawn = inboxMessages.some(
      (m) => m.entityId === player.id &&
             (m.metadata as Record<string, unknown> | undefined)?.type === 'guardian_withdrawal',
    );
    if (alreadyWithdrawn) continue;

    // Soft-delete the player
    useSquadStore.getState().updatePlayer(player.id, {
      isActive: false,
      status: 'transferred',
    });

    // Transfer record
    useFinanceStore.getState().addTransfer({
      playerId: player.id,
      playerName: player.name,
      destinationClub: 'Withdrawn by Guardian',
      grossFee: 0,
      agentCommission: 0,
      netProceeds: 0,
      week: weekNumber,
      type: 'guardian_withdrawal',
    });

    // Remove guardians from store
    useGuardianStore.getState().removeGuardiansForPlayer(player.id);

    // Confirmation inbox message
    addMessage({
      id: uuidv7(),
      type: 'system',
      week: weekNumber,
      subject: `${player.name} Has Been Withdrawn`,
      body: `A guardian of ${player.name} has lost confidence in the academy and has withdrawn them from your programme. This follows a breakdown in the relationship that was not resolved in time.`,
      isRead: false,
      requiresResponse: false,
      entityId: player.id,
      metadata: { type: 'guardian_withdrawal', playerId: player.id },
    });
  }
}

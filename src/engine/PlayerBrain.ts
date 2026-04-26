import type { Player, PersonalityMatrix } from '@/types/player';

export class PlayerBrain {
  /**
   * Assess whether a player wants to accept a transfer offer.
   *
   * @param player            AMP squad player
   * @param ampReputation     AMP club reputation (0–100)
   * @param ampTier           AMP club numeric tier (0–3, via TIER_ORDER)
   * @param biddingReputation Bidding NPC club reputation (0–100)
   * @param biddingTier       Bidding club app tier (0–3, via worldTierToAppTier)
   */
  static assessTransferOffer(
    player: Player,
    ampReputation: number,
    ampTier: number,
    biddingReputation: number,
    biddingTier: number,
  ): { wantsTransfer: boolean; reasoning: string } {
    const { loyalty, ambition, consistency } = player.personality;

    let score = 50;

    // Loyalty pulls toward staying
    score -= (loyalty - 10) * 2.5;

    // Ambition pulls toward a higher-tier move
    if (biddingTier > ampTier) {
      score += (ambition - 10) * 2.5 * (biddingTier - ampTier);
    }

    // Reputation delta — higher-rep club is attractive
    const repDelta = biddingReputation - ampReputation;
    score += repDelta * 0.3;

    // Randomness driven by inconsistency (low consistency = more volatile)
    const noise = (20 - consistency) * 1.5;
    score += Math.random() * noise - noise / 2;

    const wantsTransfer = score >= 50;

    let reasoning: string;
    if (wantsTransfer) {
      if (biddingTier > ampTier) {
        reasoning = 'This is a step up in class. My ambition demands I pursue it.';
      } else if (repDelta > 15) {
        reasoning = 'The bidding club has a stronger reputation — a promising move.';
      } else {
        reasoning = 'I feel ready to explore a new challenge.';
      }
    } else {
      if (loyalty > 14) {
        reasoning = 'I feel a strong loyalty to this club and the staff who developed me.';
      } else {
        reasoning = 'I am not convinced this move is right for my development.';
      }
    }

    return { wantsTransfer, reasoning };
  }

  /**
   * Compute personality trait shifts when the AMP rejects an offer from a higher-tier club.
   * Returns empty object when biddingTier <= ampTier (no fallout for same/lower tier rejections).
   *
   * @param player        The affected AMP player
   * @param biddingTier   Bidding club app tier (0–3)
   * @param ampTier       AMP club app tier (0–3)
   */
  static computeRejectionFallout(
    player: Player,
    biddingTier: number,
    ampTier: number,
  ): Partial<PersonalityMatrix> {
    if (biddingTier <= ampTier) return {};

    const { ambition, loyalty } = player.personality;
    const tierGap = biddingTier - ampTier; // 1, 2, or 3

    // Base negative impact scaled by ambition and tier gap
    const baseMagnitude = (ambition / 20) * tierGap * 2;

    // Loyalty reduces the damage
    const loyaltyMitigation = loyalty / 20; // 0.05 → 1.0
    const finalMagnitude = Math.max(0.5, baseMagnitude * (1 - loyaltyMitigation * 0.6));

    return {
      professionalism: -Math.round(finalMagnitude),
      temperament:     -Math.round(finalMagnitude * 0.75),
    };
  }
}

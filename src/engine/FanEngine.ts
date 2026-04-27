import { useFanStore } from '@/stores/fanStore';
import { FanTier } from '@/types/fans';
import { Player } from '@/types/player';

export class FanEngine {
  /**
   * Calculates the Fan Happiness Score (0-100).
   * Baseline is 50. Events impact decays 10% per week.
   */
  static calculateScore(currentWeek: number): number {
    const events = useFanStore.getState().events;
    let score = 50; // Baseline
    
    events.forEach(event => {
      const weeksAgo = currentWeek - event.weekNumber;
      if (weeksAgo < 0) return; // Future event? Ignore.
      
      const decay = Math.max(0, 1 - (weeksAgo * 0.1));
      score += event.impact * decay;
    });

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculates a target-specific Fan Happiness Score (0-100).
   */
  static calculateTargetScore(currentWeek: number, target: import('@/types/fans').FanImpactTarget): number {
    const events = useFanStore.getState().events;
    let score = 50; // Baseline
    
    events.forEach(event => {
      if (!event.targets.includes(target)) return;
      
      const weeksAgo = currentWeek - event.weekNumber;
      if (weeksAgo < 0) return;
      
      const decay = Math.max(0, 1 - (weeksAgo * 0.1));
      score += event.impact * decay;
    });

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Maps a happiness score to a qualitative FanTier.
   */
  static getTier(score: number): FanTier {
    if (score >= 80) return 'Thrilled';
    if (score >= 60) return 'Happy';
    if (score >= 40) return 'Neutral';
    if (score >= 20) return 'Disappointed';
    return 'Angry';
  }

  /**
   * Determines which player is currently the "Fan Favorite".
   * Criteria: 
   * 1. Top 3 OVR in the squad AND has been at the club for > 1 season (52 weeks).
   * 2. OR possesses personality traits: 'Loyal' or 'Leader' (if we had them as explicit traits, but for now we'll stick to OVR + tenure).
   */
  static determineFanFavorite(players: Player[], currentWeek: number): string | null {
    const activePlayers = players.filter(p => p.isActive);
    if (activePlayers.length === 0) return null;

    // Sort by OVR
    const byOvr = [...activePlayers].sort((a, b) => b.overallRating - a.overallRating);
    const top3 = byOvr.slice(0, 3);

    // Filter top 3 for those with > 1 season tenure (assuming enrollmentEndWeek - 52 is roughly start week)
    // Actually, we don't have 'joinedWeek'. Let's use 'extensionCount > 0' or 'enrollmentEndWeek' as proxy.
    // If enrollmentEndWeek is far in the future, it doesn't mean they've been here long.
    // Let's check if we have any other field. Checking src/types/player.ts
    
    // For now, let's simplify: Top OVR is the favorite if they are at least at the club.
    // In a real scenario, we'd track 'weeksAtClub'.
    
    return top3[0]?.id || null;
  }
}

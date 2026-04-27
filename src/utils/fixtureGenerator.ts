export interface GeneratedFixture {
  round: number;
  homeClubId: string;
  awayClubId: string;
}

/**
 * Generates a single round-robin fixture list using the circle method.
 *
 * - Participants should include the AMP club ID followed by all NPC club IDs.
 * - If participant count is odd, a 'bye' placeholder is added; fixtures involving
 *   'bye' are excluded from output (the team drawn against bye sits that round out).
 * - Output is deterministic for identical input.
 */
export function generateRoundRobin(participants: string[]): GeneratedFixture[] {
  const teams = [...participants];

  // Circle method requires even number of participants
  if (teams.length % 2 !== 0) {
    teams.push('bye');
  }

  const n = teams.length;
  const numRounds = n - 1;
  const firstLeg: GeneratedFixture[] = [];

  const fixed = teams[0];
  const rotating = [...teams.slice(1)];

  for (let r = 0; r < numRounds; r++) {
    const roundNum = r + 1;
    const current = [fixed, ...rotating];

    for (let i = 0; i < n / 2; i++) {
      const a = current[i];
      const b = current[n - 1 - i];

      if (a === 'bye' || b === 'bye') {
        continue;
      }

      // 1. For the fixed team (i === 0), strictly alternate Home/Away based on round number
      // 2. For other teams, use the standard circle method venue assignment (alternate by index)
      const isFixed = i === 0;
      let home, away;

      if (isFixed) {
        if (roundNum % 2 === 0) {
          home = b;
          away = a;
        } else {
          home = a;
          away = b;
        }
      } else {
        if (i % 2 === 0) {
          home = a;
          away = b;
        } else {
          home = b;
          away = a;
        }
      }

      firstLeg.push({ round: roundNum, homeClubId: home, awayClubId: away });
    }

    // Circle rotation: last element of rotating array moves to the front
    rotating.unshift(rotating.pop()!);
  }

  // Generate second leg (reverse fixtures)
  const secondLeg: GeneratedFixture[] = firstLeg.map((f) => ({
    round: f.round + numRounds,
    homeClubId: f.awayClubId,
    awayClubId: f.homeClubId,
  }));

  return [...firstLeg, ...secondLeg];
}

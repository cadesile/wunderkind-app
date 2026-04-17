import { PlayerArchetype } from '@/types/archetype';

/**
 * Local fallback archetypes — always available offline.
 * Trait values are on the 1–20 scale; threshold is the minimum weighted score
 * required to match. The highest-scoring qualifying archetype wins.
 */
export const DEFAULT_ARCHETYPES: PlayerArchetype[] = [
  {
    id: 1,
    name: 'Iron Will',
    description:
      'Relentless competitor who thrives under pressure. Never the most gifted — but always the last to quit. Coaches build their hardest training sessions around players like this.',
    traitMapping: {
      formula: { determination: 1.0, consistency: 0.6, pressure: 0.5 },
      threshold: 12,
    },
  },
  {
    id: 2,
    name: 'The Professional',
    description:
      'A model club student. Punctual, disciplined, and endlessly repeatable. Won\'t dazzle in the highlights reel — but will never let you down on a Tuesday night.',
    traitMapping: {
      formula: { professionalism: 1.0, consistency: 0.7, temperament: 0.4 },
      threshold: 12,
    },
  },
  {
    id: 3,
    name: 'The Maverick',
    description:
      'Driven by personal glory and a restless ambition to prove everyone wrong. Can light up a game or derail a dressing room — often both in the same week.',
    traitMapping: {
      formula: { ambition: 1.0, pressure: 0.7, adaptability: 0.4 },
      threshold: 12,
    },
  },
  {
    id: 4,
    name: 'Club Servant',
    description:
      'All heart, all badge. Won\'t be lured away easily and rarely causes problems. The kind of player whose loyalty becomes part of the club\'s identity.',
    traitMapping: {
      formula: { loyalty: 1.0, professionalism: 0.6, consistency: 0.5 },
      threshold: 12,
    },
  },
  {
    id: 5,
    name: 'The Chameleon',
    description:
      'Absorbs tactical changes without complaint and thrives in new environments. Rare in youth football — priceless to a manager who likes to experiment.',
    traitMapping: {
      formula: { adaptability: 1.0, temperament: 0.7, consistency: 0.4 },
      threshold: 12,
    },
  },
  {
    id: 6,
    name: 'The Iceman',
    description:
      'Unshakeable composure when stakes are highest. Penalties, cup finals, dressing room rows — none of it seems to register. The bigger the moment, the better they perform.',
    traitMapping: {
      formula: { temperament: 1.0, pressure: 0.8, consistency: 0.5 },
      threshold: 12,
    },
  },
  {
    id: 7,
    name: 'The Grafter',
    description:
      'Won\'t blow you away in training but will out-work everyone on the pitch. Built on determination and quiet professionalism — the engine room of any winning team.',
    traitMapping: {
      formula: { determination: 0.8, professionalism: 0.8, loyalty: 0.5 },
      threshold: 12,
    },
  },
  {
    id: 8,
    name: 'The Prospect',
    description:
      'Raw hunger paired with the flexibility to adapt fast. The classic development project — all potential, some risk. Given the right environment, the ceiling is unknown.',
    traitMapping: {
      formula: { ambition: 0.8, adaptability: 0.7, determination: 0.6 },
      threshold: 10,
    },
  },
];

import { ReputationTier } from '@/types/club';

export type ScoutingRegion = {
  label: string;
  nationalities: string[];
};

export const DOMESTIC_NATIONALITIES = ['English'];

export const REGIONAL_POOL: ScoutingRegion[] = [
  { label: 'Scotland',    nationalities: ['Scottish'] },
  { label: 'Ireland',     nationalities: ['Irish'] },
  { label: 'France',      nationalities: ['French'] },
  { label: 'Spain',       nationalities: ['Spanish'] },
  { label: 'Germany',     nationalities: ['German'] },
  { label: 'Netherlands', nationalities: ['Dutch'] },
  { label: 'Portugal',    nationalities: ['Portuguese'] },
  { label: 'Italy',       nationalities: ['Italian'] },
];

export const NATIONAL_POOL: ScoutingRegion[] = [
  ...REGIONAL_POOL,
  { label: 'Sweden',      nationalities: ['Swedish'] },
  { label: 'Denmark',     nationalities: ['Danish'] },
  { label: 'Argentina',   nationalities: ['Argentine'] },
  { label: 'Brazil',      nationalities: ['Brazilian'] },
  { label: 'Senegal',     nationalities: ['Senegalese'] },
  { label: 'Ivory Coast', nationalities: ['Ivorian'] },
];

export const ELITE_POOL: ScoutingRegion[] = [
  ...NATIONAL_POOL,
  { label: 'Nigeria',     nationalities: ['Nigerian'] },
  { label: 'Ghana',       nationalities: ['Ghanaian'] },
  { label: 'Japan',       nationalities: ['Japanese'] },
  { label: 'South Korea', nationalities: ['South Korean'] },
];

export function getAvailableRegions(
  tier: ReputationTier,
  scoutRange: 'local' | 'national' | 'international',
): ScoutingRegion[] | null {
  if (scoutRange === 'local') return null;
  if (scoutRange === 'national') return REGIONAL_POOL;
  // International scout — pool depth scales with club tier
  if (tier === 'Local' || tier === 'Regional') return NATIONAL_POOL;
  if (tier === 'National') return NATIONAL_POOL;
  return ELITE_POOL;
}

export function resolveNationalityForMission(targetNationality: string | null): string {
  return targetNationality ?? DOMESTIC_NATIONALITIES[0];
}

export type FacilityType =
  | 'trainingPitch'
  | 'medicalLab'
  | 'youthHostel'
  | 'analyticsSuite'
  | 'mediaCenter';

/** Maps each facility to its current level (0 = not built, 1–10 = operational) */
export type FacilityLevels = Record<FacilityType, number>;

export interface FacilityMeta {
  type: FacilityType;
  label: string;
  description: string;
  benefit: string;
  baseCost: number; // pence cost per upgrade level (level N costs N * baseCost)
}

/** Static metadata for every facility */
export const FACILITY_DEFS: FacilityMeta[] = [
  {
    type: 'trainingPitch',
    label: 'Training Pitch',
    description: 'The heartbeat of your academy. Better pitches mean faster improvement.',
    benefit: '+5% XP multiplier per level',
    baseCost: 5000,
  },
  {
    type: 'medicalLab',
    label: 'Medical Lab',
    description: 'State-of-the-art facilities to keep players healthy and match-ready.',
    benefit: '-8% injury probability per level',
    baseCost: 8000,
  },
  {
    type: 'youthHostel',
    label: 'Youth Hostel',
    description: 'Comfortable accommodation attracts and houses more youth talent.',
    benefit: '+3 squad capacity per level',
    baseCost: 6000,
  },
  {
    type: 'analyticsSuite',
    label: 'Analytics Suite',
    description: 'Data-driven scouting tools to uncover hidden potential.',
    benefit: 'Unlocks hidden trait and potential visibility',
    baseCost: 10000,
  },
  {
    type: 'mediaCenter',
    label: 'Media Center',
    description: 'Boost your academy brand and attract global attention.',
    benefit: '+12 reputation per level per week',
    baseCost: 7000,
  },
];

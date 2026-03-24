// ─── Academy country system ───────────────────────────────────────────────────

export const ACADEMY_COUNTRIES = [
  { code: 'EN', label: 'England',     flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'IT', label: 'Italy',       flag: '🇮🇹' },
  { code: 'DE', label: 'Germany',     flag: '🇩🇪' },
  { code: 'ES', label: 'Spain',       flag: '🇪🇸' },
  { code: 'BR', label: 'Brazil',      flag: '🇧🇷' },
  { code: 'AR', label: 'Argentina',   flag: '🇦🇷' },
  { code: 'NL', label: 'Netherlands', flag: '🇳🇱' },
] as const;

export type AcademyCountryCode = typeof ACADEMY_COUNTRIES[number]['code'];

export const ACADEMY_COUNTRY_NEIGHBOURS: Record<AcademyCountryCode, AcademyCountryCode[]> = {
  EN: ['NL', 'DE'],
  IT: ['ES'],
  DE: ['NL', 'EN'],
  ES: ['IT', 'NL'],
  BR: ['AR'],
  AR: ['BR'],
  NL: ['DE', 'EN'],
};

/**
 * Returns allowed nationality codes for signing at the given reputation.
 * Returns null when unrestricted (Elite tier, reputation >= 75).
 */
export function getAllowedNationalities(
  academyCountry: AcademyCountryCode,
  reputation: number,
): AcademyCountryCode[] | null {
  if (reputation >= 75) return null;
  if (reputation >= 40) return ACADEMY_COUNTRIES.map((c) => c.code) as AcademyCountryCode[];
  if (reputation >= 15) return [academyCountry, ...ACADEMY_COUNTRY_NEIGHBOURS[academyCountry]];
  return [academyCountry];
}

/**
 * Maps player nationality strings (as stored on Player entities) to academy
 * country codes. Used for market/scouting tier restrictions.
 */
export const NATIONALITY_TO_ACADEMY_CODE: Partial<Record<string, AcademyCountryCode>> = {
  'English':   'EN',
  'Italian':   'IT',
  'German':    'DE',
  'Spanish':   'ES',
  'Brazilian': 'BR',
  'Argentine': 'AR',
  'Dutch':     'NL',
};

/** Reverse of NATIONALITY_TO_ACADEMY_CODE — maps academy code to nationality string. */
export const ACADEMY_CODE_TO_NATIONALITY: Record<AcademyCountryCode, string> = {
  EN: 'English',
  IT: 'Italian',
  DE: 'German',
  ES: 'Spanish',
  BR: 'Brazilian',
  AR: 'Argentine',
  NL: 'Dutch',
};

// ─── General nationality → ISO flag code ──────────────────────────────────────

/** Maps the nationality demonyms used in player generation to ISO 3166-1 alpha-2 codes. */
export const NATIONALITY_TO_CODE: Record<string, string> = {
  English:        'GB',
  Spanish:        'ES',
  French:         'FR',
  German:         'DE',
  Brazilian:      'BR',
  Portuguese:     'PT',
  Nigerian:       'NG',
  Ghanaian:       'GH',
  Japanese:       'JP',
  'South Korean': 'KR',
  Argentine:      'AR',
  Dutch:          'NL',
  Italian:        'IT',
  Swedish:        'SE',
  Danish:         'DK',
  Irish:          'IE',
  Ivorian:        'CI',
  Senegalese:     'SN',
};

/** Returns the 2-letter ISO code for a nationality string, or '' if unknown. */
export function nationalityToCode(nationality: string): string {
  return NATIONALITY_TO_CODE[nationality] ?? '';
}

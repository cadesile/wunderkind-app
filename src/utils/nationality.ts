// ─── Club country system ───────────────────────────────────────────────────

export const CLUB_COUNTRIES = [
  { code: 'EN', label: 'England',     flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'IT', label: 'Italy',       flag: '🇮🇹' },
  { code: 'DE', label: 'Germany',     flag: '🇩🇪' },
  { code: 'ES', label: 'Spain',       flag: '🇪🇸' },
  { code: 'BR', label: 'Brazil',      flag: '🇧🇷' },
  { code: 'AR', label: 'Argentina',   flag: '🇦🇷' },
  { code: 'NL', label: 'Netherlands', flag: '🇳🇱' },
] as const;

export type ClubCountryCode = typeof CLUB_COUNTRIES[number]['code'];

export const CLUB_COUNTRY_NEIGHBOURS: Record<ClubCountryCode, ClubCountryCode[]> = {
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
  clubCountry: ClubCountryCode,
  reputation: number,
): ClubCountryCode[] | null {
  if (reputation >= 75) return null;
  if (reputation >= 40) return CLUB_COUNTRIES.map((c) => c.code) as ClubCountryCode[];
  if (reputation >= 15) return [clubCountry, ...CLUB_COUNTRY_NEIGHBOURS[clubCountry]];
  return [clubCountry];
}

/**
 * Maps player nationality strings (as stored on Player entities) to club
 * country codes. Used for market/scouting tier restrictions.
 */
export const NATIONALITY_TO_CLUB_CODE: Partial<Record<string, ClubCountryCode>> = {
  'English':   'EN',
  'Italian':   'IT',
  'German':    'DE',
  'Spanish':   'ES',
  'Brazilian': 'BR',
  'Argentine': 'AR',
  'Dutch':     'NL',
};

/** Reverse of NATIONALITY_TO_CLUB_CODE — maps club code to nationality string. */
export const CLUB_CODE_TO_NATIONALITY: Record<ClubCountryCode, string> = {
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

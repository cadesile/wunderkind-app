import { Text } from 'react-native';
import { nationalityToCode } from '@/utils/nationality';

/** Converts a 2-letter ISO code to the Unicode regional indicator pair that renders as a flag emoji. */
function isoToFlagEmoji(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

/**
 * Nationalities whose flags can't be derived from a 2-letter ISO code
 * (e.g. England, Scotland, Wales use Unicode tag-sequence emojis).
 */
const NATIONALITY_FLAG_OVERRIDES: Record<string, string> = {
  English:  '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Scottish: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  Welsh:    '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
};

export function FlagText({ nationality, size = 14 }: { nationality: string; size?: number }) {
  const override = NATIONALITY_FLAG_OVERRIDES[nationality];
  if (override) {
    return <Text style={{ fontSize: size, lineHeight: size + 4 }}>{override}</Text>;
  }
  const code = nationalityToCode(nationality);
  if (!code) return null;
  return (
    <Text style={{ fontSize: size, lineHeight: size + 4 }}>
      {isoToFlagEmoji(code)}
    </Text>
  );
}

import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { createAvatar } from '@dicebear/core';
import { adventurerNeutral } from '@dicebear/collection';
import type { Appearance, AppearanceRole } from '@/types/player';
import { WK, pixelShadow } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  appearance?: Appearance | null;
  role?: AppearanceRole;
  size?: number;
  /** 0–100 morale; drives the mouth expression. Defaults to 70 (neutral-good). */
  morale?: number;
  /** Used to detect senior age group (>45) — retained for API compat. */
  age?: number;
}

// ─── Skin tone → DiceBear skinColor ──────────────────────────────────────────
// adventurerNeutral palette (light → dark): f2d3b1 ecad80 d08b5b ae5d29 694d3d

const SKIN_MAP: Record<string, string> = {
  '#fddbb4': 'f2d3b1',
  '#e8a87c': 'ecad80',
  '#c68642': 'd08b5b',
  '#8d5524': 'ae5d29',
  '#4a2912': '694d3d',
};

function mapSkinColor(hex: string): string {
  return SKIN_MAP[hex] ?? 'ecad80';
}

// ─── Skin tone → DiceBear backgroundColor ────────────────────────────────────
// Deterministic per-player; cycles blue → purple → lavender across skin tones.

const BG_COLOR_MAP: Record<string, string> = {
  '#fddbb4': 'ffdfbf', // lightest  → blue
  '#e8a87c': 'f2d3b1', // light-med → purple
  '#c68642': 'ecad80', // medium    → lavender
  '#8d5524': '9e5622', // med-dark  → blue
  '#4a2912': '763900', // dark      → purple
};

function mapBackgroundColor(hex: string): string {
  return BG_COLOR_MAP[hex] ?? 'c0aede';
}

// ─── Hair color → DiceBear hairColor ─────────────────────────────────────────
// adventurerNeutral palette: 6c4545 e8e1ef d6b370 f4a142 b58143 a55728 3b1f28

const HAIR_COLOR_MAP: Record<string, string> = {
  '#f5c842': 'd6b370', // blonde
  '#a0522d': 'a55728', // sienna brown
  '#2c1a0e': '3b1f28', // dark brown
  '#1a1a1a': '3b1f28', // black → darkest available
  '#c0392b': 'f4a142', // red → closest warm
  '#8b6914': 'b58143', // golden brown
  '#b0b0b0': 'e8e1ef', // grey
};

function mapHairColor(hex: string): string {
  return HAIR_COLOR_MAP[hex] ?? 'a55728';
}

// ─── Hair style → adventurerNeutral hair variants ────────────────────────────

function mapHairVariants(style: string): string[] {
  switch (style) {
    case 'buzz':   return ['short01', 'short02', 'short03'];
    case 'crop':   return ['short04', 'short05', 'short06'];
    case 'shaggy': return ['short07', 'short08', 'short09'];
    case 'afro':   return ['long17', 'long18', 'long19'];
    case 'long':   return ['long01', 'long02', 'long03', 'long04', 'long05'];
    case 'bald':   return []; // handled via hairProbability: 0
    default:       return ['short01', 'short02', 'short03'];
  }
}

// ─── Morale → adventurerNeutral mouth variants ───────────────────────────────
// variant01–06 smile range; variant13–19 neutral/frown range

function mapMouthForMorale(morale: number): string[] {
  if (morale >= 80) return ['variant25'];
  if (morale >= 60) return ['variant22'];
  if (morale >= 40) return ['variant20'];
  if (morale >= 20) return ['variant09'];
  return ['variant04'];
}

// ─── Morale → adventurerNeutral eyebrow variants ─────────────────────────────

function mapEyebrowsForMorale(morale: number): string[] {
  if (morale >= 80) return ['variant13'];
  if (morale >= 60) return ['variant12'];
  if (morale >= 40) return ['variant10'];
  if (morale >= 20) return ['variant03'];
  return ['variant02'];
}

// ─── Accessory → adventurerNeutral glasses ───────────────────────────────────

function mapGlasses(accessory?: string | null): { glasses: string[]; glassesProbability: number } {
  if (accessory === 'glasses' || accessory === 'sunglasses') {
    return { glasses: ['variant04'], glassesProbability: 100 };
  }
  return { glasses: [], glassesProbability: 0 };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const PADDING_RATIO = 0.12;

export const Avatar = memo(function Avatar({
  appearance,
  role: _role = 'PLAYER',
  size = 48,
  morale = 70,
}: Props) {
  const padding   = Math.round(size * PADDING_RATIO);
  const innerSize = size - padding * 2;

  const skinTone  = appearance?.skinTone  ?? '#e8a87c';
  const hairStyle = appearance?.hairStyle ?? 'buzz';
  const hairColor = appearance?.hairColor ?? '#2c1a0e';
  const accessory = appearance?.accessory ?? null;

  const svgXml = useMemo(() => {
    const hairVariants    = mapHairVariants(hairStyle);
    const isBald          = hairStyle === 'bald';
    const glassesOpts     = mapGlasses(accessory);
    const mouthVariants   = mapMouthForMorale(morale);
    const eyebrowVariants = mapEyebrowsForMorale(morale);

    // Seed from deterministic appearance fields so the same player always
    // gets the same face regardless of render order.
    // Seed uses only stable fields — morale only drives mouth/eyebrows which are passed explicitly.
    const seed = `${skinTone}|${hairStyle}|${hairColor}|${accessory ?? ''}`;

    const avatar = createAvatar(adventurerNeutral, {
      seed,
      backgroundColor:    [mapBackgroundColor(skinTone)],
      skinColor:          [mapSkinColor(skinTone)],
      hairColor:          [mapHairColor(hairColor)],
      hair:               isBald ? [] : hairVariants,
      hairProbability:    isBald ? 0 : 100,
      mouth:              mouthVariants,
      eyebrows:           eyebrowVariants,
      glasses:            glassesOpts.glasses,
      glassesProbability: glassesOpts.glassesProbability,
      size:               innerSize,
    });

    return avatar.toString();
  }, [skinTone, hairStyle, hairColor, accessory, morale, innerSize]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <SvgXml xml={svgXml} width={innerSize} height={innerSize} />
    </View>
  );
});

// ─── Fallback ─────────────────────────────────────────────────────────────────

export function AvatarFallback({ size = 48 }: { size?: number }) {
  const padding   = Math.round(size * PADDING_RATIO);
  const innerSize = size - padding * 2;

  const svgXml = useMemo(() =>
    createAvatar(adventurerNeutral, {
      seed:     'fallback',
      skinColor: ['ecad80'],
      size:      innerSize,
    }).toString(),
  [innerSize]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <SvgXml xml={svgXml} width={innerSize} height={innerSize} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderWidth:     3,
    borderColor:     WK.border,
    borderRadius:    0,
    overflow:        'hidden',
    alignItems:      'center',
    justifyContent:  'center',
    ...pixelShadow,
  },
});

import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Appearance, AppearanceRole, FacialHair } from '@/types/player';
import { WK, pixelShadow } from '@/constants/theme';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  appearance?: Appearance | null;
  role?: AppearanceRole;
  size?: number;
  /** 0–100 morale; drives the face expression. Defaults to 70 (neutral). */
  morale?: number;
  /** Used to detect senior age group (>45). Optional. */
  age?: number;
}

// ─── Morale → expression ─────────────────────────────────────────────────────

type MoraleState = 'ecstatic' | 'good' | 'neutral' | 'unhappy' | 'miserable';

function moraleToState(morale: number): MoraleState {
  if (morale >= 80) return 'ecstatic';
  if (morale >= 60) return 'good';
  if (morale >= 40) return 'neutral';
  if (morale >= 20) return 'unhappy';
  return 'miserable';
}

// ─── Skin palette ─────────────────────────────────────────────────────────────

const SKIN_SHADES: Record<string, { shadow: string; hi: string }> = {
  '#fddbb4': { shadow: '#d4956a', hi: '#fff0d8' },
  '#e8a87c': { shadow: '#b87040', hi: '#f5c89c' },
  '#c68642': { shadow: '#8a5420', hi: '#dda060' },
  '#8d5524': { shadow: '#5a3010', hi: '#b07840' },
  '#4a2912': { shadow: '#2a1408', hi: '#7a4020' },
};

function getSkinShades(skinTone: string) {
  return SKIN_SHADES[skinTone] ?? { shadow: '#5a3010', hi: '#dda060' };
}

// ─── Hair highlight ───────────────────────────────────────────────────────────

const HAIR_HI: Record<string, string> = {
  '#f5c842': '#f8d860',
  '#a0522d': '#c07050',
  '#2c1a0e': '#5a3520',
  '#1a1a1a': '#404040',
  '#c0392b': '#d84838',
  '#8b6914': '#b89030',
  '#b0b0b0': '#d8d8d8',
};

function hairHighlight(c: string): string {
  return HAIR_HI[c] ?? c;
}

// ─── Rect shorthand ───────────────────────────────────────────────────────────

function r(x: number, y: number, w: number, h: number, fill: string, opacity?: number) {
  return <Rect x={x} y={y} width={w} height={h} fill={fill} opacity={opacity ?? 1} />;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const PADDING_RATIO = 0.12; // 12% of size on each side

export function Avatar({ appearance, role = 'PLAYER', size = 48, morale = 70, age }: Props) {
  const padding   = Math.round(size * PADDING_RATIO);
  const innerSize = size - padding * 2;

  const state    = moraleToState(morale);
  const isYouth  = role === 'PLAYER';
  const isSenior = !isYouth && (age ?? 35) > 45;

  // Face geometry
  const fX    = isYouth ? 1 : 2;
  const fW    = isYouth ? 14 : 12;
  const fY    = 3;
  const fH    = isYouth ? 12 : 11;
  const faceR = fX + fW;  // right edge x

  // Eye colour
  const eyeCol = '#2c1a0e';

  // Brow geometry
  const browBase = fY + 2;            // y=5
  const browW    = isYouth ? 4 : 3;
  const lBrowX   = isYouth ? 3 : 4;
  const rBrowX   = 9;

  // Eye geometry
  const eyeY  = fY + 4;              // y=7
  const eyeW  = 3;
  const eyeH  = isYouth ? 3 : 2;
  const lEyeX = isYouth ? 3 : 4;
  const rEyeX = 9;

  // Mouth geometry
  const mX     = 6;
  const mW     = 4;
  const mouthY = isYouth ? fY + 9 : fY + 8;  // 12 or 11

  // Neck geometry
  const neckX = isYouth ? 5 : 6;
  const neckW = isYouth ? 6 : 4;

  // Derived colours
  const skinTone  = appearance?.skinTone ?? '#e8a87c';
  const { shadow, hi } = getSkinShades(skinTone);
  const mCol      = shadow;

  const hairStyle  = appearance?.hairStyle ?? 'buzz';
  const hairColor  = appearance?.hairColor ?? '#2c1a0e';
  const hHi        = hairHighlight(hairColor);
  const accessory  = appearance?.accessory ?? null;
  const facialHair: FacialHair = appearance?.facialHair ?? 'none';

  const wearingBeanie = accessory === 'beanie';
  const hairY = wearingBeanie ? 2 : 0;

  const containerStyle = {
    width: size,
    height: size,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: WK.border,
    borderRadius: 0,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...pixelShadow,
  };

  // ── Fallback silhouette ────────────────────────────────────────────────────
  if (!appearance) {
    return (
      <View style={containerStyle}>
        <Svg width={innerSize} height={innerSize} viewBox="0 0 16 20">
          {r(2, 3, 12, 11, '#e8a87c')}
          {r(4, 7, 3, 2, eyeCol)}
          {r(9, 7, 3, 2, eyeCol)}
          {r(6, 11, 4, 1, '#b06840')}
          {r(6, 14, 4, 2, '#e8a87c')}
        </Svg>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Svg width={innerSize} height={innerSize} viewBox="0 0 16 20">

        {/* ── 1. Beanie (behind hair) ── */}
        {wearingBeanie && <>
          {r(fX, 0, fW, 4, '#c03030')}
          {r(fX, 3, fW, 2, '#a02020')}
          {r(fX + 1, 3, fW - 2, 1, '#a02020', 0.5)}
          {r(6, 0, 4, 1, '#e04040')}
          {r(7, 0, 2, 1, '#ff6060', 0.6)}
        </>}

        {/* ── 2. Hair ── */}
        {hairStyle === 'buzz' && <>
          {r(fX, hairY + 2, fW, 2, hairColor)}
          {r(fX - 1, hairY + 2, 1, 1, hairColor)}
          {r(faceR, hairY + 2, 1, 1, hairColor)}
        </>}
        {hairStyle === 'shaggy' && <>
          {r(fX, hairY, fW, 4, hairColor)}
          {r(fX - 1, hairY + 1, 1, 3, hairColor)}
          {r(faceR, hairY + 1, 1, 3, hairColor)}
          {r(fX + 1, hairY, fW - 2, 1, hHi, 0.3)}
        </>}
        {hairStyle === 'afro' && <>
          {r(fX - 2, hairY, fW + 4, 4, hairColor)}
          {r(fX - 2, hairY + 1, 2, 5, hairColor)}
          {r(faceR, hairY + 1, 2, 5, hairColor)}
          {r(fX, hairY, fW, 1, hHi, 0.2)}
        </>}
        {hairStyle === 'crop' && <>
          {r(fX, hairY, fW, 3, hairColor)}
          {r(fX - 1, hairY + 1, 2, 3, hairColor)}
          {r(faceR - 1, hairY + 1, 2, 3, hairColor)}
        </>}
        {hairStyle === 'bald' && r(7, 1, 2, 1, 'rgba(255,255,255,0.1)')}

        {/* ── 3. Face block ── */}
        {r(fX, fY, fW, fH, skinTone)}
        {/* Ear nubs */}
        {r(fX - 1, fY + 4, 1, 2, shadow, 0.85)}
        {r(faceR, fY + 4, 1, 2, shadow, 0.85)}
        {r(fX - 1, fY + 4, 1, 1, hi, 0.35)}
        {r(faceR, fY + 4, 1, 1, hi, 0.35)}
        {/* Forehead highlight */}
        {r(fX + 1, fY, fW - 2, 2, hi, 0.2)}
        {/* Jaw shadow */}
        {r(fX + 1, fY + fH - 2, fW - 2, 2, shadow, 0.25)}
        {/* Senior wrinkles */}
        {isSenior && <>
          {r(fX + 1, fY + 1, 1, 1, shadow, 0.3)}
          {r(faceR - 2, fY + 1, 1, 1, shadow, 0.3)}
          {r(fX + 1, fY + fH - 3, 2, 1, shadow, 0.25)}
          {r(faceR - 3, fY + fH - 3, 2, 1, shadow, 0.25)}
        </>}

        {/* ── 4. Brows ── */}
        {state === 'ecstatic' && <>
          {r(lBrowX, browBase - 1, browW, 1, eyeCol)}
          {r(rBrowX, browBase - 1, browW, 1, eyeCol)}
        </>}
        {(state === 'good' || state === 'neutral') && <>
          {r(lBrowX, browBase, browW, 1, eyeCol)}
          {r(rBrowX, browBase, browW, 1, eyeCol)}
        </>}
        {state === 'unhappy' && <>
          {r(lBrowX, browBase, browW - 1, 1, eyeCol)}
          {r(lBrowX + browW - 1, browBase + 1, 1, 1, eyeCol)}
          {r(rBrowX, browBase + 1, 1, 1, eyeCol)}
          {r(rBrowX + 1, browBase, browW - 1, 1, eyeCol)}
        </>}
        {state === 'miserable' && <>
          {r(lBrowX, browBase, browW - 1, 1, eyeCol)}
          {r(lBrowX + browW - 1, browBase + 1, 1, 1, eyeCol)}
          {r(rBrowX, browBase + 1, 1, 1, eyeCol)}
          {r(rBrowX + 1, browBase, browW - 1, 1, eyeCol)}
          {r(lBrowX + browW, browBase + 2, 1, 1, eyeCol, 0.5)}
          {r(rBrowX - 1, browBase + 2, 1, 1, eyeCol, 0.5)}
        </>}

        {/* ── 5. Eyes ── */}
        {state === 'ecstatic' ? <>
          {r(lEyeX, eyeY, eyeW, 1, eyeCol)}
          {r(rEyeX, eyeY, eyeW, 1, eyeCol)}
          {r(lEyeX, eyeY, 1, 1, 'rgba(255,255,255,0.5)')}
          {r(rEyeX, eyeY, 1, 1, 'rgba(255,255,255,0.5)')}
        </> : <>
          {r(lEyeX, eyeY, eyeW, eyeH, eyeCol)}
          {r(rEyeX, eyeY, eyeW, eyeH, eyeCol)}
          {r(lEyeX, eyeY, 1, 1, 'rgba(255,255,255,0.6)')}
          {r(rEyeX, eyeY, 1, 1, 'rgba(255,255,255,0.6)')}
          {state === 'miserable' && <>
            {r(lEyeX, eyeY + eyeH, eyeW, 1, shadow, 0.4)}
            {r(rEyeX, eyeY + eyeH, eyeW, 1, shadow, 0.4)}
          </>}
        </>}

        {/* ── 6. Glasses / Sunglasses ── */}
        {(accessory === 'glasses' || accessory === 'sunglasses') && (() => {
          const isSunny   = accessory === 'sunglasses';
          const lensFill  = isSunny ? 'rgba(20,20,40,0.65)' : 'rgba(200,230,255,0.08)';
          const frameFill = '#6b4c1e';
          return <>
            {r(lEyeX - 1, eyeY - 1, eyeW + 2, eyeH + 2, lensFill)}
            {r(rEyeX - 1, eyeY - 1, eyeW + 2, eyeH + 2, lensFill)}
            {r(lEyeX - 1, eyeY - 1, eyeW + 2, 1, frameFill)}
            {r(lEyeX - 1, eyeY + eyeH, eyeW + 2, 1, frameFill)}
            {r(lEyeX - 1, eyeY - 1, 1, eyeH + 2, frameFill)}
            {r(lEyeX + eyeW, eyeY - 1, 1, eyeH + 2, frameFill)}
            {r(rEyeX - 1, eyeY - 1, eyeW + 2, 1, frameFill)}
            {r(rEyeX - 1, eyeY + eyeH, eyeW + 2, 1, frameFill)}
            {r(rEyeX - 1, eyeY - 1, 1, eyeH + 2, frameFill)}
            {r(rEyeX + eyeW, eyeY - 1, 1, eyeH + 2, frameFill)}
            {/* Bridge */}
            {r(lEyeX + eyeW, eyeY, rEyeX - 1 - (lEyeX + eyeW), 1, frameFill)}
            {/* Temple arms */}
            {r(0, eyeY, lEyeX - 1, 1, frameFill)}
            {r(rEyeX + eyeW + 1, eyeY, 16 - (rEyeX + eyeW + 1), 1, frameFill)}
          </>;
        })()}

        {/* ── 7. Nose ── */}
        {isYouth
          ? r(7, fY + 7, 2, 1, shadow, 0.3)
          : <>
              {r(7, fY + 6, 2, 1, shadow, 0.4)}
              {r(6, fY + 7, 1, 1, shadow, 0.3)}
              {r(9, fY + 7, 1, 1, shadow, 0.3)}
            </>
        }

        {/* ── 8. Cheeks (ecstatic) ── */}
        {state === 'ecstatic' && <>
          {r(fX + 1, fY + 6, 2, 1, '#e06060', 0.35)}
          {r(faceR - 3, fY + 6, 2, 1, '#e06060', 0.35)}
        </>}

        {/* ── 9. Mouth ── */}
        {state === 'ecstatic' && <>
          {r(mX - 1, mouthY, 1, 1, mCol)}
          {r(mX + mW, mouthY, 1, 1, mCol)}
          {r(mX, mouthY - 1, mW, 1, mCol)}
          {r(mX, mouthY, mW, 1, '#f5f5e8')}
        </>}
        {state === 'good' && <>
          {r(mX, mouthY, mW, 1, mCol)}
          {r(mX - 1, mouthY - 1, 1, 1, mCol)}
          {r(mX + mW, mouthY - 1, 1, 1, mCol)}
        </>}
        {state === 'neutral' && r(mX, mouthY, mW, 1, mCol)}
        {state === 'unhappy' && <>
          {r(mX, mouthY, mW, 1, mCol)}
          {r(mX - 1, mouthY + 1, 1, 1, mCol)}
          {r(mX + mW, mouthY + 1, 1, 1, mCol)}
        </>}
        {state === 'miserable' && <>
          {r(mX, mouthY - 1, mW, 1, mCol)}
          {r(mX - 1, mouthY + 1, 1, 1, mCol)}
          {r(mX + mW, mouthY + 1, 1, 1, mCol)}
          {r(mX - 2, mouthY + 2, 1, 1, mCol)}
          {r(mX + mW + 1, mouthY + 2, 1, 1, mCol)}
        </>}

        {/* ── 10. Facial hair (staff only) ── */}
        {!isYouth && facialHair !== 'none' && (() => {
          switch (facialHair) {
            case 'stubble':
              return <>
                {r(fX + 2, fY + fH - 3, 1, 1, hairColor, 0.4)}
                {r(fX + 4, fY + fH - 2, 1, 1, hairColor, 0.4)}
                {r(fX + 6, fY + fH - 2, 1, 1, hairColor, 0.4)}
                {r(fX + 8, fY + fH - 2, 1, 1, hairColor, 0.4)}
                {r(fX + 10, fY + fH - 3, 1, 1, hairColor, 0.4)}
                {r(fX + 3, fY + fH - 2, 1, 1, hairColor, 0.3)}
              </>;
            case 'moustache':
              return <>
                {r(mX, mouthY - 1, mW, 1, hairColor)}
                {r(mX + 1, mouthY - 1, mW - 2, 1, hHi, 0.35)}
                {r(mX, mouthY - 2, mW, 1, hairColor, 0.5)}
              </>;
            case 'goatee':
              return <>
                {r(mX, mouthY + 1, mW, 2, hairColor, 0.85)}
                {r(mX + 1, mouthY - 1, 2, 1, hairColor, 0.65)}
              </>;
            case 'beard':
              return <>
                {r(fX, fY + fH - 4, 2, 4, hairColor, 0.8)}
                {r(faceR - 2, fY + fH - 4, 2, 4, hairColor, 0.8)}
                {r(fX + 2, fY + fH - 2, fW - 4, 2, hairColor, 0.8)}
                {r(fX + 2, fY + fH - 2, fW - 4, 1, hHi, 0.2)}
                {r(mX, mouthY - 1, mW, 1, hairColor, 0.9)}
              </>;
            default:
              return null;
          }
        })()}

        {/* ── 11. Neck ── */}
        {r(neckX, fY + fH, neckW, 2, skinTone)}
        {r(neckX, fY + fH, neckW, 1, shadow, 0.25)}

        {/* ── Headset (topmost — over hair) ── */}
        {accessory === 'headset' && <>
          {r(fX - 1, 0, fW + 2, 1, '#222')}
          {r(fX - 2, 0, 2, 4, '#333')}
          {r(faceR, 0, 2, 4, '#333')}
          {r(faceR + 1, 3, 2, 1, '#333')}
          {r(faceR + 2, 3, 1, 1, '#666')}
        </>}

        {/* ── Whistle (at neck level) ── */}
        {accessory === 'whistle' && <>
          {r(7, fY + fH + 1, 1, 1, '#c8c8c8')}
          {r(5, fY + fH + 2, 5, 1, '#d4a020')}
          {r(9, fY + fH + 2, 1, 1, '#a07010')}
        </>}

      </Svg>
    </View>
  );
}

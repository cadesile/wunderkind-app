import { View } from 'react-native';
import Svg, { Rect, G } from 'react-native-svg';
import { Appearance, AppearanceRole, HairStyle, AppearanceAccessory } from '@/types/player';
import { WK, pixelShadow } from '@/constants/theme';

// ─── Role-based body colors ───────────────────────────────────────────────────

const BODY_COLOR: Record<AppearanceRole, string> = {
  PLAYER: WK.tealMid,   // kit
  COACH:  '#1a3a6a',    // navy tracksuit
  SCOUT:  '#3d4a3d',    // dark green jacket
  AGENT:  '#2a2a2a',    // suit
};

const LEG_COLOR: Record<AppearanceRole, string> = {
  PLAYER: '#1a4a6a',
  COACH:  '#122a4a',
  SCOUT:  '#2d3828',
  AGENT:  '#1a1a1a',
};

// ─── Layer: Hair ─────────────────────────────────────────────────────────────
// Drawn first so the head rect covers the interior; side/top wisps show naturally.
//
// All pixel art on a 16×16 viewBox. Head occupies x=5–10, y=1–6.

function HairLayer({ style, color }: { style: HairStyle; color: string }) {
  switch (style) {
    case 'buzz':
      // Tight strip along head top — no side volume
      return (
        <G>
          <Rect x="5" y="0" width="6" height="2" fill={color} />
        </G>
      );

    case 'crop':
      // Wider flat-top with a small left fringe drop
      return (
        <G>
          <Rect x="4" y="0" width="8" height="2" fill={color} />
          <Rect x="5" y="2" width="3" height="1" fill={color} />
        </G>
      );

    case 'shaggy':
      // Messy — top band plus side wisps hanging past the head edges
      return (
        <G>
          <Rect x="4" y="0" width="8" height="3" fill={color} />
          <Rect x="3" y="1" width="2" height="4" fill={color} />
          <Rect x="11" y="1" width="2" height="4" fill={color} />
          <Rect x="5" y="3" width="2" height="1" fill={color} />
          <Rect x="9" y="3" width="2" height="1" fill={color} />
        </G>
      );

    case 'afro':
      // Wide dome — extends well past head sides
      return (
        <G>
          <Rect x="3" y="0" width="10" height="3" fill={color} />
          <Rect x="2" y="1" width="2" height="5" fill={color} />
          <Rect x="12" y="1" width="2" height="5" fill={color} />
        </G>
      );

    case 'bald':
      // Subtle scalp highlight only
      return (
        <G>
          <Rect x="7" y="1" width="2" height="1" fill="rgba(255,255,255,0.1)" />
        </G>
      );

    default:
      return null;
  }
}

// ─── Layer: Face ─────────────────────────────────────────────────────────────
// Drawn on top of the head rect.
// Expression 0 = neutral, 1 = determined, 2 = stern

function FaceLayer({ expression }: { expression: 0 | 1 | 2 }) {
  const eye = '#2c1a0e';
  const mouth = '#b06840';

  if (expression === 1) {
    // Determined: faint raised brows + wide smile with cheek hints
    return (
      <G>
        <Rect x="6" y="2" width="1" height="1" fill={eye} opacity={0.45} />
        <Rect x="9" y="2" width="1" height="1" fill={eye} opacity={0.45} />
        <Rect x="6" y="3" width="1" height="1" fill={eye} />
        <Rect x="9" y="3" width="1" height="1" fill={eye} />
        <Rect x="5" y="5" width="6" height="1" fill={mouth} />
        <Rect x="5" y="4" width="1" height="1" fill={mouth} opacity={0.35} />
        <Rect x="10" y="4" width="1" height="1" fill={mouth} opacity={0.35} />
      </G>
    );
  }

  if (expression === 2) {
    // Stern: heavy inward brows + tight mouth
    return (
      <G>
        <Rect x="6" y="2" width="2" height="1" fill={eye} />
        <Rect x="8" y="2" width="2" height="1" fill={eye} />
        <Rect x="6" y="3" width="1" height="1" fill={eye} />
        <Rect x="9" y="3" width="1" height="1" fill={eye} />
        <Rect x="7" y="5" width="2" height="1" fill={mouth} />
      </G>
    );
  }

  // Neutral (default: expression 0)
  return (
    <G>
      <Rect x="6" y="3" width="1" height="1" fill={eye} />
      <Rect x="9" y="3" width="1" height="1" fill={eye} />
      <Rect x="6" y="5" width="4" height="1" fill={mouth} />
    </G>
  );
}

// ─── Layer: Accessory ────────────────────────────────────────────────────────

function AccessoryLayer({ accessory }: { accessory: AppearanceAccessory }) {
  if (!accessory) return null;

  if (accessory === 'glasses') {
    // Wire-frame pixel glasses — two lens outlines with bridge
    return (
      <G>
        {/* Glass tint */}
        <Rect x="5" y="2" width="2" height="2" fill="rgba(200,230,255,0.12)" />
        <Rect x="9" y="2" width="2" height="2" fill="rgba(200,230,255,0.12)" />
        {/* Left lens frame */}
        <Rect x="5" y="2" width="2" height="0.5" fill="#6b4c1e" />
        <Rect x="5" y="4" width="2" height="0.5" fill="#6b4c1e" />
        <Rect x="5" y="2" width="0.5" height="2" fill="#6b4c1e" />
        <Rect x="7" y="2" width="0.5" height="2" fill="#6b4c1e" />
        {/* Right lens frame */}
        <Rect x="9" y="2" width="2" height="0.5" fill="#6b4c1e" />
        <Rect x="9" y="4" width="2" height="0.5" fill="#6b4c1e" />
        <Rect x="9" y="2" width="0.5" height="2" fill="#6b4c1e" />
        <Rect x="11" y="2" width="0.5" height="2" fill="#6b4c1e" />
        {/* Bridge */}
        <Rect x="7" y="2.8" width="2" height="0.5" fill="#6b4c1e" />
        {/* Temple arms */}
        <Rect x="4" y="2.8" width="1" height="0.5" fill="#6b4c1e" />
        <Rect x="11.5" y="2.8" width="1" height="0.5" fill="#6b4c1e" />
      </G>
    );
  }

  if (accessory === 'whistle') {
    // Golden whistle hanging on a lanyard over the coach's chest
    return (
      <G>
        {/* Lanyard cord */}
        <Rect x="7.5" y="7" width="1" height="3" fill="#c8c8c8" />
        {/* Whistle body */}
        <Rect x="6" y="10" width="4" height="1.5" fill="#d4a020" />
        {/* Mouthpiece tip */}
        <Rect x="9.5" y="10.25" width="1" height="1" fill="#a07010" />
      </G>
    );
  }

  if (accessory === 'headset') {
    // Over-ear headset with mic boom (scout style)
    return (
      <G>
        {/* Headband across crown */}
        <Rect x="4" y="0" width="8" height="0.8" fill="#222" />
        {/* Left ear cup */}
        <Rect x="3" y="0.5" width="1.5" height="3.5" fill="#333" />
        {/* Right ear cup */}
        <Rect x="11.5" y="0.5" width="1.5" height="3.5" fill="#333" />
        {/* Mic boom arm */}
        <Rect x="12" y="3" width="2" height="0.7" fill="#333" />
        {/* Mic capsule */}
        <Rect x="13.5" y="3.5" width="0.8" height="0.8" fill="#666" />
      </G>
    );
  }

  return null;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

interface Props {
  appearance?: Appearance | null;
  role?: AppearanceRole;
  size?: number;
}

export function Avatar({ appearance, role = 'PLAYER', size = 48 }: Props) {
  const bodyColor = BODY_COLOR[role];
  const legColor = LEG_COLOR[role];

  const containerStyle = {
    width: size,
    height: size,
    backgroundColor: WK.tealMid,
    borderWidth: 3,
    borderColor: WK.border,
    overflow: 'hidden' as const,
    ...pixelShadow,
  };

  // ── Fallback for legacy data without appearance ────────────────────────────
  if (!appearance) {
    return (
      <View style={containerStyle}>
        <Svg width={size} height={size} viewBox="0 0 16 16">
          <Rect x="5" y="1" width="6" height="6" fill="#c8a068" />
          <Rect x="4" y="7" width="8" height="6" fill={bodyColor} />
          <Rect x="3" y="8" width="2" height="5" fill={bodyColor} />
          <Rect x="11" y="8" width="2" height="5" fill={bodyColor} />
          <Rect x="4" y="13" width="3" height="3" fill={legColor} />
          <Rect x="9" y="13" width="3" height="3" fill={legColor} />
          <Rect x="6" y="3" width="1" height="1" fill="#3a2800" />
          <Rect x="9" y="3" width="1" height="1" fill="#3a2800" />
          <Rect x="6" y="5" width="4" height="1" fill="#c07850" />
        </Svg>
      </View>
    );
  }

  const { skinTone, hairStyle, hairColor, expression, accessory, kitTrim } = appearance;

  return (
    <View style={containerStyle}>
      <Svg width={size} height={size} viewBox="0 0 16 16">

        {/* ── Layer 1: Hair (behind head — sides/top show around head rect) ── */}
        <HairLayer style={hairStyle} color={hairColor} />

        {/* ── Layer 2: Head ─────────────────────────────────────────────── */}
        <Rect x="5" y="1" width="6" height="6" fill={skinTone} />

        {/* ── Layer 3: Face features ─────────────────────────────────────── */}
        <FaceLayer expression={expression} />

        {/* ── Layer 4: Body ─────────────────────────────────────────────── */}
        <Rect x="4" y="7" width="8" height="6" fill={bodyColor} />

        {/* Kit trim stripe (players only) */}
        {role === 'PLAYER' && (
          <Rect x="4" y="9" width="8" height="1" fill={kitTrim} opacity={0.75} />
        )}

        {/* Coach collar detail */}
        {role === 'COACH' && (
          <G>
            <Rect x="6" y="7" width="1" height="2" fill="rgba(255,255,255,0.35)" />
            <Rect x="9" y="7" width="1" height="2" fill="rgba(255,255,255,0.35)" />
          </G>
        )}

        {/* ── Arms ──────────────────────────────────────────────────────── */}
        <Rect x="3" y="8" width="2" height="5" fill={bodyColor} />
        <Rect x="11" y="8" width="2" height="5" fill={bodyColor} />

        {/* Sleeve cuff stripes (players) */}
        {role === 'PLAYER' && (
          <G>
            <Rect x="3" y="11" width="2" height="1" fill={kitTrim} opacity={0.75} />
            <Rect x="11" y="11" width="2" height="1" fill={kitTrim} opacity={0.75} />
          </G>
        )}

        {/* ── Legs ──────────────────────────────────────────────────────── */}
        <Rect x="4" y="13" width="3" height="3" fill={legColor} />
        <Rect x="9" y="13" width="3" height="3" fill={legColor} />

        {/* Boot tips (players) */}
        {role === 'PLAYER' && (
          <G>
            <Rect x="4" y="15" width="3" height="1" fill={kitTrim} opacity={0.85} />
            <Rect x="9" y="15" width="3" height="1" fill={kitTrim} opacity={0.85} />
          </G>
        )}

        {/* ── Layer 5: Accessory (topmost — over everything) ────────────── */}
        <AccessoryLayer accessory={accessory} />

      </Svg>
    </View>
  );
}

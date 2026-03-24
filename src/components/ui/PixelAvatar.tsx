import Svg, { Rect } from 'react-native-svg';
import { View } from 'react-native';
import { WK, pixelShadow } from '@/constants/theme';

interface Props {
  size?: number;
}

const PADDING_RATIO = 0.12; // 12% of size on each side

/** Pixel-art player avatar — matches the style guide's CSS pixel art person */
export function PixelAvatar({ size = 48 }: Props) {
  const padding = Math.round(size * PADDING_RATIO);
  const innerSize = size - padding * 2;

  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: '#ffffff',
        borderWidth: 3,
        borderColor: WK.border,
        borderRadius: 0,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        ...pixelShadow,
      }}
    >
      <Svg width={innerSize} height={innerSize} viewBox="0 0 16 16">
        {/* Head */}
        <Rect x="5" y="1" width="6" height="6" fill="#c8a068" />
        {/* Body */}
        <Rect x="4" y="7" width="8" height="7" fill="#2e8b4a" />
        {/* Left arm */}
        <Rect x="3" y="8" width="2" height="5" fill="#2e8b4a" />
        {/* Right arm */}
        <Rect x="11" y="8" width="2" height="5" fill="#2e8b4a" />
        {/* Left leg */}
        <Rect x="4" y="13" width="3" height="3" fill="#1a4a6a" />
        {/* Right leg */}
        <Rect x="9" y="13" width="3" height="3" fill="#1a4a6a" />
        {/* Eyes */}
        <Rect x="6" y="3" width="1" height="1" fill="#3a2800" />
        <Rect x="9" y="3" width="1" height="1" fill="#3a2800" />
        {/* Mouth */}
        <Rect x="6" y="5" width="4" height="1" fill="#c07850" />
      </Svg>
    </View>
  );
}

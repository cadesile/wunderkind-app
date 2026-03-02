import { View, useWindowDimensions } from 'react-native';

const LINE_COLOR = 'rgba(255, 255, 255, 0.07)';
const LINE_SPACING = 40;
const LINE_THICKNESS = 1;

/**
 * Renders a subtle football-pitch grid pattern as an absolutely-positioned
 * overlay behind screen content. Wrap screen root views with this component.
 */
export function PitchBackground() {
  const { width, height } = useWindowDimensions();

  const hLines: number[] = [];
  for (let y = LINE_SPACING; y < height; y += LINE_SPACING) {
    hLines.push(y);
  }

  const vLines: number[] = [];
  for (let x = LINE_SPACING; x < width; x += LINE_SPACING) {
    vLines.push(x);
  }

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
      }}
    >
      {hLines.map((y) => (
        <View
          key={`h${y}`}
          style={{
            position: 'absolute',
            top: y,
            left: 0,
            right: 0,
            height: LINE_THICKNESS,
            backgroundColor: LINE_COLOR,
          }}
        />
      ))}
      {vLines.map((x) => (
        <View
          key={`v${x}`}
          style={{
            position: 'absolute',
            left: x,
            top: 0,
            bottom: 0,
            width: LINE_THICKNESS,
            backgroundColor: LINE_COLOR,
          }}
        />
      ))}
    </View>
  );
}

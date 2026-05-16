// Binary decision point candidates to migrate to SwipeConfirm in a future pass:
//   - inbox.tsx InboxMessageDetail: ACCEPT / REJECT for investor offers
//   - inbox.tsx InboxMessageDetail: ACCEPT / REJECT for sponsor offers
//   - inbox.tsx GemPlayerCard: RECRUIT (single action — consider pairing with PASS)
//   - index.tsx CoachProspectCard: SIGN / (close modal) — pair SIGN vs PASS
//   - index.tsx ScoutProspectCard: RECRUIT / (close modal) — pair RECRUIT vs PASS
//   - market.tsx MarketPlayerCard: RECRUIT / PASS (currently RECRUIT button only)
//   - market.tsx MarketCoachCard: HIRE / PASS
//   - market.tsx MarketScoutCard: HIRE / PASS
//   - coaches.tsx ProspectCard: SIGN / PASS

import React, { useRef } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { PixelText } from './PixelText';
import { WK, pixelShadow } from '@/constants/theme';
import { hapticConfirm, hapticSuccess, hapticWarning } from '@/utils/haptics';

interface SwipeConfirmProps {
  onAccept: () => void;
  onDecline: () => void;
  acceptLabel?: string;
  declineLabel?: string;
  disabled?: boolean;
}

const THUMB_SIZE = 56;
const THRESHOLD_RATIO = 0.6;

export function SwipeConfirm({
  onAccept,
  onDecline,
  acceptLabel = 'ACCEPT',
  declineLabel = 'DECLINE',
  disabled = false,
}: SwipeConfirmProps) {
  const trackWidth = useRef(0);
  const thumbX = useSharedValue(0);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  const greenFillStyle = useAnimatedStyle(() => ({
    width: thumbX.value < 0 ? -thumbX.value : 0,
  }));

  const redFillStyle = useAnimatedStyle(() => ({
    width: thumbX.value > 0 ? thumbX.value : 0,
  }));

  const pan = Gesture.Pan()
    .runOnJS(true)
    .enabled(!disabled)
    .onChange((e) => {
      const maxDrag = Math.max(0, trackWidth.current / 2 - THUMB_SIZE / 2);
      thumbX.value = Math.max(-maxDrag, Math.min(maxDrag, e.translationX));
    })
    .onEnd((e) => {
      const maxDrag = Math.max(0, trackWidth.current / 2 - THUMB_SIZE / 2);
      const threshold = maxDrag * THRESHOLD_RATIO;
      if (e.translationX <= -threshold) {
        thumbX.value = withSpring(0);
        hapticConfirm();
        hapticSuccess();
        onAccept();
      } else if (e.translationX >= threshold) {
        thumbX.value = withSpring(0);
        hapticConfirm();
        hapticWarning();
        onDecline();
      } else {
        thumbX.value = withSpring(0);
      }
    })
    .onFinalize(() => {
      thumbX.value = withSpring(0);
    });

  function handleLayout(e: LayoutChangeEvent) {
    trackWidth.current = e.nativeEvent.layout.width;
  }

  return (
    <View
      onLayout={handleLayout}
      style={{
        minHeight: THUMB_SIZE,
        backgroundColor: WK.tealCard,
        borderWidth: 3,
        borderColor: WK.border,
        overflow: 'hidden',
        opacity: disabled ? 0.5 : 1,
        ...pixelShadow,
      }}
    >
      {/* Green fill — grows left-to-right as user drags toward ACCEPT */}
      <Animated.View
        style={[{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          backgroundColor: WK.green,
          opacity: 0.35,
        }, greenFillStyle]}
      />

      {/* Red fill — grows right-to-left as user drags toward DECLINE */}
      <Animated.View
        style={[{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: WK.red,
          opacity: 0.35,
        }, redFillStyle]}
      />

      {/* Left hint zone */}
      <View style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '22%',
        backgroundColor: WK.green,
        opacity: 0.10,
      }} />
      <View style={{
        position: 'absolute',
        left: 10,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
      }}>
        <PixelText size={6} dim>← {acceptLabel}</PixelText>
      </View>

      {/* Right hint zone */}
      <View style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '22%',
        backgroundColor: WK.red,
        opacity: 0.10,
      }} />
      <View style={{
        position: 'absolute',
        right: 10,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
      }}>
        <PixelText size={6} dim>{declineLabel} →</PixelText>
      </View>

      {/* Centre prompt */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        pointerEvents="none"
      >
        <PixelText size={7} dim>◄ DRAG ►</PixelText>
      </View>

      {/* Thumb — centred, receives pan gesture */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        pointerEvents="box-none"
      >
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[{
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              backgroundColor: WK.tealPanel,
              borderWidth: 3,
              borderColor: WK.border,
              alignItems: 'center',
              justifyContent: 'center',
              ...pixelShadow,
            }, thumbStyle]}
          >
            <PixelText size={12}>⇔</PixelText>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

import { useEffect, useState } from 'react';
import { View, Pressable, FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PixelText } from '@/components/ui/PixelText';
import { Button } from '@/components/ui/Button';
import { WK, pixelShadow } from '@/constants/theme';
import { CLUB_COUNTRIES } from '@/utils/nationality';
import { useInitFlow } from '@/hooks/useInitFlow';

interface Props {
  onComplete: () => void;
}

export function InitializationScreen({ onComplete }: Props) {
  const {
    stepLabel,
    progressTick,
    totalTicks,
    error,
    needsCountryPicker,
    start,
    retry,
    selectCountry,
  } = useInitFlow(onComplete);

  const [dots, setDots] = useState(1);

  // Kick off the flow on mount
  useEffect(() => {
    void start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate ellipsis while running
  useEffect(() => {
    if (error || needsCountryPicker) return;
    const t = setInterval(() => setDots((d) => (d % 3) + 1), 450);
    return () => clearInterval(t);
  }, [error, needsCountryPicker]);

  const pct = totalTicks > 0 ? Math.round((progressTick / totalTicks) * 100) : 0;
  const label = stepLabel || 'Initialising…';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark, justifyContent: 'center', paddingHorizontal: 24 }}>
      {/* Logo */}
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <PixelText size={14} upper style={{ textAlign: 'center', marginBottom: 8 }}>WUNDERKIND</PixelText>
        <PixelText size={8}  upper style={{ textAlign: 'center', marginBottom: 6 }}>FACTORY</PixelText>
        <View style={{ height: 3, width: 80, backgroundColor: WK.yellow, marginTop: 8 }} />
      </View>

      <View style={{
        borderWidth: 3,
        borderColor: WK.yellow,
        backgroundColor: 'rgba(245,200,66,0.06)',
        padding: 20,
        ...pixelShadow,
      }}>
        <PixelText size={5} color={WK.yellow} style={{ textAlign: 'center', marginBottom: 14 }}>
          INITIALIZING WORLD
        </PixelText>

        {/* Step label */}
        {!error && !needsCountryPicker && (
          <PixelText size={6} style={{ textAlign: 'center', marginBottom: 16, minHeight: 20 }}>
            {label}{'.'.repeat(dots)}
          </PixelText>
        )}

        {/* Progress bar */}
        <View style={{ height: 8, backgroundColor: WK.border, borderWidth: 2, borderColor: WK.tealLight, marginBottom: 10 }}>
          <View style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: WK.yellow,
          }} />
        </View>

        {/* Tick counter */}
        <PixelText size={5} dim style={{ textAlign: 'center', marginBottom: 4 }}>
          {progressTick} / {totalTicks}
        </PixelText>

        {/* Error state */}
        {error && (
          <View style={{ marginTop: 16, alignItems: 'center', gap: 12 }}>
            <PixelText size={6} color={WK.red} style={{ textAlign: 'center' }}>
              {error.kind === 'pool_too_small'
                ? 'PLAYER POOL TOO SMALL.\nCONTACT SUPPORT.'
                : error.message.toUpperCase()}
            </PixelText>
            {error.kind !== 'pool_too_small' && (
              <Button label="TAP TO RETRY" variant="yellow" onPress={retry} />
            )}
          </View>
        )}
      </View>

      {/* Country picker modal — shown on 422 */}
      <Modal visible={needsCountryPicker} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 24 }}
          onPress={() => {/* non-dismissible — user must select */}}
        >
          <View style={{
            backgroundColor: WK.tealCard,
            borderWidth: 3,
            borderColor: WK.border,
            ...pixelShadow,
          }}>
            <View style={{ borderBottomWidth: 2, borderBottomColor: WK.border, padding: 14 }}>
              <PixelText size={7} upper style={{ textAlign: 'center' }}>SELECT YOUR COUNTRY</PixelText>
              <PixelText size={5} dim style={{ textAlign: 'center', marginTop: 6 }}>
                YOUR CLUB'S COUNTRY COULD NOT BE DETERMINED
              </PixelText>
            </View>
            <FlatList
              data={CLUB_COUNTRIES}
              keyExtractor={(item) => item.code}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <Pressable onPress={() => selectCountry(item.code)}>
                  <View style={{
                    flexDirection:  'row',
                    alignItems:     'center',
                    gap:            12,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: WK.border,
                  }}>
                    <PixelText size={14}>{item.flag}</PixelText>
                    <PixelText size={7} upper>{item.label}</PixelText>
                  </View>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

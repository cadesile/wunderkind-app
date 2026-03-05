import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Building2, DollarSign, Store, ChevronsRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { AdvanceModal } from '@/components/AdvanceModal';
import { GlobalHeader } from '@/components/GlobalHeader';
import { PixelText } from '@/components/ui/PixelText';
import { WK, pixelShadow } from '@/constants/theme';

type NavTabDef = {
  name: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
};

const NAV_TABS: NavTabDef[] = [
  { name: 'index',      label: 'ACADEMY', Icon: Home },
  { name: 'facilities', label: 'BUILD',   Icon: Building2 },
  { name: 'finances',   label: 'FINANCE', Icon: DollarSign },
  { name: 'market',     label: 'MARKET',  Icon: Store },
];

type CustomTabBarProps = BottomTabBarProps & { onAdvance: () => void };

function CustomTabBar({ state, navigation, onAdvance }: CustomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: WK.tealDark,
        borderTopWidth: 3,
        borderTopColor: WK.border,
        height: 68 + insets.bottom,
        paddingBottom: insets.bottom,
      }}
    >
      {/* 4 main nav tabs — share remaining width equally */}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {NAV_TABS.map(({ name, label, Icon }) => {
          const routeIndex = state.routes.findIndex((r) => r.name === name);
          const isActive = routeIndex !== -1 && state.index === routeIndex;
          const route = state.routes[routeIndex];

          return (
            <Pressable
              key={name}
              onPress={() => {
                if (!route) return;
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isActive && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 44,
              }}
            >
              {/* Active pill: teal card bg + gold border */}
              <View
                style={[
                  {
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 6,
                    paddingVertical: 5,
                    gap: 4,
                  },
                  isActive && {
                    backgroundColor: WK.tealCard,
                    borderWidth: 2,
                    borderColor: WK.yellow,
                    ...pixelShadow,
                  },
                ]}
              >
                <Icon size={16} color={isActive ? WK.yellow : WK.dim} />
                <PixelText size={7} color={isActive ? WK.yellow : WK.dim}>
                  {label}
                </PixelText>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* ADVANCE — fixed-width gold CTA anchored to the right */}
      <Pressable
        onPress={onAdvance}
        style={{
          width: 88,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: WK.yellow,
          borderLeftWidth: 3,
          borderLeftColor: WK.border,
          gap: 4,
        }}
      >
        <ChevronsRight size={20} color={WK.tealDark} />
        <PixelText size={7} color={WK.tealDark}>ADVANCE</PixelText>
      </Pressable>
    </View>
  );
}

export default function TabLayout() {
  const [advanceVisible, setAdvanceVisible] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <GlobalHeader />

      <Tabs
        tabBar={(props) => (
          <CustomTabBar {...props} onAdvance={() => setAdvanceVisible(true)} />
        )}
        screenOptions={{ headerShown: false }}
      >
        {/* Primary tabs */}
        <Tabs.Screen name="index"      options={{ title: 'ACADEMY' }} />
        <Tabs.Screen name="facilities" options={{ title: 'BUILD' }} />
        <Tabs.Screen name="finances"   options={{ title: 'FINANCE' }} />
        <Tabs.Screen name="market"     options={{ title: 'MARKET' }} />
        <Tabs.Screen name="advance"    options={{ title: 'ADVANCE' }} />

        {/* Hidden routes — no tab button, deep-link suppressed */}
        <Tabs.Screen name="squad"   options={{ href: null }} />
        <Tabs.Screen name="coaches" options={{ href: null }} />
        <Tabs.Screen name="inbox"   options={{ href: null }} />
      </Tabs>

      <AdvanceModal visible={advanceVisible} onClose={() => setAdvanceVisible(false)} />
    </View>
  );
}

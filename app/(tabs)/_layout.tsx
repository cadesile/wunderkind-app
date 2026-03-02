import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Building2, DollarSign, ChevronsRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdvanceModal } from '@/components/AdvanceModal';
import { GlobalHeader } from '@/components/GlobalHeader';
import { PixelText } from '@/components/ui/PixelText';
import { WK } from '@/constants/theme';

export default function TabLayout() {
  const [advanceVisible, setAdvanceVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const tabBarHeight = 62 + insets.bottom;

  return (
    <View style={{ flex: 1 }}>
      <GlobalHeader />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: WK.yellow,
          tabBarInactiveTintColor: WK.dim,
          tabBarStyle: {
            backgroundColor: WK.tealDark,
            borderTopWidth: 3,
            borderTopColor: WK.border,
            height: tabBarHeight,
            paddingBottom: insets.bottom,
          },
          tabBarLabelStyle: {
            fontFamily: WK.font,
            fontSize: 8,
            marginBottom: 4,
          },
        }}
      >
        {/* Primary tabs */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'ACADEMY',
            tabBarIcon: ({ color, size }) => <Home size={size - 6} color={color} />,
          }}
        />
        <Tabs.Screen
          name="facilities"
          options={{
            title: 'BUILD',
            tabBarIcon: ({ color, size }) => <Building2 size={size - 6} color={color} />,
          }}
        />
        <Tabs.Screen
          name="finances"
          options={{
            title: 'FINANCE',
            tabBarIcon: ({ color, size }) => <DollarSign size={size - 6} color={color} />,
          }}
        />
        {/* Advance — intercepted by custom tabBarButton */}
        <Tabs.Screen
          name="advance"
          options={{
            title: 'ADVANCE',
            tabBarButton: () => (
              <Pressable
                onPress={() => setAdvanceVisible(true)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingBottom: insets.bottom,
                  borderLeftWidth: 2,
                  borderLeftColor: WK.border,
                  backgroundColor: 'rgba(245,200,66,0.08)',
                }}
              >
                <ChevronsRight size={18} color={WK.yellow} />
                <PixelText size={8} color={WK.yellow} style={{ marginTop: 3 }}>ADVANCE</PixelText>
              </Pressable>
            ),
          }}
        />

        {/* Hidden routes — accessible via Academy Hub / GlobalHeader */}
        <Tabs.Screen
          name="squad"
          options={{ tabBarButton: () => null }}
        />
        <Tabs.Screen
          name="coaches"
          options={{ tabBarButton: () => null }}
        />
        <Tabs.Screen
          name="inbox"
          options={{ tabBarButton: () => null }}
        />
      </Tabs>

      <AdvanceModal visible={advanceVisible} onClose={() => setAdvanceVisible(false)} />
    </View>
  );
}

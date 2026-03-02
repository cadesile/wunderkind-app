import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Users, Mail, DollarSign, UserCog, Building2, ChevronsRight } from 'lucide-react-native';
import { useInboxStore } from '@/stores/inboxStore';
import { useAcademyStore } from '@/stores/academyStore';
import { AdvanceModal } from '@/components/AdvanceModal';
import { PixelText } from '@/components/ui/PixelText';
import { WK } from '@/constants/theme';
import { getGameDateDisplay } from '@/utils/gameDate';

function GameDateBar() {
  const weekNumber = useAcademyStore((s) => s.academy.weekNumber ?? 1);
  const dateStr = getGameDateDisplay(weekNumber);

  return (
    <View style={{
      backgroundColor: WK.tealDark,
      borderBottomWidth: 2,
      borderBottomColor: WK.border,
      paddingHorizontal: 14,
      paddingVertical: 7,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <PixelText size={7} color={WK.dim}>WK {weekNumber}</PixelText>
      <PixelText size={7} color={WK.tealLight}>{dateStr}</PixelText>
    </View>
  );
}

export default function TabLayout() {
  const unreadCount = useInboxStore((s) => s.unreadCount());
  const [advanceVisible, setAdvanceVisible] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <GameDateBar />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: WK.yellow,
          tabBarInactiveTintColor: WK.dim,
          tabBarStyle: {
            backgroundColor: WK.tealDark,
            borderTopWidth: 3,
            borderTopColor: WK.border,
            height: 58,
          },
          tabBarLabelStyle: {
            fontFamily: WK.font,
            fontSize: 6,
            marginBottom: 3,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'ACADEMY',
            tabBarIcon: ({ color, size }) => <Home size={size - 6} color={color} />,
          }}
        />
        <Tabs.Screen
          name="squad"
          options={{
            title: 'SQUAD',
            tabBarIcon: ({ color, size }) => <Users size={size - 6} color={color} />,
          }}
        />
        <Tabs.Screen
          name="coaches"
          options={{
            title: 'COACHES',
            tabBarIcon: ({ color, size }) => <UserCog size={size - 6} color={color} />,
          }}
        />
        <Tabs.Screen
          name="facilities"
          options={{
            title: 'FACILTIES',
            tabBarIcon: ({ color, size }) => <Building2 size={size - 6} color={color} />,
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: 'INBOX',
            tabBarIcon: ({ color, size }) => <Mail size={size - 6} color={color} />,
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          }}
        />
        <Tabs.Screen
          name="finances"
          options={{
            title: 'FINANCE',
            tabBarIcon: ({ color, size }) => <DollarSign size={size - 6} color={color} />,
          }}
        />
        {/* Advance — intercepted by custom tabBarButton; advance.tsx is a placeholder */}
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
                  borderLeftWidth: 2,
                  borderLeftColor: WK.border,
                  backgroundColor: 'rgba(245,200,66,0.08)',
                }}
              >
                <ChevronsRight size={18} color={WK.yellow} />
                <PixelText size={6} color={WK.yellow} style={{ marginTop: 3 }}>ADVANCE</PixelText>
              </Pressable>
            ),
          }}
        />
      </Tabs>

      <AdvanceModal visible={advanceVisible} onClose={() => setAdvanceVisible(false)} />
    </View>
  );
}

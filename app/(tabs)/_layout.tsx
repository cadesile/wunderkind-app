import { Tabs } from 'expo-router';
import { Home, Users, Mail, DollarSign } from 'lucide-react-native';
import { useInboxStore } from '@/stores/inboxStore';
import { WK } from '@/constants/theme';

export default function TabLayout() {
  const unreadCount = useInboxStore((s) => s.unreadCount());

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: WK.yellow,
        tabBarInactiveTintColor: WK.dim,
        tabBarStyle: {
          backgroundColor: WK.tealDark,
          borderTopWidth: 3,
          borderTopColor: WK.border,
          height: 60,
        },
        tabBarLabelStyle: {
          fontFamily: WK.font,
          fontSize: 7,
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ACADEMY',
          tabBarIcon: ({ color, size }) => <Home size={size - 4} color={color} />,
        }}
      />
      <Tabs.Screen
        name="squad"
        options={{
          title: 'SQUAD',
          tabBarIcon: ({ color, size }) => <Users size={size - 4} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'INBOX',
          tabBarIcon: ({ color, size }) => <Mail size={size - 4} color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="finances"
        options={{
          title: 'FINANCE',
          tabBarIcon: ({ color, size }) => <DollarSign size={size - 4} color={color} />,
        }}
      />
    </Tabs>
  );
}

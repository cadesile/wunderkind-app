import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, AlertTriangle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAcademyStore } from '@/stores/academyStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { FacilityType } from '@/types/facility';
import { PixelText } from './ui/PixelText';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { getGameDateDisplay } from '@/utils/gameDate';
import { WK } from '@/constants/theme';
import { ACADEMY_COUNTRIES } from '@/utils/nationality';

/**
 * Persistent top header rendered above all tab screens.
 * Left: Academy name  |  Center: WK week + date  |  Right: sync status + inbox icon
 */
export function GlobalHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const academy = useAcademyStore((s) => s.academy);
  const unreadCount = useInboxStore((s) => s.messages.filter((m) => !m.isRead).length);
  const syncStatus = useSyncStatus();

  // Warn if any built facility has condition < 30%
  const facilityWarning = useFacilityStore((s) =>
    (Object.keys(s.levels) as FacilityType[]).some(
      (type) => s.levels[type] > 0 && s.conditions[type] < 30,
    )
  );

  const weekNumber = academy.weekNumber ?? 1;
  const dateStr = getGameDateDisplay(weekNumber);
  const countryFlag = academy.country
    ? ACADEMY_COUNTRIES.find((c) => c.code === academy.country)?.flag ?? null
    : null;

  return (
    <View style={{
      backgroundColor: WK.tealDark,
      borderBottomWidth: 3,
      borderBottomColor: WK.border,
      paddingTop: insets.top + 6,
      paddingBottom: 8,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      {/* Left: flag + academy name */}
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 4 }}>
        {countryFlag && (
          <PixelText size={14}>{countryFlag}</PixelText>
        )}
        <PixelText size={9} upper numberOfLines={1} style={{ flex: 1 }}>
          {academy.name}
        </PixelText>
      </View>

      {/* Center: week + date */}
      <View style={{ alignItems: 'center', flex: 1 }}>
        <PixelText size={7} color={WK.dim}>WK {weekNumber}</PixelText>
        <PixelText size={6} color={WK.tealLight} style={{ marginTop: 2 }}>{dateStr}</PixelText>
      </View>

      {/* Right: facility warning + sync indicator + inbox */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' }}>
        {facilityWarning && (
          <Pressable onPress={() => router.push('/facilities')} hitSlop={8}>
            <AlertTriangle size={16} color={WK.red} />
          </Pressable>
        )}
        <SyncStatusIndicator status={syncStatus} />
        <Pressable
          onPress={() => router.push('/inbox')}
          style={{ position: 'relative' }}
          hitSlop={8}
        >
          <Mail size={18} color={unreadCount > 0 ? WK.yellow : WK.dim} />
          {unreadCount > 0 && (
            <View style={{
              position: 'absolute',
              top: -4,
              right: -4,
              backgroundColor: WK.red,
              borderRadius: 0,
              minWidth: 12,
              height: 12,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 2,
            }}>
              <PixelText size={5} color={WK.text}>{unreadCount > 9 ? '9+' : unreadCount}</PixelText>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, AlertTriangle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useClubStore } from '@/stores/clubStore';
import { useInboxStore } from '@/stores/inboxStore';
import { useNavStore } from '@/stores/navStore';
import { useNarrativeStore } from '@/stores/narrativeStore';
import { useFacilityStore } from '@/stores/facilityStore';
import { FacilityType } from '@/types/facility';
import { PixelText, BodyText } from './ui/PixelText';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { getGameDateDisplay } from '@/utils/gameDate';
import { WK } from '@/constants/theme';
import { ACADEMY_COUNTRIES } from '@/utils/nationality';

/**
 * Persistent top header rendered above all tab screens.
 *
 * Single row:
 *   [14px] Club Name 🏳  ·  ■ LIVE  ·  DATE    [⚠][✉]
 */
export function GlobalHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const club = useClubStore((s) => s.club);
  const unreadCount =
    useInboxStore((s) => s.messages.filter((m) => !m.isRead).length) +
    useNarrativeStore((s) => s.messages.filter((m) => !m.readAt).length);
  const syncStatus = useSyncStatus();

  const facilityWarning = useFacilityStore((s) =>
    (Object.keys(s.levels) as FacilityType[]).some(
      (type) => s.levels[type] > 0 && s.conditions[type] < 30,
    )
  );

  const weekNumber = club.weekNumber ?? 1;
  const dateStr = getGameDateDisplay(weekNumber);
  const countryFlag = club.country
    ? ACADEMY_COUNTRIES.find((c) => c.code === club.country)?.flag ?? null
    : null;

  return (
    <View style={{
      backgroundColor: WK.tealDark,
      borderBottomWidth: 3,
      borderBottomColor: WK.border,
      paddingTop: insets.top,
      flexDirection: 'row',
      alignItems: 'center',
      height: insets.top + 50,
      paddingLeft: 14,
    }}>

      {/* Club name + flag */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
        <PixelText size={9} upper numberOfLines={1} style={{ flexShrink: 1 }}>
          {club.name}
        </PixelText>
        {countryFlag && (
          <PixelText size={14}>{countryFlag}</PixelText>
        )}
      </View>

      {/* Separator dot */}
      <BodyText size={12} color={WK.border} style={{ marginHorizontal: 8 }}>·</BodyText>

      {/* Sync + date */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
        <SyncStatusIndicator status={syncStatus} />
        <BodyText size={11} color={WK.dim} numberOfLines={1}>{dateStr}</BodyText>
      </View>

      {/* Build SHA badge */}
      {!!process.env.EXPO_PUBLIC_BUILD_SHA && (
        <View style={{
          backgroundColor: WK.border,
          borderWidth: 1,
          borderColor: WK.dim,
          paddingHorizontal: 5,
          paddingVertical: 2,
          marginRight: 4,
        }}>
          <BodyText size={9} color={WK.dim}>
            {process.env.EXPO_PUBLIC_BUILD_SHA.slice(0, 7)}
          </BodyText>
        </View>
      )}

      {/* Facility warning */}
      {facilityWarning && (
        <Pressable
          onPress={() => router.push('/facilities')}
          hitSlop={8}
          style={{ width: 40, height: 50, alignItems: 'center', justifyContent: 'center' }}
        >
          <AlertTriangle size={18} color={WK.red} />
        </Pressable>
      )}

      {/* Inbox */}
      <Pressable
        onPress={() => {
          useNavStore.getState().requestInboxReset();
          router.navigate('/inbox');
        }}
        style={{ width: 50, height: 50, alignItems: 'center', justifyContent: 'center' }}
      >
        <Mail size={22} color={unreadCount > 0 ? WK.yellow : WK.dim} />
        {unreadCount > 0 && (
          <View style={{
            position: 'absolute',
            top: 6,
            right: 6,
            backgroundColor: WK.red,
            minWidth: 16,
            height: 16,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 3,
          }}>
            <BodyText size={10} color={WK.text} style={{ lineHeight: 14 }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </BodyText>
          </View>
        )}
      </Pressable>

    </View>
  );
}

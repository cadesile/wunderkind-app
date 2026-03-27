import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, AlertTriangle, Home } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAcademyStore } from '@/stores/academyStore';
import { useInboxStore } from '@/stores/inboxStore';
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
 * Row 1 — Identity bar (46px):
 *   [Home 26px · 44×44] | Academy Name  🏳 | [Inbox 26px · 44×44]
 *
 * Row 2 — Context strip (~28px):
 *   Sync indicator | WK {n} · Date | Facility warning
 */
export function GlobalHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const academy = useAcademyStore((s) => s.academy);
  const unreadCount = useInboxStore((s) => s.messages.filter((m) => !m.isRead).length);
  const syncStatus = useSyncStatus();

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
      paddingTop: insets.top,
    }}>

      {/* ── Row 1: Identity bar ─────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 46 }}>

        {/* Home — 44×44 tap zone */}
        <Pressable
          onPress={() => router.push('/home')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Home size={26} color={WK.dim} />
        </Pressable>

        {/* Academy name + flag */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <PixelText size={9} upper numberOfLines={1} style={{ flexShrink: 1 }}>
            {academy.name}
          </PixelText>
          {countryFlag && (
            <PixelText size={14}>{countryFlag}</PixelText>
          )}
        </View>

        {/* Inbox — 44×44 tap zone */}
        <Pressable
          onPress={() => router.push('/inbox')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Mail size={26} color={unreadCount > 0 ? WK.yellow : WK.dim} />
          {unreadCount > 0 && (
            <View style={{
              position: 'absolute',
              top: 6,
              right: 6,
              backgroundColor: WK.red,
              borderRadius: 0,
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

      {/* Divider between rows */}
      <View style={{ height: 1, backgroundColor: WK.border }} />

      {/* ── Row 2: Context strip ────────────────────────────────────────── */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}>

        {/* Left: sync status */}
        <View style={{ flex: 1 }}>
          <SyncStatusIndicator status={syncStatus} />
        </View>

        {/* Centre: week + date on one line */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <PixelText size={8} color={WK.yellow}>WK {weekNumber}</PixelText>
          <BodyText size={11} color={WK.dim}>· {dateStr}</BodyText>
        </View>

        {/* Right: facility warning (or empty space to keep centre balanced) */}
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          {facilityWarning && (
            <Pressable onPress={() => router.push('/facilities')} hitSlop={8}>
              <AlertTriangle size={18} color={WK.red} />
            </Pressable>
          )}
        </View>
      </View>

    </View>
  );
}

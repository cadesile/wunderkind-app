import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAcademyStore } from '@/stores/academyStore';
import { useSquadStore } from '@/stores/squadStore';
import { Card } from '@/components/ui/Card';
import { PixelText } from '@/components/ui/PixelText';
import { PixelAvatar } from '@/components/ui/PixelAvatar';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { WK, pixelShadow } from '@/constants/theme';

export default function DashboardScreen() {
  const academy = useAcademyStore((s) => s.academy);
  const players = useSquadStore((s) => s.players);
  const router = useRouter();
  const syncStatus = useSyncStatus();

  const focusPlayer = players[0] ?? null;
  const repPct = (academy.reputation / 1000) * 100;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      {/* Panel header */}
      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 4,
        borderBottomColor: WK.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}>
        <PixelText size={10} upper>{academy.name}</PixelText>
        <SyncStatusIndicator status={syncStatus} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 0 }}>

        {/* Balance card */}
        <View style={{ margin: 10 }}>
          <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <PixelText size={7} dim>BANK BALANCE</PixelText>
              <PixelText size={18} color={WK.yellow} style={{ marginTop: 4 }}>
                £{academy.totalCareerEarnings.toLocaleString()}
              </PixelText>
            </View>
            <View>
              <PixelText size={7} dim>REPUTATION</PixelText>
              <PixelText size={13} color={WK.tealLight} style={{ marginTop: 4 }}>
                {academy.reputation}
              </PixelText>
              <PixelText size={7} dim upper>{academy.reputationTier}</PixelText>
            </View>
          </Card>
        </View>

        {/* Reputation bar */}
        <View style={{ marginHorizontal: 10, marginBottom: 10 }}>
          <View style={{
            height: 8,
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderWidth: 2,
            borderColor: WK.border,
          }}>
            <View style={{
              height: '100%',
              width: `${repPct}%`,
              backgroundColor: WK.tealLight,
            }} />
          </View>
        </View>

        {/* Focus player card */}
        {focusPlayer && (
          <Pressable onPress={() => router.push(`/player/${focusPlayer.id}`)} style={{ margin: 10, marginTop: 0 }}>
            <Card>
              <PixelText size={7} dim style={{ marginBottom: 8 }}>◆ FEATURED PLAYER</PixelText>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <PixelAvatar size={56} />
                <View style={{ flex: 1 }}>
                  <PixelText size={9} upper style={{ marginBottom: 3 }}>{focusPlayer.name}</PixelText>
                  <PixelText size={7} color={WK.tealLight}>{focusPlayer.position} · AGE {focusPlayer.age}</PixelText>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                    <View>
                      <PixelText size={7} dim>OVR</PixelText>
                      <PixelText size={12} color={WK.tealLight}>{focusPlayer.overallRating}</PixelText>
                    </View>
                    <View>
                      <PixelText size={7} dim>POT</PixelText>
                      <PixelText size={10} color={WK.yellow}>{'★'.repeat(focusPlayer.potential)}</PixelText>
                    </View>
                  </View>
                </View>
              </View>
            </Card>
          </Pressable>
        )}

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 10, marginBottom: 10 }}>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <PixelText size={7} dim>SQUAD</PixelText>
            <PixelText size={20} color={WK.text} style={{ marginTop: 4 }}>{players.length}</PixelText>
            <PixelText size={7} dim>PLAYERS</PixelText>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <PixelText size={7} dim>STAFF</PixelText>
            <PixelText size={20} color={WK.text} style={{ marginTop: 4 }}>{academy.staffCount}</PixelText>
            <PixelText size={7} dim>COACHES</PixelText>
          </Card>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

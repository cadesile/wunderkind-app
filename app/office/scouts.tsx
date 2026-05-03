import { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelText } from '@/components/ui/PixelText';
import { FlagText } from '@/components/ui/FlagText';
import { Avatar } from '@/components/ui/Avatar';
import { WK, pixelShadow } from '@/constants/theme';
import { useScoutStore } from '@/stores/scoutStore';
import { useMarketStore } from '@/stores/marketStore';
import { Scout } from '@/types/market';
import { moraleLabel } from '@/utils/morale';
import { MoraleBar } from '@/components/ui/MoraleBar';
import { Badge } from '@/components/ui/Badge';

function moraleColor(morale: number): string {
  if (morale >= 60) return WK.green;
  if (morale >= 40) return WK.yellow;
  return WK.red;
}

const RANGE_BADGE_COLOR: Record<Scout['scoutingRange'], 'dim' | 'yellow' | 'red'> = {
  local:         'dim',
  national:      'yellow',
  international: 'red',
};

function ScoutCard({ scout, onPress }: { scout: Scout; onPress: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const marketPlayers = useMarketStore((s) => s.players);
  const morale = scout.morale ?? 70;
  const assigned = scout.assignedPlayerIds ?? [];
  const workload = assigned.length;
  const isOnMission = scout.activeMission?.status === 'active';

  const assignedPlayerNames = assigned
    .map((id) => marketPlayers.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => `${p!.firstName} ${p!.lastName}`);

  return (
    <Pressable onPress={onPress}>
    <View style={{
      backgroundColor: WK.tealCard,
      borderWidth: 3,
      borderColor: isOnMission ? WK.orange : WK.border,
      padding: 12,
      marginBottom: 10,
      ...pixelShadow,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {scout.appearance && (
          <Avatar appearance={scout.appearance} role="SCOUT" size={48} morale={70} />
        )}
        <View style={{ flex: 1 }}>
          <PixelText size={8} upper numberOfLines={1}>{scout.name}</PixelText>
          <View style={{ marginTop: 2 }}>
            <Badge label={`${scout.scoutingRange.toUpperCase()} SCOUT`} color={RANGE_BADGE_COLOR[scout.scoutingRange]} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <FlagText nationality={scout.nationality} size={10} />
            <PixelText size={6} dim>{scout.nationality}</PixelText>
          </View>
          <View style={{ marginTop: 4 }}>
            <Badge
              label={isOnMission ? 'ON MISSION' : 'AVAILABLE'}
              color={isOnMission ? 'yellow' : 'green'}
            />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <MoraleBar morale={morale} width={48} />
        </View>
      </View>

      {/* Stats row */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 2,
        borderTopColor: WK.border,
      }}>
        <View style={{ alignItems: 'center' }}>
          <PixelText size={6} dim>SUCCESS RATE</PixelText>
          <PixelText size={12} color={WK.yellow} style={{ marginTop: 4 }}>{scout.successRate}%</PixelText>
        </View>
        <View style={{ alignItems: 'center' }}>
          <PixelText size={6} dim>SALARY</PixelText>
          <PixelText size={12} color={WK.tealLight} style={{ marginTop: 4 }}>
            £{Math.round(scout.salary / 100)}/wk
          </PixelText>
        </View>
        <View style={{ alignItems: 'center' }}>
          <PixelText size={6} dim>WORKLOAD</PixelText>
          <PixelText size={12} color={workload >= 5 ? WK.red : workload >= 3 ? WK.orange : WK.green} style={{ marginTop: 4 }}>
            {workload}/5
          </PixelText>
        </View>
      </View>

      {/* Workload bar */}
      <View style={{
        height: 6,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderWidth: 2,
        borderColor: WK.border,
        marginTop: 8,
      }}>
        <View style={{
          height: '100%',
          width: `${(workload / 5) * 100}%`,
          backgroundColor: workload >= 5 ? WK.red : workload >= 3 ? WK.orange : WK.green,
        }} />
      </View>

      {/* Assignments toggle */}
      {workload > 0 && (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <PixelText size={6} color={WK.tealLight}>VIEW ASSIGNMENTS ({workload})</PixelText>
          <PixelText size={6} color={WK.tealLight}>{expanded ? '\u25BC' : '\u25B6'}</PixelText>
        </Pressable>
      )}
      {expanded && assignedPlayerNames.length > 0 && (
        <View style={{ marginTop: 8, gap: 4 }}>
          {assignedPlayerNames.map((name, i) => (
            <View key={i} style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 8,
              paddingVertical: 6,
              backgroundColor: WK.tealMid,
              borderWidth: 2,
              borderColor: WK.border,
            }}>
              <PixelText size={6} color={WK.yellow} style={{ marginRight: 8 }}>{'\u25C6'}</PixelText>
              <PixelText size={6}>{name}</PixelText>
            </View>
          ))}
        </View>
      )}

      {morale < 40 && (
        <View style={{
          marginTop: 10,
          padding: 8,
          backgroundColor: 'rgba(200,30,30,0.15)',
          borderWidth: 2,
          borderColor: WK.red,
        }}>
          <PixelText size={6} color={WK.red}>LOW MORALE — SCOUTING PAUSED</PixelText>
        </View>
      )}
    </View>
    </Pressable>
  );
}

export default function MarketScoutsScreen() {
  const router = useRouter();
  const scouts = useScoutStore((s) => s.scouts);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      <PitchBackground />

      <View style={{
        backgroundColor: WK.tealMid,
        borderBottomWidth: 4,
        borderBottomColor: WK.border,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
      }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={18} color={WK.text} />
        </Pressable>
        <PixelText size={9} upper style={{ flex: 1 }}>Scout Hub</PixelText>
        <PixelText size={7} color={WK.tealLight}>{scouts.length} SCOUTS</PixelText>
      </View>

      {scouts.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <PixelText size={10} color={WK.yellow}>NO SCOUTS HIRED</PixelText>
          <PixelText size={7} dim>RECRUIT SCOUTS FROM THE MARKET</PixelText>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10 }}>
          {scouts.map((scout) => (
            <ScoutCard
              key={scout.id}
              scout={scout}
              onPress={() => router.push(`/scout/${scout.id}`)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

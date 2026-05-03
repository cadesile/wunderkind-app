import { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { PitchBackground } from '@/components/ui/PitchBackground';
import { PixelText } from '@/components/ui/PixelText';
import { PixelDialog } from '@/components/ui/PixelDialog';
import { FlagText } from '@/components/ui/FlagText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { WK, pixelShadow } from '@/constants/theme';
import { useCoachStore } from '@/stores/coachStore';
import { useClubStore } from '@/stores/clubStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useSquadStore } from '@/stores/squadStore';
import { Relationship } from '@/types/player';
import { moraleLabel } from '@/utils/morale';
import { MoraleBar } from '@/components/ui/MoraleBar';
import { penceToPounds } from '@/utils/currency';

function moraleColor(morale: number): string {
  if (morale >= 60) return WK.green;
  if (morale >= 40) return WK.yellow;
  return WK.red;
}

function relationshipLabel(value: number): string {
  if (value > 30) return 'STRONG BOND';
  if (value > 0) return 'FRIENDLY';
  if (value > -30) return 'STRAINED';
  return 'CONFLICT';
}

function relationshipColor(value: number): string {
  if (value > 30) return WK.green;
  if (value > 0) return WK.tealLight;
  if (value > -30) return WK.yellow;
  return WK.red;
}

export default function CoachDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const coach = useCoachStore((s) => s.coaches.find((c) => c.id === id));
  const removeCoach = useCoachStore((s) => s.removeCoach);
  const { club, addBalance } = useClubStore();
  const players = useSquadStore((s) => s.players);
  const [releaseDialogVisible, setReleaseDialogVisible] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  function confirmRelease() {
    if (!coach) return;
    const penaltyPence = Math.floor(coach.salary * 26 * 0.25);
    const penaltyPounds = Math.round(penaltyPence / 100);
    if (penceToPounds(club.balance ?? 0) < penaltyPounds) {
      setReleaseError(`INSUFFICIENT FUNDS — need £${penaltyPounds.toLocaleString()}`);
      setReleaseDialogVisible(false);
      return;
    }
    addBalance(-penaltyPounds * 100);
    useFinanceStore.getState().addTransaction({
      amount: -penaltyPence,
      category: 'contract_termination',
      description: `Released ${coach.name} (25% early termination)`,
      weekNumber: club.weekNumber ?? 1,
    });
    removeCoach(coach.id);
    router.back();
  }

  if (!coach) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark, alignItems: 'center', justifyContent: 'center' }}>
        <PixelText size={8} dim>COACH NOT FOUND</PixelText>
      </SafeAreaView>
    );
  }

  const morale = coach.morale ?? 70;
  const managerRel = coach.relationships?.find((r) => r.id === 'manager' && r.type === 'manager');

  const playerRelationships = (coach.relationships ?? [])
    .filter((r) => r.type === 'player')
    .map((r) => {
      const player = players.find((p) => p.id === r.id);
      return player ? { player, value: r.value } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b!.value - a!.value) as Array<{ player: typeof players[0]; value: number }>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WK.greenDark }}>
      <PitchBackground />

      {/* Header */}
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
        <PixelText size={9} upper style={{ flex: 1 }} numberOfLines={1}>{coach.name}</PixelText>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10, gap: 10 }}>

        {/* Bio card */}
        <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 14, flexDirection: 'row', gap: 14, ...pixelShadow }}>
          {coach.appearance && <Avatar appearance={coach.appearance} role="COACH" size={64} morale={morale} age={coach.age ?? 35} />}
          <View style={{ flex: 1 }}>
            <PixelText size={10} upper numberOfLines={2}>{coach.name}</PixelText>
            <PixelText size={7} color={WK.tealLight} style={{ marginTop: 4 }}>{coach.role.replace(/_/g, ' ').toUpperCase()}</PixelText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <FlagText nationality={coach.nationality} size={12} />
              <PixelText size={6} dim>{coach.nationality}</PixelText>
            </View>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
              <View>
                <PixelText size={6} dim>INFLUENCE</PixelText>
                <PixelText size={14} color={WK.yellow}>{coach.influence}</PixelText>
              </View>
              <View>
                <PixelText size={6} dim>SALARY</PixelText>
                <PixelText size={9} color={WK.tealLight}>£{Math.round(coach.salary / 100)}/wk</PixelText>
              </View>
            </View>
          </View>
        </View>

        {/* Morale card */}
        <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 14, ...pixelShadow }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <PixelText size={8} upper>Morale</PixelText>
            <PixelText size={8} color={moraleColor(morale)}>{moraleLabel(morale)}</PixelText>
          </View>
          <MoraleBar morale={morale} width="100%" height={8} borderWidth={2} />
          {(coach as any).isLowMorale && (
            <View style={{ marginTop: 8, padding: 6, backgroundColor: 'rgba(200,30,30,0.15)', borderWidth: 2, borderColor: WK.red }}>
              <PixelText size={6} color={WK.red}>LOW MORALE — INFLUENCE HALVED THIS WEEK</PixelText>
            </View>
          )}
          {managerRel && (
            <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: WK.border, flexDirection: 'row', justifyContent: 'space-between' }}>
              <PixelText size={6} dim>TRUST IN MANAGEMENT</PixelText>
              <PixelText size={7} color={relationshipColor(managerRel.value)}>
                {managerRel.value >= 0 ? '+' : ''}{managerRel.value}
              </PixelText>
            </View>
          )}
        </View>

        {/* Player relationships */}
        {playerRelationships.length > 0 && (
          <View style={{ backgroundColor: WK.tealCard, borderWidth: 3, borderColor: WK.border, padding: 14, ...pixelShadow }}>
            <PixelText size={8} upper style={{ marginBottom: 10 }}>Player Relationships</PixelText>
            {playerRelationships.map(({ player, value }) => (
              <View key={player.id} style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 8,
                borderBottomWidth: 2,
                borderBottomColor: WK.border,
              }}>
                <View style={{ flex: 1 }}>
                  <PixelText size={7} numberOfLines={1}>{player.name}</PixelText>
                  <PixelText size={6} dim>{player.position}</PixelText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <PixelText size={7} color={relationshipColor(value)}>
                    {value >= 0 ? '+' : ''}{value}
                  </PixelText>
                  <PixelText size={6} dim>{relationshipLabel(value)}</PixelText>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Release */}
        {releaseError && (
          <PixelText size={6} color={WK.red} style={{ textAlign: 'center', marginTop: 4 }}>
            {releaseError}
          </PixelText>
        )}
        <Button
          label="RELEASE COACH"
          variant="red"
          fullWidth
          onPress={() => { setReleaseError(null); setReleaseDialogVisible(true); }}
          style={{ marginTop: 4 }}
        />

      </ScrollView>

      <PixelDialog
        visible={releaseDialogVisible}
        title="Release Coach?"
        message={coach ? `Release ${coach.name}?\n\nEarly termination fee: £${Math.round(coach.salary * 26 * 0.25 / 100).toLocaleString()}\n(25% of 26 remaining weeks)` : ''}
        onClose={() => setReleaseDialogVisible(false)}
        onConfirm={confirmRelease}
        confirmLabel="RELEASE"
        confirmVariant="red"
      />
    </SafeAreaView>
  );
}

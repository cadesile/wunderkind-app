import { View } from 'react-native';
import { useFanStore } from '@/stores/fanStore';
import { useSquadStore } from '@/stores/squadStore';
import { useClubStore } from '@/stores/clubStore';
import { FanEngine } from '@/engine/FanEngine';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { WK, pixelShadow } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';

export function FanFavoriteCard() {
  const router = useRouter();
  const fanFavoriteId = useFanStore((s) => s.fanFavoriteId);
  const player = useSquadStore((s) => s.players.find(p => p.id === fanFavoriteId));
  const weekNumber = useClubStore((s) => s.club.weekNumber ?? 1);
  
  const score = FanEngine.calculateScore(weekNumber);
  const tier = FanEngine.getTier(score);

  const tierColors: Record<string, string> = {
    'Thrilled': WK.green,
    'Happy': WK.yellow,
    'Neutral': WK.dim,
    'Disappointed': WK.orange,
    'Angry': WK.red,
  };

  return (
    <View style={{
      backgroundColor: WK.tealDark,
      borderWidth: 3,
      borderColor: WK.border,
      ...pixelShadow,
      marginBottom: 16,
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: WK.border,
      }}>
        <PixelText size={7} color={WK.yellow}>FAN BASE</PixelText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <PixelText size={6} color={tierColors[tier]}>{tier.toUpperCase()}</PixelText>
          <PixelText size={6} color={WK.dim}>({score})</PixelText>
        </View>
      </View>

      <View style={{ padding: 14 }}>
        {player ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ 
              width: 40, 
              height: 40, 
              backgroundColor: WK.tealCard, 
              borderWidth: 2, 
              borderColor: WK.yellow,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
               <Heart size={20} color={WK.yellow} fill={WK.yellow} />
            </View>
            <View style={{ flex: 1 }}>
              <PixelText size={6} dim style={{ marginBottom: 2 }}>FAN FAVORITE</PixelText>
              <PixelText size={8}>{player.name.toUpperCase()}</PixelText>
              <BodyText size={11} color={WK.dim}>OVR {player.overallRating}</BodyText>
            </View>
            <View style={{ 
              paddingHorizontal: 10, 
              paddingVertical: 6, 
              backgroundColor: WK.tealCard,
              borderWidth: 2,
              borderColor: WK.border,
            }}>
              <PixelText size={6} color={WK.yellow} onPress={() => router.push(`/office/fans` as any)}>VIEW ALL</PixelText>
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <PixelText size={6} dim style={{ marginBottom: 2 }}>NO FAVORITE YET</PixelText>
              <BodyText size={12} color={WK.dim}>Fans are still getting to know the squad.</BodyText>
            </View>
            <View style={{ 
              paddingHorizontal: 10, 
              paddingVertical: 6, 
              backgroundColor: WK.tealCard,
              borderWidth: 2,
              borderColor: WK.border,
            }}>
              <PixelText size={6} color={WK.yellow} onPress={() => router.push(`/office/fans` as any)}>VIEW ALL</PixelText>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

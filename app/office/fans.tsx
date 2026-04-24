import { View, ScrollView } from 'react-native';
import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { WK, pixelShadow } from '@/constants/theme';
import { useFanStore } from '@/stores/fanStore';
import { useClubStore } from '@/stores/clubStore';
import { useSquadStore } from '@/stores/squadStore';
import { FanEngine } from '@/engine/FanEngine';

export default function FansPane() {
  const events = useFanStore((s) => s.events);
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

  const recentEvents = events.slice(0, 5);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        
        {/* Happiness Overview */}
        <View style={{
          backgroundColor: WK.tealCard,
          borderWidth: 3,
          borderColor: WK.yellow,
          padding: 20,
          ...pixelShadow,
          marginBottom: 16,
          alignItems: 'center',
        }}>
          <Users size={32} color={WK.yellow} style={{ marginBottom: 12 }} />
          <PixelText size={7} dim style={{ marginBottom: 4 }}>OVERALL HAPPINESS</PixelText>
          <PixelText size={12} color={tierColors[tier]} style={{ marginBottom: 8 }}>{tier.toUpperCase()}</PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1, height: 8, backgroundColor: WK.tealDark, borderWidth: 1, borderColor: WK.border }}>
              <View style={{ width: `${score}%`, height: '100%', backgroundColor: tierColors[tier] }} />
            </View>
            <PixelText size={8}>{score}/100</PixelText>
          </View>
        </View>

        {/* Impact Summary */}
        <View style={{ marginBottom: 20 }}>
           <PixelText size={7} color={WK.yellow} style={{ marginBottom: 12 }}>CURRENT IMPACTS</PixelText>
           <View style={{ gap: 8 }}>
              {tier === 'Thrilled' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: WK.tealDark, padding: 10, borderWidth: 1, borderColor: WK.green }}>
                   <TrendingUp size={16} color={WK.green} />
                   <BodyText size={12}>Attendance: +20% Income</BodyText>
                </View>
              )}
              {tier === 'Happy' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: WK.tealDark, padding: 10, borderWidth: 1, borderColor: WK.yellow }}>
                   <TrendingUp size={16} color={WK.yellow} />
                   <BodyText size={12}>Attendance: +10% Income</BodyText>
                </View>
              )}
              {tier === 'Neutral' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: WK.tealDark, padding: 10, borderWidth: 1, borderColor: WK.dim }}>
                   <Minus size={16} color={WK.dim} />
                   <BodyText size={12}>Attendance: No impact</BodyText>
                </View>
              )}
              {tier === 'Disappointed' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: WK.tealDark, padding: 10, borderWidth: 1, borderColor: WK.orange }}>
                   <TrendingDown size={16} color={WK.orange} />
                   <BodyText size={12}>Attendance: -10% Income</BodyText>
                </View>
              )}
              {tier === 'Angry' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: WK.tealDark, padding: 10, borderWidth: 1, borderColor: WK.red }}>
                   <TrendingDown size={16} color={WK.red} />
                   <BodyText size={12}>Attendance: -20% Income</BodyText>
                </View>
              )}
              {(tier === 'Thrilled' || tier === 'Angry') && (
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: WK.tealDark, padding: 10, borderWidth: 1, borderColor: tierColors[tier] }}>
                    {tier === 'Thrilled' ? <TrendingUp size={16} color={WK.green} /> : <TrendingDown size={16} color={WK.red} />}
                    <BodyText size={12}>Squad Morale: {tier === 'Thrilled' ? '+1' : '-1'} / week</BodyText>
                 </View>
              )}
           </View>
        </View>

        {/* Fan Favorite */}
        <View style={{
          backgroundColor: WK.tealDark,
          borderWidth: 2,
          borderColor: WK.border,
          padding: 16,
          marginBottom: 24,
        }}>
           <PixelText size={7} color={WK.yellow} style={{ marginBottom: 12 }}>FAN FAVORITE</PixelText>
           {player ? (
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 48, height: 48, backgroundColor: WK.tealCard, borderWidth: 2, borderColor: WK.yellow, alignItems: 'center', justifyContent: 'center' }}>
                   <PixelText size={10} color={WK.yellow}>{player.name[0].toUpperCase()}</PixelText>
                </View>
                <View style={{ flex: 1 }}>
                   <PixelText size={8}>{player.name.toUpperCase()}</PixelText>
                   <BodyText size={12} color={WK.dim}>OVR {player.overallRating} · {player.position}</BodyText>
                </View>
             </View>
           ) : (
             <BodyText size={12} color={WK.dim}>No favorite player established yet.</BodyText>
           )}
        </View>

        {/* Recent Events */}
        <View>
          <PixelText size={7} color={WK.yellow} style={{ marginBottom: 12 }}>RECENT EVENTS</PixelText>
          {recentEvents.length > 0 ? (
            recentEvents.map((event) => (
              <View key={event.id} style={{
                backgroundColor: WK.tealDark,
                borderBottomWidth: 1,
                borderBottomColor: WK.border,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <BodyText size={12}>{event.description}</BodyText>
                  <PixelText size={5} dim>WEEK {event.weekNumber}</PixelText>
                </View>
                <PixelText size={7} color={event.impact >= 0 ? WK.green : WK.red}>
                  {event.impact >= 0 ? `+${event.impact}` : event.impact}
                </PixelText>
              </View>
            ))
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
               <BodyText size={12} color={WK.dim}>No recent major events recorded.</BodyText>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

import { View } from 'react-native';
import { PixelText } from '@/components/ui/PixelText';
import { WK, pixelShadow } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchPlayerRow {
  id: string;
  name: string;
  position: string;
  rating: number;
  goals: number;
  assists: number;
}

export interface MatchResultContentData {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  /** Present for AMP matches only. */
  homeAvgRating?: number;
  /** Present for AMP matches only. */
  awayAvgRating?: number;
  /** Present for AMP matches only (from inbox metadata). */
  homePlayers?: MatchPlayerRow[];
  /** Present for AMP matches only (from inbox metadata). */
  awayPlayers?: MatchPlayerRow[];
  /** Used to colour-code the AMP team header and determine win/loss/draw colour. */
  ampClubName: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RatingPip({ rating }: { rating: number }) {
  const color =
    rating >= 8 ? WK.yellow :
    rating >= 6 ? WK.green  :
    rating >= 4 ? WK.tealLight : WK.dim;
  return (
    <PixelText size={18} variant="vt323" color={color}>
      {rating.toFixed(1)}
    </PixelText>
  );
}

function TeamTable({
  teamName,
  players,
  avgRating,
  isAmp,
}: {
  teamName: string;
  players: MatchPlayerRow[];
  avgRating: number;
  isAmp: boolean;
}) {
  const scorers   = players.filter((p) => p.goals > 0)
    .map((p) => `${p.name}${p.goals > 1 ? ` (${p.goals})` : ''}`).join(', ');
  const assisters = players.filter((p) => p.assists > 0)
    .map((p) => `${p.name}${p.assists > 1 ? ` (${p.assists})` : ''}`).join(', ');

  return (
    <View style={{ marginTop: 14 }}>
      {/* Team header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 10, paddingVertical: 8,
        backgroundColor: isAmp ? WK.tealMid : WK.tealDark,
        borderWidth: 2, borderColor: isAmp ? WK.tealLight : WK.border,
      }}>
        <PixelText size={9} color={isAmp ? WK.yellow : WK.text}>
          {teamName.toUpperCase()}
        </PixelText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <PixelText size={8} color={WK.dim}>AVG</PixelText>
          <RatingPip rating={avgRating} />
        </View>
      </View>

      {/* Goalscorers / assists summary */}
      {(scorers || assisters) && (
        <View style={{
          paddingHorizontal: 10, paddingVertical: 6,
          backgroundColor: WK.tealDark,
          borderWidth: 2, borderTopWidth: 0, borderColor: WK.border,
        }}>
          {scorers ? (
            <View style={{
              flexDirection: 'row', gap: 6, flexWrap: 'wrap',
              marginBottom: assisters ? 4 : 0,
            }}>
              <PixelText size={8} color={WK.yellow}>GLS</PixelText>
              <PixelText size={8} color={WK.text} style={{ flex: 1 }}>{scorers}</PixelText>
            </View>
          ) : null}
          {assisters ? (
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <PixelText size={8} color={WK.tealLight}>AST</PixelText>
              <PixelText size={8} color={WK.dim} style={{ flex: 1 }}>{assisters}</PixelText>
            </View>
          ) : null}
        </View>
      )}

      {/* Column header */}
      <View style={{
        flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 5,
        backgroundColor: WK.border,
      }}>
        {(['POS', 'NAME', 'RTG', 'G', 'A'] as const).map((col, i) => (
          <PixelText
            key={col}
            size={7}
            color={WK.dim}
            style={{ flex: col === 'NAME' ? 3 : 1, textAlign: i === 0 ? 'left' : 'center' }}
          >
            {col}
          </PixelText>
        ))}
      </View>

      {/* Player rows */}
      {players.map((p, idx) => (
        <View
          key={p.id}
          style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 10, paddingVertical: 6,
            backgroundColor: idx % 2 === 0 ? WK.tealCard : WK.tealDark,
            borderWidth: 1, borderTopWidth: 0, borderColor: WK.border,
          }}
        >
          <PixelText size={8} color={WK.dim} style={{ flex: 1 }}>{p.position}</PixelText>
          <PixelText size={8} color={WK.text} style={{ flex: 3 }} numberOfLines={1}>{p.name}</PixelText>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <RatingPip rating={p.rating} />
          </View>
          <PixelText
            size={8}
            color={p.goals > 0 ? WK.yellow : WK.dim}
            style={{ flex: 1, textAlign: 'center' }}
          >
            {p.goals > 0 ? String(p.goals) : '—'}
          </PixelText>
          <PixelText
            size={8}
            color={p.assists > 0 ? WK.tealLight : WK.dim}
            style={{ flex: 1, textAlign: 'center' }}
          >
            {p.assists > 0 ? String(p.assists) : '—'}
          </PixelText>
        </View>
      ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MatchResultContent({ data }: { data: MatchResultContentData }) {
  const {
    homeTeamName, awayTeamName,
    homeScore, awayScore,
    homeAvgRating, awayAvgRating,
    homePlayers, awayPlayers,
    ampClubName,
  } = data;

  const ampIsHome    = homeTeamName === ampClubName;
  const ampIsAway    = awayTeamName === ampClubName;
  const ampIsPlaying = ampIsHome || ampIsAway;
  const ampGoals     = ampIsHome ? homeScore : awayScore;
  const oppGoals     = ampIsHome ? awayScore : homeScore;
  const outcomeColor = !ampIsPlaying
    ? WK.tealLight
    : ampGoals > oppGoals ? WK.green
    : ampGoals < oppGoals ? WK.red
    : WK.orange;

  const hasPlayers = !!(
    homePlayers && homePlayers.length > 0 &&
    awayPlayers && awayPlayers.length > 0
  );

  return (
    <View style={{ borderWidth: 3, borderColor: outcomeColor, ...pixelShadow }}>
      {/* Score banner */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 14, paddingHorizontal: 16, gap: 16,
        backgroundColor: WK.tealDark,
      }}>
        <PixelText
          size={10} color={WK.text}
          style={{ flex: 1, textAlign: 'right' }}
          numberOfLines={1}
        >
          {homeTeamName.toUpperCase()}
        </PixelText>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: WK.border, paddingHorizontal: 14, paddingVertical: 8,
          borderWidth: 2, borderColor: outcomeColor,
        }}>
          <PixelText size={22} variant="vt323" color={outcomeColor}>{homeScore}</PixelText>
          <PixelText size={18} variant="vt323" color={WK.dim}>–</PixelText>
          <PixelText size={22} variant="vt323" color={outcomeColor}>{awayScore}</PixelText>
        </View>
        <PixelText
          size={10} color={WK.text}
          style={{ flex: 1 }}
          numberOfLines={1}
        >
          {awayTeamName.toUpperCase()}
        </PixelText>
      </View>

      {/* Team tables — AMP matches only */}
      {hasPlayers && (
        <View style={{ padding: 10 }}>
          <TeamTable
            teamName={homeTeamName}
            players={homePlayers!}
            avgRating={homeAvgRating ?? 0}
            isAmp={homeTeamName === ampClubName}
          />
          <TeamTable
            teamName={awayTeamName}
            players={awayPlayers!}
            avgRating={awayAvgRating ?? 0}
            isAmp={awayTeamName === ampClubName}
          />
        </View>
      )}
    </View>
  );
}

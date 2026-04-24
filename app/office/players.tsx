// Player market archived — players are now discovered via scouting missions.
// See app/market/players.tsx.archived for the original implementation.
import { Redirect } from 'expo-router';
export default function MarketPlayersRedirect() {
  return <Redirect href="/(tabs)/market" />;
}

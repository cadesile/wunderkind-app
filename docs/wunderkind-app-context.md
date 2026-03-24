# Wunderkind Factory — React Native App Context

> Last updated: 2026-03-24 08:17:42

## Overview
Expo-managed React Native app for **The Wunderkind Factory** — a football academy
management strategy game. Offline-first, client-authoritative weekly tick engine,
Zustand state management, NativeWind v4 styling, Symfony backend sync.

---

## Technology Stack

| Layer | Tech |
|---|---|
| Framework | Expo SDK 54 (managed, Expo Go compatible) |
| Navigation | Expo Router v4 (file-based, `app/` directory) |
| State | Zustand + AsyncStorage persist middleware |
| API / Sync | TanStack Query v5 (offline mutations) |
| Styling | NativeWind v4 (Tailwind CSS for React Native) |
| Language | TypeScript |
| Icons | Lucide React Native + react-native-svg |
| Font | Press Start 2P (pixel-art) |

---

## npm Dependencies

```json
// dependencies
@expo-google-fonts/press-start-2p: ^0.4.1
@react-native-async-storage/async-storage: ^2.1.2
@tanstack/react-query: ^5.67.3
expo: ~54.0.0
expo-asset: ~12.0.12
expo-constants: ~18.0.13
expo-font: ^14.0.11
expo-haptics: ~15.0.8
expo-linking: ~8.0.11
expo-router: ~6.0.23
expo-splash-screen: ~31.0.13
expo-status-bar: ~3.0.9
expo-web-browser: ~15.0.10
lucide-react-native: ^0.475.0
nativewind: ^4.2.2
react: 19.1.0
react-dom: ^19.1.0
react-native: 0.81.5
react-native-reanimated: ~4.1.1
react-native-safe-area-context: ~5.6.0
react-native-screens: ~4.16.0
react-native-svg: 15.12.1
react-native-web: ^0.21.2
react-native-worklets: 0.5.1
zustand: ^5.0.3
// devDependencies
@types/react: ~19.1.0
tailwindcss: 3.3.2
typescript: ~5.9.2
```

---

## Project Structure

```
app/
├── (tabs)/
│   ├── _layout.tsx
│   ├── advance.tsx
│   ├── coaches.tsx
│   ├── facilities.tsx
│   ├── finances.tsx
│   ├── home.tsx
│   ├── inbox.tsx
│   ├── index.tsx
│   ├── market.tsx
│   └── squad.tsx
├── coach/
│   └── [id].tsx
├── market/
│   ├── _layout.tsx
│   ├── coaches.tsx
│   ├── index.tsx
│   ├── players.tsx
│   ├── players.tsx.archived
│   └── scouts.tsx
├── player/
│   └── [id].tsx
├── scout/
│   └── [id].tsx
├── _layout.tsx
└── game-over.tsx
src/
├── api/
│   ├── endpoints/
│   │   ├── academy.ts
│   │   ├── archetypes.ts
│   │   ├── auth.ts
│   │   ├── events.ts
│   │   ├── facilities.ts
│   │   ├── gameConfig.ts
│   │   ├── inbox.ts
│   │   ├── leaderboard.ts
│   │   ├── market.ts
│   │   ├── marketData.ts
│   │   ├── prospects.ts
│   │   ├── squad.ts
│   │   ├── staff.ts
│   │   └── sync.ts
│   ├── mutations/
│   │   ├── marketMutations.ts
│   │   └── syncMutations.ts
│   ├── client.ts
│   └── syncQueue.ts
├── components/
│   ├── radar/
│   │   ├── AttributesRadar.tsx
│   │   └── PersonalityRadar.tsx
│   ├── ui/
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── DevelopmentChart.tsx
│   │   ├── FlagText.tsx
│   │   ├── PitchBackground.tsx
│   │   ├── PixelAvatar.tsx
│   │   ├── PixelDialog.tsx
│   │   ├── PixelText.tsx
│   │   ├── PixelTopTabBar.tsx
│   │   └── SwipeConfirm.tsx
│   ├── AcademyDashboard.tsx
│   ├── ArchetypeBadge.tsx
│   ├── AssignMissionOverlay.tsx
│   ├── GlobalHeader.tsx
│   ├── OnboardingScreen.tsx
│   ├── ScoutReportCard.tsx
│   ├── SyncStatusIndicator.tsx
│   ├── WeeklyTickOverlay.tsx
│   └── WelcomeSplash.tsx
├── constants/
│   ├── archetypes.ts
│   └── theme.ts
├── engine/
│   ├── agentOffers.ts
│   ├── appearance.ts
│   ├── archetypeEngine.ts
│   ├── CoachPerception.ts
│   ├── CoachValuation.ts
│   ├── DevelopmentService.ts
│   ├── finance.ts
│   ├── GameLoop.ts
│   ├── MoraleEngine.ts
│   ├── personality.ts
│   ├── ReactionHandler.ts
│   ├── recruitment.ts
│   ├── RelationshipService.ts
│   ├── ScoutingService.ts
│   ├── SimulationService.ts
│   └── SocialGraphEngine.ts
├── hooks/
│   ├── useAcademyMetrics.ts
│   ├── useArchetypeSync.ts
│   ├── useAuthFlow.ts
│   ├── useGameConfigSync.ts
│   ├── useNarrativeSync.ts
│   ├── useProspectSync.ts
│   └── useSyncStatus.ts
├── stores/
│   ├── academyStore.ts
│   ├── activeEffectStore.ts
│   ├── altercationStore.ts
│   ├── archetypeStore.ts
│   ├── authStore.ts
│   ├── coachStore.ts
│   ├── eventStore.ts
│   ├── facilityStore.ts
│   ├── financeStore.ts
│   ├── gameConfigStore.ts
│   ├── inboxStore.ts
│   ├── interactionStore.ts
│   ├── loanStore.ts
│   ├── lossConditionStore.ts
│   ├── marketStore.ts
│   ├── narrativeStore.ts
│   ├── prospectPoolStore.ts
│   ├── resetAllStores.ts
│   ├── scoutStore.ts
│   ├── squadStore.ts
│   └── tickProgressStore.ts
├── types/
│   ├── academy.ts
│   ├── api.ts
│   ├── archetype.ts
│   ├── coach.ts
│   ├── facility.ts
│   ├── finance.ts
│   ├── game.ts
│   ├── gameConfig.ts
│   ├── interaction.ts
│   ├── market.ts
│   ├── narrative.ts
│   └── player.ts
└── utils/
    ├── agentOfferHandlers.ts
    ├── currency.ts
    ├── facilityUpkeep.ts
    ├── gameDate.ts
    ├── haptics.ts
    ├── morale.ts
    ├── nationality.ts
    ├── scoutingCost.ts
    ├── scoutingRegions.ts
    ├── storage.ts
    └── uuidv7.ts
scripts/
├── dev-proxy.py
└── generate_project_context.sh*
docs/
└── wunderkind-app-context.md

21 directories, 134 files
```

---

## Navigation Architecture

### Tab Routes (`app/(tabs)/`)

- `_layout` — 
- `advance` — 
- `coaches` — 
- `facilities` — 
- `finances` — 
- `home` — 
- `inbox` — 
- `index` — 
- `market` — 
- `squad` — 

### Other Routes

- `app/coach/[id].tsx`
- `app/game-over.tsx`
- `app/market/coaches.tsx`
- `app/market/index.tsx`
- `app/market/players.tsx`
- `app/market/scouts.tsx`
- `app/player/[id].tsx`
- `app/scout/[id].tsx`

---

## Zustand Stores (`src/stores/`)

### academyStore

```typescript
interface AcademyState {
// Actions:
  if (reputation >= 75) return 'Elite';
  if (reputation >= 40) return 'National';
  if (reputation >= 15) return 'Regional';
  academy: Academy;
  managerPersonality: ManagerPersonality | null;
  setName: (name: string) => void;
  setReputation: (delta: number) => void;
  addEarnings: (amount: number) => void;
  addBalance: (amount: number) => void;
  setBalance: (balance: number) => void;
  setCreatedAt: (date: string) => void;
  setSponsorIds: (ids: string[]) => void;
  setInvestorId: (id: string | null) => void;
  setCountry: (country: Academy['country']) => void;
  incrementWeek: () => void;
  rollbackWeek: (weekNumber: number) => void;
  applyServerSync: (data: { reputation: number; totalCareerEarnings: number; hallOfFamePoints: number }) => void;
  syncWithApi: (data: AcademyStatusResponse) => void;
  updateFromSyncResponse: (data: SyncAcceptedResponse['academy']) => void;
  managerProfile: ManagerProfile | null;
```

### activeEffectStore

```typescript
interface ActiveEffectState {
// Actions:
  effects: ActiveEffect[];
  addEffect: (effect: ActiveEffect) => void;
  removeEffect: (id: string) => void;
  decrementAllTicks: () => ActiveEffect[];
  getEffectsForEntity: (entityId: string) => ActiveEffect[];
  clearAll: () => void;
  persist(
      effects: [],
      addEffect: (effect) =>
        set((state) => ({ effects: [...state.effects, effect] })),
      removeEffect: (id) =>
        set((state) => ({ effects: state.effects.filter((e) => e.id !== id) })),
      decrementAllTicks: () => {
        set((state) => {
              if (e.ticksRemaining <= 0) {
      getEffectsForEntity: (entityId) =>
        get().effects.filter((e) => e.affectedEntityId === entityId),
      clearAll: () => set({ effects: [] }),
```

### altercationStore

```typescript
interface AltercationState {
// Actions:
  pendingBlocks: AltercationBlock[];
  addBlock: (block: AltercationBlock) => void;
  resolveBlock: (playerAId: string, playerBId: string) => void;
  clearAll: () => void;
  persist(
      pendingBlocks: [],
      addBlock: (block) =>
        set((state) => {
          if (already) return state;
      resolveBlock: (playerAId, playerBId) =>
        set((state) => ({
          pendingBlocks: state.pendingBlocks.filter(
      clearAll: () => set({ pendingBlocks: [] }),
      name: 'altercation-store',
      storage: createJSONStorage(() => AsyncStorage),
```

### archetypeStore

```typescript
interface ArchetypeState {
// Actions:
  archetypes: PlayerArchetype[];
  versionHash: string | null;
  isLoading: boolean;
  lastFetched: number | null;
  loadFromCache: () => void;
  fetchArchetypes: (forceRefresh?: boolean) => Promise<void>;
  clearCache: () => void;
  persist(
      archetypes: DEFAULT_ARCHETYPES,
      versionHash: null,
      isLoading: false,
      lastFetched: null,
      loadFromCache: () => {
      fetchArchetypes: async (forceRefresh = false) => {
        if (isLoading) return;
        if (!forceRefresh && lastFetched && Date.now() - lastFetched < CACHE_TTL_MS) return;
        set({ isLoading: true });
          if (!forceRefresh && versionHash) {
            if (serverHash && serverHash === versionHash) {
              set({ isLoading: false, lastFetched: Date.now() });
```

### authStore

```typescript
interface AuthState {
// Actions:
  token: string | null;
  email: string | null;
  userId: string | null;
  setToken: (token: string) => void;
  setCredentials: (email: string, password: string) => void;
  setUserId: (id: string) => void;
  clearAuth: () => void;
  persist(
      token: null,
      email: null,
      password: null,
      userId: null,
      setToken: (token) => set({ token }),
      setCredentials: (email, password) => set({ email, password }),
      setUserId: (userId) => set({ userId }),
      clearAuth: () => set({ token: null, email: null, password: null, userId: null }),
```

### coachStore

```typescript
interface CoachState {
// Actions:
  coaches: Coach[];
  addCoach: (coach: Coach) => void;
  removeCoach: (id: string) => void;
  updateCoach: (id: string, changes: Partial<Coach>) => void;
  updateMorale: (coachId: string, delta: number) => void;
  setLowMoraleFlags: () => void;
  persist(
      coaches: [],
      addCoach: (coach) =>
        set((state) => ({ coaches: [...state.coaches, coach] })),
      removeCoach: (id) =>
        set((state) => ({ coaches: state.coaches.filter((c) => c.id !== id) })),
      updateCoach: (id, changes) =>
        set((state) => ({
          coaches: state.coaches.map((c) => c.id === id ? { ...c, ...changes } : c),
      updateMorale: (coachId, delta) =>
        set((state) => ({
          coaches: state.coaches.map((c) =>
      setLowMoraleFlags: () =>
        set((state) => ({
```

### eventStore

```typescript
interface EventState {
// Actions:
  templates: GameEventTemplate[];
  lastFetchedAt: string | null;
  setTemplates: (templates: GameEventTemplate[]) => void;
  getTemplateBySlug: (slug: string) => GameEventTemplate | undefined;
  getTemplatesByCategory: (category: EventCategory) => GameEventTemplate[];
  getWeightedRandomTemplate: (category?: EventCategory) => GameEventTemplate | null;
  shouldRefetch: () => boolean;
  persist(
      templates: [],
      lastFetchedAt: null,
      setTemplates: (templates) =>
        set({ templates, lastFetchedAt: new Date().toISOString() }),
      getTemplateBySlug: (slug) =>
        get().templates.find((t) => t.slug === slug),
      getTemplatesByCategory: (category) =>
        get().templates.filter((t) => t.category === category),
      getWeightedRandomTemplate: (category) => {
        if (eligible.length === 0) return null;
        for (const template of eligible) {
          if (rand <= 0) return template;
```

### facilityStore

```typescript
interface FacilityState {
// Actions:
  technicalZone:  0,
  strengthSuite:  0,
  tacticalRoom:   0,
  physioClinic:   0,
  hydroPool:      0,
  scoutingCenter: 0,
  technicalZone:  100,
  strengthSuite:  100,
  tacticalRoom:   100,
  physioClinic:   100,
  hydroPool:      100,
  scoutingCenter: 100,
  if (!def || currentLevel >= MAX_LEVEL) return Infinity;
  return (currentLevel + 1) * def.baseCost;
  levels: FacilityLevels;
  conditions: FacilityConditions;
  upgradeLevel: (type: FacilityType) => boolean;
  initAllLevels: () => void;
  decayCondition: () => void;
  repairFacility: (type: FacilityType) => void;
```

### financeStore

```typescript
interface FinanceState {
// Actions:
  transactions: FinancialTransaction[];
  transfers: TransferRecord[];
  addTransaction: (tx: Omit<FinancialTransaction, 'id' | 'timestamp'>) => void;
  getRecentHistory: (weeks?: number) => FinancialTransaction[];
  getTransactionsByCategory: (category: FinancialCategory, weeks?: number) => FinancialTransaction[];
  getTotalByCategory: (category: FinancialCategory, weeks?: number) => number;
  clearOldTransactions: () => void;
  addTransfer: (record: Omit<TransferRecord, 'id'>) => void;
  persist(
      transactions: [],
      transfers: [],
      addTransaction: (tx) => {
          id: uuidv7(),
          timestamp: new Date().toISOString(),
        set((state) => ({
          transactions: [newTx, ...state.transactions].slice(0, MAX_TRANSACTIONS),
      getRecentHistory: (weeks = ROLLING_WEEKS) => {
      getTransactionsByCategory: (category, weeks = ROLLING_WEEKS) =>
        get().getRecentHistory(weeks).filter((tx) => tx.category === category),
      getTotalByCategory: (category, weeks = ROLLING_WEEKS) =>
```

### gameConfigStore

```typescript
interface GameConfigState {
// Actions:
  config: GameConfig;
  lastFetchedAt: string | null;
  setConfig: (config: GameConfig) => void;
  shouldRefetch: () => boolean;
  persist(
      config: DEFAULT_GAME_CONFIG,
      lastFetchedAt: null,
      setConfig: (config) =>
        set({ config, lastFetchedAt: new Date().toISOString() }),
      shouldRefetch: () => {
        if (!lastFetchedAt) return true;
```

### inboxStore

```typescript
export type InboxMessageType = 'guardian' | 'agent' | 'sponsor' | 'investor' | 'system';
export interface InboxMessage {
export interface GuardianMessage {
interface InboxState {
// Actions:
  id: string;
  type: InboxMessageType;
  week: number;
  subject: string;
  body: string;
  isRead: boolean;
  id: string;
  guardianId: string;
  playerId: string;
  week: number;
  subject: string;
  body: string;
  isRead: boolean;
  requiresResponse: boolean;
  messages: InboxMessage[];
  incidents: BehavioralIncident[];
  agentOffers: AgentOffer[];
  addMessage: (msg: InboxMessage) => void;
  markRead: (id: string) => void;
  respond: (id: string, response: 'accepted' | 'rejected') => void;
```

### interactionStore

```typescript
interface InteractionState {
// Actions:
  records: InteractionRecord[];
  cliques: Clique[];
  dressingRoomHealth: DressingRoomHealth | null;
  groupSessionLog: GroupSessionEntry[];
  logInteraction: (record: Omit<InteractionRecord, 'id' | 'timestamp'>) => void;
  getRecordsForEntity: (entityId: string) => InteractionRecord[];
  getRecordsBetween: (idA: string, idB: string) => InteractionRecord[];
  getVisibleRecords: (entityId: string, limit?: number) => InteractionRecord[];
  getRecentGroupSessions: (
    targetType: 'squad' | 'staff',
    withinWeeks: number,
  logGroupSession: (entry: GroupSessionEntry) => void;
  updateCliques: (cliques: Clique[]) => void;
  updateDressingRoomHealth: (health: DressingRoomHealth) => void;
  renameClique: (cliqueId: string, name: string) => void;
  persist(
      records: [],
      cliques: [],
      dressingRoomHealth: null,
      groupSessionLog: [],
```

### loanStore

```typescript
interface LoanState {
// Actions:
  if (reputation >= 90) return 500_000;
  if (reputation >= 70) return 200_000;
  if (reputation >= 50) return 100_000;
  if (reputation >= 30) return 50_000;
  loans: Loan[];
  takeLoan: (amount: number, currentWeek: number, reputation: number) => Loan | Error;
  totalWeeklyRepayment: () => number;
  processWeeklyRepayments: () => void;
  persist(
      loans: [],
      takeLoan: (amount, currentWeek, reputation) => {
        if (amount > limit) {
        if (amount <= 0) {
          id: uuidv7(),
          interestRate: INTEREST_RATE,
          weeksRemaining: LOAN_WEEKS,
          takenWeek: currentWeek,
        set((state) => ({ loans: [...state.loans, loan] }));
      totalWeeklyRepayment: () =>
        get().loans.reduce((sum, l) => sum + l.weeklyRepayment, 0),
```

### lossConditionStore

```typescript
export type LossConditionType = 'insolvency' | 'talent_drain';
interface AtRiskEntry {
interface LossConditionState {
// Actions:
  weeksNegativeBalance: number;
  weeksUnderCoachRatio: number;
  weeksCoachesWithFewPlayers: number;
  atRiskPlayers: Record<string, AtRiskEntry>;
  atRiskCoaches: Record<string, AtRiskEntry>;
  lossCondition: LossConditionType | null;
  pendingNewGame: boolean;
  setWeeksNegativeBalance: (n: number) => void;
  setWeeksUnderPlayerFloor: (n: number) => void;
  setWeeksUnderCoachRatio: (n: number) => void;
  setWeeksCoachesWithFewPlayers: (n: number) => void;
  setAtRiskPlayer: (id: string, entry: AtRiskEntry) => void;
  removeAtRiskPlayer: (id: string) => void;
  setAtRiskCoach: (id: string, entry: AtRiskEntry) => void;
  removeAtRiskCoach: (id: string) => void;
  triggerGameOver: (condition: LossConditionType) => void;
  requestNewGame: () => void;
  clearNewGameRequest: () => void;
  resetAll: () => void;
  weeksNegativeBalance: 0,
```

### marketStore

```typescript
interface MarketState {
// Actions:
  if (roll < 0.70) {
  players: MarketPlayer[];
  coaches: MarketCoach[];
  marketScouts: MarketScout[];
  agents: Agent[];
  sponsors: Sponsor[];
  investors: Investor[];
  lastFetchedAt: string | null;
  isLoading: boolean;
  error: string | null;
  setMarketData: (data: MarketData) => void;
  fetchMarketData: () => Promise<void>;
  refreshMarketPool: () => Promise<void>;
  removeFromMarket: (entityType: 'player' | 'coach' | 'scout', id: string) => void;
  updateMarketPlayer: (id: string, changes: Partial<MarketPlayer>) => void;
  addMarketPlayer: (player: MarketPlayer) => void;
  signPlayer: (playerId: string) => void;
  rejectPlayer: (playerId: string) => void;
  hireCoach: (coachId: string, weekNumber: number) => void;
  hireScout: (scoutId: string, weekNumber: number) => void;
```

### narrativeStore

```typescript
interface NarrativeState {
// Actions:
  messages: NarrativeMessage[];
  addMessage: (message: NarrativeMessage) => void;
  markAsRead: (id: string) => void;
  markAsResponded: (id: string) => void;
  deleteMessage: (id: string) => void;
  markAllRead: () => void;
  clearDeletable: () => void;
  unreadCount: () => number;
  getActionableMessages: () => NarrativeMessage[];
  clearAll: () => void;
  persist(
      messages: [],
      addMessage: (message) =>
        set((state) => ({ messages: [message, ...state.messages] })),
      markAsRead: (id) =>
        set((state) => ({
          messages: state.messages.map((m) =>
      markAsResponded: (id) =>
        set((state) => ({
          messages: state.messages.map((m) =>
```

### prospectPoolStore

```typescript
interface ProspectPoolState {
// Actions:
  prospects: MarketPlayer[];
  consumedIds: string[];
  lastFetchedAt: string | null;
  isLoading: boolean;
  shouldRefetch: () => boolean;
  setProspects: (incoming: MarketPlayer[]) => void;
  fetchProspects: () => Promise<void>;
  consumeProspect: (id: string) => void;
  persist(
      prospects: [],
      consumedIds: [],
      lastFetchedAt: null,
      isLoading: false,
      shouldRefetch: () => {
        if (!lastFetchedAt) return true;
      setProspects: (incoming) => {
        set((state) => ({
          prospects: [...state.prospects, ...freshOnes],
          lastFetchedAt: new Date().toISOString(),
      fetchProspects: async () => {
```

### resetAllStores

```typescript
// Actions:
    academy: {
      id: 'academy-1',
      name: '',
      foundedWeek: 1,
      weekNumber: 1,
      reputation: 0,
      reputationTier: 'Local',
      totalCareerEarnings: 0,
      hallOfFamePoints: 0,
      squadSize: 0,
      staffCount: 1,
      balance: 0,
      createdAt: '',
      sponsorIds: [],
      investorId: null,
      country: null,
      lastRepActivityWeek: 1,
    managerPersonality: null,
  resetInMemoryStores();
```

### scoutStore

```typescript
interface ScoutState {
// Actions:
  scouts: Scout[];
  addScout: (scout: Scout) => void;
  removeScout: (id: string) => void;
  updateScout: (id: string, changes: Partial<Scout>) => void;
  assignPlayer: (scoutId: string, playerId: string) => void;
  removeAssignment: (scoutId: string, playerId: string) => void;
  getWorkload: (scoutId: string) => number;
  updateMorale: (scoutId: string, delta: number) => void;
  assignMission: (scoutId: string, mission: ScoutingMission) => void;
  tickMission: (scoutId: string) => void;
  incrementGemsFound: (scoutId: string, count: number) => void;
  completeMission: (scoutId: string) => void;
  cancelMission: (scoutId: string) => void;
  persist(
      scouts: [],
      addScout: (scout) =>
        set((state) => ({ scouts: [...state.scouts, scout] })),
      removeScout: (id) =>
        set((state) => ({ scouts: state.scouts.filter((s) => s.id !== id) })),
      updateScout: (id, changes) =>
```

### squadStore

```typescript
export interface PlayerDevelopmentUpdate {
interface SquadState {
// Actions:
  attributes: PlayerAttributes;
  overallRating: number;
  players: Player[];
  addPlayer: (player: Player) => void;
  removePlayer: (id: string) => void;
  setPlayers: (players: Player[]) => void;
  updatePlayer: (id: string, changes: Partial<Player>) => void;
  updateTrait: (playerId: string, trait: TraitName, delta: number) => void;
  assignCoach: (playerId: string, coachId: string) => void;
  updateMorale: (playerId: string, delta: number) => void;
  applyWeeklyPlayerUpdates: (
    traitShifts: Record<string, Partial<PersonalityMatrix>>,
    devUpdates: Record<string, PlayerDevelopmentUpdate>,
  applyTraitShifts: (shifts: Record<string, Partial<PersonalityMatrix>>) => void;
  generateStarterSquad: () => void;
  setDevelopmentFocus: (
    playerId: string,
    focus: Player['developmentFocus'] | null,
  setPlayerInjury: (playerId: string, injury: NonNullable<Player['injury']>) => void;
  clearPlayerInjury: (playerId: string) => void;
```

### tickProgressStore

```typescript
interface TickProgressState {
// Actions:
  isProcessing: boolean;
  startTick: () => void;
  endTick: () => void;
  isProcessing: false,
  startTick: () => set({ isProcessing: true }),
  endTick:   () => set({ isProcessing: false }),
```


---

## Game Engine (`src/engine/`)

### agentOffers

```typescript
export function generateDestinationClub(): string {
export function generateAgentOffer(
```

### appearance

```typescript
export function generateAppearance(
export function getAppearanceFacialHair(appearance: Appearance): FacialHair {
```

### archetypeEngine

```typescript
export function getArchetypeForPlayer(
export function getAllArchetypeMatches(
```

### CoachPerception

```typescript
export interface CoachOpinion {
export function getCoachPerception(player: MarketPlayer, coach: Coach): CoachOpinion {
export function getHeadCoach(coaches: Coach[]): Coach | null {
```

### CoachValuation

```typescript
export interface CoachOpinion {
export function getCoachOpinion(player: MarketPlayer, coach: Coach): CoachOpinion {
```

### DevelopmentService

```typescript
export function computeCoachPerformanceScore(coach: Coach): number {
export function checkBreakthroughSpike(
export function computePlayerDevelopment(
```

### finance

```typescript
export function calculateNetSalePrice(
export function calculateWeeklyFinances(
```

### GameLoop

```typescript
export function processWeeklyTick(): WeeklyTick {
```

### MoraleEngine

```typescript
export function processMoraleAndRelationships(): void {
```

### personality

```typescript
export const TRAIT_NAMES: TraitName[] = [
export function generateAttributes(position: Position): PlayerAttributes {
export function generatePersonality(): PersonalityMatrix {
export function generatePlayer(position: Position, currentGameDate: Date): Player {
export function calculateTraitShifts(player: Player): Partial<PersonalityMatrix> {
export function generateIncidents(
```

### ReactionHandler

```typescript
export const reactionHandler = new ReactionHandler();
```

### recruitment

```typescript
export function generateProspect(currentGameDate: Date, position?: Position): Player {
export function generateCoachProspect(currentWeek: number): Coach {
export function generateCoachProspects(count: number, currentWeek: number): Coach[] {
export function generatePlayerProspects(count: number, currentGameDate: Date): Player[] {
export function generateScout(currentWeek: number): Scout {
export function generateScoutProspects(count: number, currentWeek: number): Scout[] {
```

### RelationshipService

```typescript
export function clamp(value: number, min: number, max: number): number {
export function getRelationshipValue(entity: RelationshipEntity, targetId: string): number {
export function hasNegativeRelations(entity: RelationshipEntity): boolean {
export function updatePlayerRelationship(
export function updateCoachRelationship(
export function processWeeklyMoraleDecay(): void {
export function processOrganicRelationshipGrowth(): void {
```

### ScoutingService

```typescript
export function assignScoutToPlayer(scoutId: string, playerId: string): boolean {
export function removeScoutAssignment(scoutId: string, playerId: string): void {
export function getScoutWorkload(scoutId: string): number {
export function processScoutingTasks(): void {
export function processMissions(): void {
export function refreshMarketOffers(): void {
```

### SimulationService

```typescript
export const simulationService = new SimulationService();
```

### SocialGraphEngine

```typescript
export function processSocialGraph(): void {
```


---

## TypeScript Types (`src/types/`)

### academy

```typescript
export interface ManagerProfile {
export type ReputationTier = 'Local' | 'Regional' | 'National' | 'Elite';
export interface ManagerPersonality {
export interface Academy {
```

### api

```typescript
export type { MarketDataResponse } from './market';
export interface AcademyStatusResponse {
export interface SquadResponse {
export interface ApiPlayerDetail {
export interface StaffResponse {
export interface ApiStaffMember {
export interface FacilitiesResponse {
export interface ApiFacilityData {
export interface FacilityUpgradeResponse {
export interface ApiInboxResponse {
export interface ApiInboxMessage {
export interface ManagerProfileInput {
export interface RegisterRequest {
export interface RegisterResponse {
export interface LoginRequest {
export interface LoginResponse {
export interface SyncTransfer {
export interface SyncLedgerEntry {
export interface SyncRequest {
export interface SyncAcceptedResponse {
```

### archetype

```typescript
export interface PlayerArchetype {
export interface ArchetypeCache {
export interface ArchetypeMatch {
```

### coach

```typescript
export type CoachRole =
export type CoachSpecialism = 'pace' | 'technical' | 'vision' | 'power' | 'stamina' | 'heart';
export type CoachSpecialisms = Partial<Record<CoachSpecialism, number>>;
export interface Coach {
```

### facility

```typescript
export type FacilityType =
export type FacilityLevels = Record<FacilityType, number>;
export type FacilityConditions = Record<FacilityType, number>;
export interface FacilityMeta {
```

### finance

```typescript
export type FinancialCategory =
export interface FinancialTransaction {
export interface TransferRecord {
```

### game

```typescript
export interface AltercationBlock {
export interface WeeklyTick {
export interface FinancialRecord {
export interface ExpenseItem {
export interface BehavioralIncident {
```

### gameConfig

```typescript
export interface GameConfig {
```

### interaction

```typescript
export type CliquePaletteColor = 'coral' | 'sky' | 'lilac' | 'amber';
export type AmpPlayerSubtype =
export type AmpCoachSubtype =
export type AmpGroupSubtype =
export type NpcTrainingIncidentSubtype =
export type SystemSubtype =
export type InteractionCategory =
export type InteractionSubtype =
export interface InteractionRecord {
export interface Clique {
export interface DressingRoomHealth {
export interface GroupSessionEntry {
```

### market

```typescript
export interface ScoutingMission {
export interface Agent {
export interface Scout {
export type CompanySize = 'SMALL' | 'MEDIUM' | 'LARGE';
export interface Sponsor {
export interface Investor {
export interface Loan {
export interface MarketDataResponse {
export interface MarketPlayer {
export interface MarketCoach {
export interface MarketScout {
export interface ScoutingTask {
export interface MarketData {
export interface AcademyInitResponse {
```

### narrative

```typescript
export enum EventCategory {
export enum TargetType {
export enum StatOperator {
export enum RelationshipType {
export interface SelectionLogic {
export interface StatChange {
export interface Relationship {
export interface DurationConfig {
export interface ManagerShift {
export interface EventChoice {
export interface EventImpacts {
export interface TraitRequirement {
export interface NpcFiringConditions {
export interface GameEventTemplate {
export interface ActiveEffect {
export interface StatImpact {
export interface NarrativeMessage {
export interface AgentOffer {
```

### player

```typescript
export type TraitName =
export type PersonalityMatrix = Record<TraitName, number>; // 1–20 scale
export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';
export interface Relationship {
export interface ScoutingReport {
export type PlayerStatus =
export type HairStyle = 'buzz' | 'shaggy' | 'afro' | 'crop' | 'bald';
export type AppearanceAccessory = 'glasses' | 'sunglasses' | 'whistle' | 'headset' | 'beanie' | null;
export type AppearanceExpression = 0 | 1 | 2;
export type AppearanceRole = 'PLAYER' | 'COACH' | 'SCOUT' | 'AGENT';
export type FacialHair = 'none' | 'stubble' | 'moustache' | 'goatee' | 'beard';
export interface Appearance {
export interface PlayerAttributes {
export type AttributeName = keyof PlayerAttributes;
export interface DevelopmentSnapshot {
export interface Player {
```


---

## API Layer (`src/api/`)

### Endpoints

#### academy
```typescript
export async function getAcademyStatus(): Promise<AcademyStatusResponse> {
export async function checkAcademy(): Promise<{ exists: boolean }> {
```

#### archetypes
```typescript
export async function fetchArchetypeVersionHash(): Promise<string | null> {
export async function fetchArchetypes(): Promise<PlayerArchetype[] | null> {
```

#### auth
```typescript
export function register(body: RegisterRequest): Promise<RegisterResponse> {
export function login(body: LoginRequest): Promise<LoginResponse> {
```

#### events
```typescript
export const eventsApi = {
```

#### facilities
```typescript
export async function getFacilities(): Promise<FacilitiesResponse> {
export async function upgradeFacility(facilityType: string): Promise<FacilityUpgradeResponse> {
```

#### gameConfig
```typescript
export async function fetchGameConfig(): Promise<GameConfig> {
```

#### inbox
```typescript
export async function getInbox(): Promise<ApiInboxResponse> {
export async function getMessage(messageId: string): Promise<ApiInboxMessage> {
export async function acceptMessage(messageId: string): Promise<{ status: string }> {
export async function rejectMessage(messageId: string): Promise<{ status: string }> {
export async function markAsRead(messageId: string): Promise<{ status: string }> {
```

#### leaderboard
```typescript
export function getLeaderboard(
```

#### market
```typescript
export const marketApi = {
export async function assignMarketEntity(
```

#### marketData
```typescript
export function fetchMarketData(): Promise<MarketDataResponse> {
```

#### prospects
```typescript
export async function getProspects(): Promise<MarketPlayer[]> {
```

#### squad
```typescript
export async function getSquad(): Promise<SquadResponse> {
export async function releasePlayer(playerId: string): Promise<ReleasePlayerResponse> {
```

#### staff
```typescript
export async function getStaff(): Promise<StaffResponse> {
```

#### sync
```typescript
export function syncWeek(payload: SyncRequest): Promise<SyncResponse> {
```


### Mutations (TanStack Query)

#### marketMutations
```typescript
export function useAssignMarketEntity() {
```

#### syncMutations
```typescript
export function useSyncWeek() {
```


---

## UI Components (`src/components/`)

- `AcademyDashboard.tsx` — AcademyDashboard() {
- `ArchetypeBadge.tsx` — ArchetypeBadge({ player }: ArchetypeBadgeProps) {
- `AssignMissionOverlay.tsx` — AssignMissionOverlay({ scout, visible, onClose }: Props) {
- `GlobalHeader.tsx` — GlobalHeader() {
- `OnboardingScreen.tsx` — OnboardingScreen({ onRegister }: Props) {
- `radar/AttributesRadar.tsx` — AttributesRadar({ attributes, size = 200 }: Props) {
- `radar/PersonalityRadar.tsx` — PersonalityRadar({ personality, size = 200 }: Props) {
- `ScoutReportCard.tsx` — ScoutReportCard({ player }: ScoutReportCardProps) {
- `SyncStatusIndicator.tsx` — SyncStatusIndicator({ status }: Props) {
- `ui/Avatar.tsx` — Avatar({ appearance, role = 'PLAYER', size = 48, morale = 70
- `ui/Badge.tsx` — Badge({ label, color = 'dim' }: Props) {
- `ui/Button.tsx` — Button({ label, variant = 'teal', fullWidth = false, disable
- `ui/Card.tsx` — Card({ children, variant = 'card', style, ...rest }: Props) 
- `ui/DevelopmentChart.tsx` — DevelopmentChart({ log }: Props) {
- `ui/FlagText.tsx` — FlagText({ nationality, size = 14 }: { nationality: string; 
- `ui/PitchBackground.tsx` — PitchBackground() {
- `ui/PixelAvatar.tsx` — PixelAvatar({ size = 48 }: Props) {
- `ui/PixelDialog.tsx` — PixelDialog({
- `ui/PixelText.tsx` — PixelText({
- `ui/PixelTopTabBar.tsx` — PixelTopTabBar({ tabs, active, onChange }: Props) {
- `ui/SwipeConfirm.tsx` — SwipeConfirm({
- `WeeklyTickOverlay.tsx` — WeeklyTickOverlay() {
- `WelcomeSplash.tsx` — WelcomeSplash({ academyName, onDismiss }: Props) {

---

## Design System

### Color Tokens (`src/constants/theme.ts`)

```typescript
  greenDark:  '#1a5c2a',
  greenMid:   '#2d7a3a',
  tealDark:   '#1a4a4a',
  tealMid:    '#1e6b5e',
  tealPanel:  '#2a8a7a',
  tealLight:  '#3db89a',
  tealCard:   '#1d5c52',
  yellow: '#f5c842',
  orange: '#e8852a',
  red:    '#d94040',
  blue:   '#3a8fd4',
  green:  '#2eab5a',
  text:   '#e8f4e8',
  dim:    '#8ecfbe',
  border: '#0d2e28',
  font: 'PressStart2P_400Regular',
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 3, height: 3 },
  shadowOpacity: 0.45,
  shadowRadius: 0,
export const WK = {
export function traitColor(value: number): string {
export const pixelShadow = {
```

### Key Design Rules
- Background: `#1a5c2a` (greenDark) · Cards: `#1d5c52` (tealCard)
- Accent: `#f5c842` (yellow) · Border: `#0d2e28`
- Font: `PressStart2P_400Regular` · `borderRadius: 0` · `borderWidth: 3`
- `pixelShadow`: elevation 4, shadowRadius 0, offset (3,3)

---

## Environment Variables

```bash
EXPO_PUBLIC_API_BASE_URL_WEB=***
```

---

## Development Commands

```bash
# Use correct Node version
nvm use

# Install dependencies (legacy peer deps required for SDK 54)
npm install --legacy-peer-deps

# Start Metro bundler + Expo Go QR
npx expo start

# iOS simulator
npx expo start --ios

# Android simulator
npx expo start --android

# Start dev proxy (bridges Lando backend to LAN)
npm run proxy
```

---

## Backend API Contract

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/register` | Register new academy |
| POST | `/api/login` | Login → JWT token |
| GET | `/api/market/data` | Fetch market entities |
| POST | `/api/market/assign` | Assign entity to academy |
| POST | `/api/academy/initialize` | Initialize academy on backend |
| GET | `/api/academy/status` | Reputation, balance (pence) |
| GET | `/api/squad` | Squad reconciliation |
| GET | `/api/staff` | Staff reconciliation |
| GET | `/api/facilities` | Facility levels + costs (pence) |
| POST | `/api/facilities/:type/upgrade` | Upgrade a facility |
| GET | `/api/inbox` | Inbox messages |
| POST | `/api/inbox/:id/accept\|reject\|read` | Respond to message |
| POST | `/api/sync` | Weekly tick sync |

> **Balance convention**: backend uses pence; local stores use whole pounds.
> Use `penceToPounds()` / `poundsToPence()` from `src/utils/currency.ts`.

---

## Recent Git Activity

```
175602e latest
250f9e7 Fix currency formatting, scout gem source, and major feature additions
6e67f74 update docs
dd2e47b Implement Phase 1 & 2: NPC interaction ledger + coach performance link
9154a98 ui fixes
ca0553d ui fixes
948b72e Populate transfers and ledger in weekly sync payload
b13672d Centralise player asking price into getPlayerAskingPrice utility
2152caf Implement sponsor/investor offer events + fix starter balance from backend
346c77a Update project context generator for React Native app
0a1aacc Fix agent offer UX, player rating stability, and coach valuation alignment
92d2c56 Complete scouting & relationship system — missing elements
704dd4f Implement Scouting, Relationship & Market Valuation systems
5b4d7c1 UI: flip tab/title order on Facilities and Market screens
f1e0283 Add player development, archetype system, and inbox UX improvements
```

---

## Key Architecture Notes

- **Fat client / offline-first**: all game simulation runs on-device; backend receives opaque JSON deltas via `/api/sync`
- **Weekly tick** (`src/engine/GameLoop.ts`): traits, attributes, finances, loans, rep, morale, scouting, relationships — all computed in one pass
- **Personality Matrix**: 8 traits (determination, professionalism, ambition, loyalty, adaptability, pressure, temperament, consistency) on 1–20 scale
- **Attribute model**: 6 attributes (pace, technical, vision, power, stamina, heart) on 0–100 scale; capped at `potential × 20`
- **Overall Rating**: increments by avg attribute gain per tick (not reset to attribute average)
- **Scouting**: Fog of War — `hidden → scouting → revealed` over 2 weeks; gem discovery via `ScoutingService.checkGemDiscovery()`
- **Relationships**: −100 to +100 ledger between players/coaches/scouts/manager
- **Morale**: 0–100; <40 halves coach `effectiveInfluence`
- **Path aliases**: `@/*` → `src/*`


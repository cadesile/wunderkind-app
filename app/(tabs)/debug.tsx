import { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, Pressable, FlatList } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useDebugLogStore, DebugLogEntry, LogLevel } from '@/stores/debugLogStore';
import { useNavStore } from '@/stores/navStore';
import { PixelText, BodyText } from '@/components/ui/PixelText';
import { WK, pixelShadow } from '@/constants/theme';
import { FAB_CLEARANCE } from './_layout';
import { eventsApi } from '@/api/endpoints/events';
import { useEventStore } from '@/stores/eventStore';
import { useArchetypeStore } from '@/stores/archetypeStore';
import { fetchAndCacheGameConfig } from '@/hooks/useGameConfigSync';

// ─── Level colours ────────────────────────────────────────────────────────────

function levelColor(level: LogLevel): string {
  switch (level) {
    case 'request':       return WK.dim;
    case 'response_ok':   return WK.tealLight;
    case 'response_error': return WK.red;
    case 'app_error':     return WK.yellow;
  }
}

function levelLabel(level: LogLevel): string {
  switch (level) {
    case 'request':        return 'REQ';
    case 'response_ok':    return 'OK';
    case 'response_error': return 'ERR';
    case 'app_error':      return '⚠';
  }
}

// ─── Detail view ─────────────────────────────────────────────────────────────

function LogDetail({ entry, onBack }: { entry: DebugLogEntry; onBack: () => void }) {
  const setBackFab = useNavStore((s) => s.setBackFab);
  const stableBack = useCallback(onBack, []);

  useEffect(() => {
    setBackFab(stableBack);
    return () => setBackFab(null);
  }, [stableBack]);

  const ts = new Date(entry.timestamp);
  const timeStr = ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = ts.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  function JsonBlock({ label, value }: { label: string; value: unknown }) {
    if (value === undefined || value === null) return null;
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    return (
      <View style={{ marginBottom: 16 }}>
        <BodyText size={10} color={WK.dim} style={{ marginBottom: 4 }}>{label}</BodyText>
        <View style={{ backgroundColor: WK.tealMid, borderWidth: 1, borderColor: WK.border, padding: 10 }}>
          <BodyText size={11} color={WK.text} style={{ fontFamily: 'monospace', lineHeight: 18 }}>
            {text}
          </BodyText>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: WK.tealDark }}
      contentContainerStyle={{ padding: 16, paddingBottom: FAB_CLEARANCE + 16 }}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <View style={{
          paddingHorizontal: 8,
          paddingVertical: 3,
          backgroundColor: levelColor(entry.level),
        }}>
          <PixelText size={9} color={WK.border}>{levelLabel(entry.level)}</PixelText>
        </View>
        {entry.method && (
          <BodyText size={12} color={WK.yellow}>{entry.method}</BodyText>
        )}
        <BodyText size={12} color={WK.text} style={{ flex: 1 }} numberOfLines={1}>{entry.path}</BodyText>
      </View>

      {/* Metadata */}
      <View style={{ flexDirection: 'row', gap: 20, marginBottom: 20 }}>
        <View>
          <BodyText size={10} color={WK.dim}>TIME</BodyText>
          <BodyText size={12} color={WK.text}>{dateStr} {timeStr}</BodyText>
        </View>
        {entry.statusCode !== undefined && (
          <View>
            <BodyText size={10} color={WK.dim}>STATUS</BodyText>
            <BodyText size={12} color={entry.statusCode < 400 ? WK.tealLight : WK.red}>
              {entry.statusCode}
            </BodyText>
          </View>
        )}
        {entry.durationMs !== undefined && (
          <View>
            <BodyText size={10} color={WK.dim}>DURATION</BodyText>
            <BodyText size={12} color={WK.text}>{entry.durationMs}ms</BodyText>
          </View>
        )}
      </View>

      {entry.errorMessage && (
        <View style={{ backgroundColor: WK.tealMid, borderWidth: 1, borderColor: WK.red, padding: 10, marginBottom: 16 }}>
          <BodyText size={12} color={WK.red}>{entry.errorMessage}</BodyText>
        </View>
      )}

      <JsonBlock label="REQUEST BODY" value={entry.requestBody} />
      <JsonBlock label="RESPONSE BODY" value={entry.responseBody} />
    </ScrollView>
  );
}

// ─── Log row ─────────────────────────────────────────────────────────────────

function LogRow({ entry, onPress }: { entry: DebugLogEntry; onPress: () => void }) {
  const ts = new Date(entry.timestamp);
  const timeStr = ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const color = levelColor(entry.level);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: WK.border,
        backgroundColor: pressed ? WK.tealCard : 'transparent',
      })}
    >
      {/* Level badge */}
      <View style={{
        width: 36,
        alignItems: 'center',
        paddingVertical: 2,
        backgroundColor: color,
      }}>
        <PixelText size={8} color={WK.border}>{levelLabel(entry.level)}</PixelText>
      </View>

      {/* Method + path */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {entry.method && (
            <BodyText size={10} color={WK.yellow}>{entry.method}</BodyText>
          )}
          <BodyText size={11} color={WK.text} numberOfLines={1} style={{ flex: 1 }}>
            {entry.path}
          </BodyText>
        </View>
        <BodyText size={10} color={WK.dim}>
          {timeStr}{entry.statusCode !== undefined ? `  ·  ${entry.statusCode}` : ''}{entry.durationMs !== undefined ? `  ·  ${entry.durationMs}ms` : ''}
        </BodyText>
      </View>

      <BodyText size={12} color={WK.dim}>›</BodyText>
    </Pressable>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function DebugScreen() {
  const entries = useDebugLogStore((s) => s.entries);
  const clear   = useDebugLogStore((s) => s.clear);
  const setTemplates = useEventStore((s) => s.setTemplates);
  const fetchArchetypes = useArchetypeStore((s) => s.fetchArchetypes);
  const [selected, setSelected] = useState<DebugLogEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshNarrative = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      eventsApi.fetchTemplates().then(setTemplates),
      fetchArchetypes(true),
      fetchAndCacheGameConfig(),
    ]);
    setRefreshing(false);
  }, [setTemplates, fetchArchetypes]);

  // Always return to list view when the tab is tapped
  useFocusEffect(useCallback(() => {
    setSelected(null);
    useNavStore.getState().setBackFab(null);
  }, []));

  if (selected) {
    return (
      <View style={{ flex: 1, backgroundColor: WK.tealDark }}>
        <LogDetail entry={selected} onBack={() => setSelected(null)} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: WK.tealDark }}>
      {/* Toolbar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 3,
        borderBottomColor: WK.border,
        gap: 10,
      }}>
        <PixelText size={9} upper style={{ flex: 1 }}>Debug Log</PixelText>
        <BodyText size={11} color={WK.dim}>{entries.length} entries</BodyText>
        <Pressable
          onPress={handleRefreshNarrative}
          disabled={refreshing}
          style={[{
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: WK.tealCard,
            borderWidth: 2,
            borderColor: WK.border,
            opacity: refreshing ? 0.5 : 1,
          }, pixelShadow]}
        >
          <PixelText size={8} color={WK.yellow}>{refreshing ? '...' : 'REFRESH'}</PixelText>
        </Pressable>
        <Pressable
          onPress={clear}
          style={[{
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: WK.tealCard,
            borderWidth: 2,
            borderColor: WK.border,
          }, pixelShadow]}
        >
          <PixelText size={8} color={WK.red}>CLEAR</PixelText>
        </Pressable>
      </View>

      {entries.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <BodyText size={13} color={WK.dim}>No log entries yet.</BodyText>
          <BodyText size={11} color={WK.dim} style={{ marginTop: 6 }}>
            API calls will appear here.
          </BodyText>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => (
            <LogRow entry={item} onPress={() => setSelected(item)} />
          )}
          contentContainerStyle={{ paddingBottom: FAB_CLEARANCE + 16 }}
        />
      )}
    </View>
  );
}

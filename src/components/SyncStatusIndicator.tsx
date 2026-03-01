import { View, Text } from 'react-native';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react-native';

type SyncStatus = 'synced' | 'syncing' | 'offline';

interface Props {
  status: SyncStatus;
}

const STATUS_CONFIG: Record<SyncStatus, { label: string; color: string }> = {
  synced: { label: 'Synced', color: '#2D6A4F' },
  syncing: { label: 'Syncing…', color: '#F4A261' },
  offline: { label: 'Offline', color: '#9CA3AF' },
};

export function SyncStatusIndicator({ status }: Props) {
  const { label, color } = STATUS_CONFIG[status];

  return (
    <View className="flex-row items-center gap-1">
      {status === 'synced' && <Wifi size={14} color={color} />}
      {status === 'syncing' && <RefreshCw size={14} color={color} />}
      {status === 'offline' && <WifiOff size={14} color={color} />}
      <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

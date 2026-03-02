import { View } from 'react-native';
import { PixelText } from './ui/PixelText';
import { WK } from '@/constants/theme';

type SyncStatus = 'synced' | 'syncing' | 'offline';

interface Props {
  status: SyncStatus;
}

const CONFIG: Record<SyncStatus, { label: string; dot: string }> = {
  synced:  { label: 'LIVE',    dot: WK.green },
  syncing: { label: 'SYNC…',  dot: WK.yellow },
  offline: { label: 'OFFLN',  dot: WK.dim },
};

export function SyncStatusIndicator({ status }: Props) {
  const { label, dot } = CONFIG[status];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 6, height: 6, backgroundColor: dot, borderRadius: 0 }} />
      <PixelText size={7} dim>{label}</PixelText>
    </View>
  );
}

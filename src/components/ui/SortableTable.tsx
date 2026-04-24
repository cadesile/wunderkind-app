import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { PixelText } from './PixelText';
import { WK } from '@/constants/theme';
import { hapticTap } from '@/utils/haptics';

export interface ColumnDef<T> {
  key: string;
  label: string;
  /** Flex weight — columns fill 100% of available width proportionally */
  flex: number;
  /** Return a number or string used for sorting. All columns should provide this. */
  sortValue?: (item: T) => number | string;
  render: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface Props<T extends { id: string }> {
  columns: ColumnDef<T>[];
  data: T[];
  defaultSortKey: string;
  defaultSortDir?: 'asc' | 'desc';
  onRowPress?: (item: T) => void;
  emptyMessage?: string;
  /** Optional per-row style overrides — return undefined for default styling */
  rowStyle?: (item: T) => { backgroundColor?: string; borderColor?: string } | undefined;
}

export function SortableTable<T extends { id: string }>({
  columns,
  data,
  defaultSortKey,
  defaultSortDir = 'desc',
  onRowPress,
  emptyMessage = 'NO DATA',
  rowStyle,
}: Props<T>) {
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);

  function handleHeaderPress(col: ColumnDef<T>) {
    if (!col.sortValue) return;
    hapticTap();
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('desc');
    }
  }

  const sorted = [...data].sort((a, b) => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return 0;
    const va = col.sortValue(a);
    const vb = col.sortValue(b);
    let cmp = 0;
    if (typeof va === 'number' && typeof vb === 'number') {
      cmp = va - vb;
    } else {
      cmp = String(va).localeCompare(String(vb));
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const cellAlign = (align?: 'left' | 'center' | 'right') =>
    align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';

  return (
    <View style={{ width: '100%' }}>
      {/* ── Column headers ────────────────────────────────────────────── */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: WK.tealDark,
        borderWidth: 3,
        borderColor: WK.border,
        borderBottomWidth: 2,
      }}>
        {columns.map((col) => {
          const isActive = sortKey === col.key;
          return (
            <Pressable
              key={col.key}
              onPress={() => handleHeaderPress(col)}
              style={{
                flex: col.flex,
                minWidth: 0,
                minHeight: 44,
                justifyContent: 'center',
                alignItems: cellAlign(col.align),
                paddingHorizontal: 6,
                paddingVertical: 6,
                borderRightWidth: 1,
                borderRightColor: WK.border,
                overflow: 'hidden',
              }}
            >
              <PixelText
                size={13}
                color={isActive ? WK.yellow : WK.dim}
                style={{ fontFamily: WK.fontSubNav }}
                numberOfLines={1}
              >
                {col.label}{isActive ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
              </PixelText>
            </Pressable>
          );
        })}
      </View>

      {/* ── Rows ──────────────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <View style={{
          borderWidth: 3,
          borderTopWidth: 0,
          borderColor: WK.border,
          paddingVertical: 24,
          alignItems: 'center',
        }}>
          <PixelText size={8} dim>{emptyMessage}</PixelText>
        </View>
      ) : (
        sorted.map((item, index) => {
          const rowBg = index % 2 === 0 ? WK.tealCard : 'rgba(0,0,0,0.15)';
          const custom = rowStyle?.(item);
          return (
            <Pressable
              key={item.id}
              onPress={() => onRowPress?.(item)}
            >
              {/* Render-prop pattern: all styling lives on the View child.
                  Pressable function-style props are unreliable on Android —
                  both layout AND visual properties (bg, borders) may be ignored. */}
              {({ pressed }) => (
                <View style={{
                  flexDirection: 'row',
                  minHeight: 44,
                  backgroundColor: pressed ? WK.tealMid : (custom?.backgroundColor ?? rowBg),
                  borderLeftWidth: 3,
                  borderRightWidth: 3,
                  borderBottomWidth: index === sorted.length - 1 ? 3 : 1,
                  borderColor: custom?.borderColor ?? WK.border,
                }}>
                  {columns.map((col) => (
                    <View
                      key={col.key}
                      style={{
                        flex: col.flex,
                        minWidth: 0,
                        minHeight: 44,
                        justifyContent: 'center',
                        alignItems: cellAlign(col.align),
                        paddingHorizontal: 6,
                        paddingVertical: 6,
                        borderRightWidth: 1,
                        borderRightColor: WK.border,
                        overflow: 'hidden',
                      }}
                    >
                      {col.render(item)}
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          );
        })
      )}
    </View>
  );
}

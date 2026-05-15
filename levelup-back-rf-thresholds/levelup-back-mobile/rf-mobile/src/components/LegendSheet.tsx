import React, { useMemo } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { X as XIcon, ChevronRight } from 'lucide-react-native';
import { C } from '../theme';
import { ripple } from '../platform';
import { fmtNum, cellEdgeColor } from '../helpers';
import { SEG } from '../mocks';
import type { RFCell } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// LEGEND SHEET — карта всех 12 сегментов (всегда доступна через 📖)
// ════════════════════════════════════════════════════════════════════
export const LegendSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  cells: Record<string, RFCell>;
  onPickSegment: (key: string) => void;
  s: S;
}> = ({ visible, onClose, cells, onPickSegment, s }) => {
  const list = useMemo(() => {
    const keys = Object.keys(SEG);
    return keys
      .map(k => ({ key: k, info: SEG[k], cell: cells[k] }))
      .sort((a, b) => {
        const [ra, fa] = a.key.split('_').map(Number);
        const [rb, fb] = b.key.split('_').map(Number);
        if (ra !== rb) return rb - ra;
        return fa - fb;
      });
  }, [cells]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.modalRoot}>
        <Pressable style={s.modalBackdrop} onPress={onClose} />
        <View style={[s.modalSheet, { maxHeight: '85%' }]}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalSuper}>ПАМЯТКА</Text>
              <Text style={s.modalTitle}>Карта сегментов</Text>
            </View>
            <Pressable style={s.modalClose} {...ripple()} onPress={onClose}>
              <XIcon size={18} color={C.ink} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            {list.map(({ key, info, cell }) => {
              const [rN, fN] = key.split('_').map(Number);
              const edge = cellEdgeColor(rN, fN);
              return (
                <Pressable key={key} style={s.legendRow} {...ripple()} onPress={() => onPickSegment(key)}>
                  <View style={[s.legendEdge, { backgroundColor: edge }]} />
                  <Text style={s.legendEmoji}>{info.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.legendName} numberOfLines={1} ellipsizeMode="tail">{info.name}</Text>
                    <Text style={s.legendCode}>{info.code}</Text>
                  </View>
                  {cell && (
                    <View style={s.legendCount}>
                      <Text style={s.legendCountVal}>{fmtNum(cell.count)}</Text>
                      <Text style={s.legendCountLbl}>гостей</Text>
                    </View>
                  )}
                  <ChevronRight size={16} color={C.ink4} strokeWidth={2} />
                </Pressable>
              );
            })}
            <Text style={s.legendFootnote}>
              Тап на сегмент — откроется детали ниже на главном экране.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

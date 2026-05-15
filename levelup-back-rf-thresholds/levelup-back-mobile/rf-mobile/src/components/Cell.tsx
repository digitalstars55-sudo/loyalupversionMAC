import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { C } from '../theme';
import { ripple } from '../platform';
import { fmtNum } from '../helpers';
import type { RFCell } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// CELL — ячейка матрицы (emoji + count + pct)
// ════════════════════════════════════════════════════════════════════
export const Cell: React.FC<{
  cell: RFCell;
  emoji: string;
  selected: boolean;
  edgeColor: string;
  onPress: () => void;
  s: S;
}> = ({ cell, emoji, selected, edgeColor, onPress, s }) => (
  <Pressable style={[s.cell, selected && s.cellSelected]} {...ripple()} onPress={onPress}>
    <View style={[s.cellEdge, { backgroundColor: edgeColor }]} />
    <Text style={s.cellEmoji}>{emoji}</Text>
    <Text style={[s.cellCt, selected && { color: C.purpleDeep }]} numberOfLines={1} adjustsFontSizeToFit>
      {fmtNum(cell.count)}
    </Text>
    <Text style={s.cellPc}>{cell.pct.toFixed(1)}%</Text>
  </Pressable>
);

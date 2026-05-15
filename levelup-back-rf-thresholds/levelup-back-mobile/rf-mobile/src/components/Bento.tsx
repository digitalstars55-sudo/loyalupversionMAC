import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { ArrowUp, ArrowDown, Send } from 'lucide-react-native';
import { C } from '../theme';
import { ripple } from '../platform';
import { fmtNum, cellEdgeColor } from '../helpers';
import { SEG } from '../mocks';
import type { RFCell, SegmentInfo } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// BENTO — секция с hero + medium + compact-strip карточками
// ════════════════════════════════════════════════════════════════════

export const BentoSection: React.FC<{
  cells: [string, RFCell][];
  selectedKey: string;
  onSelect: (key: string) => void;
  onBroadcast: (key: string) => void;
  s: S;
}> = ({ cells, selectedKey, onSelect, onBroadcast, s }) => {
  if (cells.length === 0) {
    return (
      <View style={s.bentoEmpty}>
        <Text style={s.bentoEmptyText}>В этой категории пока нет сегментов</Text>
      </View>
    );
  }

  const [hero, ...rest] = cells;
  const mediums = rest.slice(0, 2);
  const compacts = rest.slice(2);

  return (
    <View style={s.bentoWrap}>
      <BentoHero
        cell={hero[1]} info={SEG[hero[0]]}
        selected={selectedKey === hero[0]}
        onPress={() => onSelect(hero[0])}
        onBroadcast={() => onBroadcast(hero[0])}
        s={s}
      />

      {mediums.length > 0 && (
        <View style={s.bentoMediumRow}>
          {mediums.map(([k, c]) => (
            <BentoMedium
              key={k} cell={c} info={SEG[k]}
              selected={selectedKey === k}
              onPress={() => onSelect(k)}
              onBroadcast={() => onBroadcast(k)}
              s={s}
            />
          ))}
          {mediums.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      )}

      {compacts.length > 0 && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.bentoCompactRow}
          style={s.bentoCompactScroll}
        >
          {compacts.map(([k, c]) => (
            <BentoCompact
              key={k} cell={c} info={SEG[k]}
              selected={selectedKey === k}
              onPress={() => onSelect(k)}
              s={s}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const BentoHero: React.FC<{
  cell: RFCell; info: SegmentInfo;
  selected: boolean;
  onPress: () => void;
  onBroadcast: () => void;
  s: S;
}> = ({ cell, info, selected, onPress, onBroadcast, s }) => {
  const edge = cellEdgeColor(cell.r_score, cell.f_score);
  const delta = cell.delta_pct ?? 0;
  const up = delta >= 0;
  return (
    <Pressable style={[s.bentoHero, selected && s.bentoHeroSelected]} {...ripple()} onPress={onPress}>
      <View style={[s.bentoHeroEdge, { backgroundColor: edge }]} />
      <View style={s.bentoHeroTop}>
        <Text style={s.bentoEmoji}>{info.emoji}</Text>
        <View style={s.bentoHeroTopText}>
          <Text style={s.bentoHeroName} numberOfLines={2} ellipsizeMode="tail" adjustsFontSizeToFit>
            {info.name}
          </Text>
          <View style={s.bentoCodeRow}>
            <View style={s.bentoCodePill}><Text style={s.bentoCodeText}>{info.code}</Text></View>
            <View style={[s.bentoDeltaPill, up ? s.bentoDeltaUp : s.bentoDeltaDown]}>
              {up
                ? <ArrowUp size={10} color={C.good} strokeWidth={2.5} />
                : <ArrowDown size={10} color={C.warn} strokeWidth={2.5} />
              }
              <Text style={[s.bentoDeltaText, { color: up ? C.good : C.warn }]}>{Math.abs(delta)}%</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={s.bentoHeroStats}>
        <View style={{ flex: 1 }}>
          <Text style={s.bentoHeroCount} numberOfLines={1} adjustsFontSizeToFit>{fmtNum(cell.count)}</Text>
          <Text style={s.bentoHeroSub}>гостей · {cell.pct.toFixed(1)}%</Text>
        </View>
        <Pressable style={s.bentoHeroBtn} {...ripple('rgba(255,255,255,0.22)')} onPress={onBroadcast}>
          <Send size={14} color={C.surface} strokeWidth={2.2} />
          <Text style={s.bentoHeroBtnText}>Рассылка</Text>
        </Pressable>
      </View>
    </Pressable>
  );
};

const BentoMedium: React.FC<{
  cell: RFCell; info: SegmentInfo;
  selected: boolean;
  onPress: () => void;
  onBroadcast: () => void;
  s: S;
}> = ({ cell, info, selected, onPress, onBroadcast, s }) => {
  const edge = cellEdgeColor(cell.r_score, cell.f_score);
  const delta = cell.delta_pct ?? 0;
  const up = delta >= 0;
  return (
    <Pressable style={[s.bentoMed, selected && s.bentoMedSelected]} {...ripple()} onPress={onPress}>
      <View style={[s.bentoMedEdge, { backgroundColor: edge }]} />
      <View style={s.bentoMedHead}>
        <Text style={s.bentoEmojiMed}>{info.emoji}</Text>
        <View style={[s.bentoDeltaPill, up ? s.bentoDeltaUp : s.bentoDeltaDown]}>
          {up
            ? <ArrowUp size={9} color={C.good} strokeWidth={2.5} />
            : <ArrowDown size={9} color={C.warn} strokeWidth={2.5} />
          }
          <Text style={[s.bentoDeltaText, { color: up ? C.good : C.warn }]}>{Math.abs(delta)}%</Text>
        </View>
      </View>
      <Text style={s.bentoMedName} numberOfLines={1} ellipsizeMode="tail" adjustsFontSizeToFit>{info.name}</Text>
      <Text style={s.bentoMedCode}>{info.code}</Text>
      <Text style={s.bentoMedCount} numberOfLines={1} adjustsFontSizeToFit>{fmtNum(cell.count)}</Text>
      <Text style={s.bentoMedSub}>{cell.pct.toFixed(1)}% базы</Text>
      <Pressable style={s.bentoMedBtn} {...ripple()} onPress={onBroadcast}>
        <Send size={11} color={C.purpleDeep} strokeWidth={2.2} />
        <Text style={s.bentoMedBtnText}>Рассылка</Text>
      </Pressable>
    </Pressable>
  );
};

const BentoCompact: React.FC<{
  cell: RFCell; info: SegmentInfo;
  selected: boolean;
  onPress: () => void;
  s: S;
}> = ({ cell, info, selected, onPress, s }) => {
  const edge = cellEdgeColor(cell.r_score, cell.f_score);
  const delta = cell.delta_pct ?? 0;
  const up = delta >= 0;
  return (
    <Pressable style={[s.bentoCmp, selected && s.bentoCmpSelected]} {...ripple()} onPress={onPress}>
      <View style={[s.bentoCmpEdge, { backgroundColor: edge }]} />
      <View style={s.bentoCmpRow}>
        <Text style={s.bentoEmojiCmp}>{info.emoji}</Text>
        <Text style={[s.bentoDeltaText, { color: up ? C.good : C.warn, fontSize: 10 }]}>
          {up ? '↗' : '↘'}{Math.abs(delta)}%
        </Text>
      </View>
      <Text style={s.bentoCmpName} numberOfLines={1} ellipsizeMode="tail">{info.name}</Text>
      <Text style={s.bentoCmpCount}>{fmtNum(cell.count)}</Text>
    </Pressable>
  );
};

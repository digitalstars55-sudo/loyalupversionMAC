import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Send, Users, Lightbulb, Gift } from 'lucide-react-native';
import { C, F } from '../theme';
import { ripple } from '../platform';
import { fmtNum, MdText } from '../helpers';
import type { RFCell, SegmentInfo } from '../types';
import type { Resp } from '../responsive';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// DETAIL CARD — карточка выбранного сегмента (упрощённая)
// ════════════════════════════════════════════════════════════════════
export const DetailCard: React.FC<{
  cell: RFCell;
  info: SegmentInfo;
  onBroadcast: () => void;
  onShowGuests: () => void;
  // Аддитивно: назначение награды сегменту (RFM-кампания). Без пропа
  // карточка выглядит ровно как раньше.
  onReward?: () => void;
  s: S;
  r: Resp;
}> = ({ cell, info, onBroadcast, onShowGuests, onReward, s, r }) => (
  <View style={s.detail}>
    <View style={s.detailEyebrow}>
      <Text style={s.detailEmoji}>{info.emoji}</Text>
      <Text style={s.detailEyebrowText}>{info.code}</Text>
    </View>
    <Text style={s.detailName} numberOfLines={2} ellipsizeMode="tail" adjustsFontSizeToFit>{info.name}</Text>
    <MdText text={info.sub} style={s.detailSub} boldStyle={{ color: C.ink, fontFamily: F.bold }} numberOfLines={3} />

    <View style={s.detailStats}>
      <View style={[s.ds, s.dsLeft]}>
        <Text style={s.dsVal} numberOfLines={1}>{fmtNum(cell.count)}</Text>
        <Text style={s.dsLbl}>гостей</Text>
      </View>
      <View style={[s.ds, s.dsRight]}>
        <Text style={s.dsVal} numberOfLines={1}>{cell.pct.toFixed(1)}%</Text>
        <Text style={s.dsLbl}>от базы</Text>
      </View>
    </View>

    <View style={s.advice}>
      <View style={s.adviceBlock}>
        <View style={s.adviceHead}>
          <Lightbulb size={11} color={C.hintInk} strokeWidth={2.5} />
          <Text style={[s.adviceTitle, { color: C.hintInk }]}>СОВЕТ ПО РАССЫЛКЕ</Text>
        </View>
        <Text style={s.adviceText}>{info.hint}</Text>
      </View>
      <View style={s.adviceDivider} />
      <View style={s.adviceBlock}>
        <View style={s.adviceHead}>
          <View style={s.adviceDot} />
          <Text style={[s.adviceTitle, { color: C.limeDeep }]}>СТРАТЕГИЯ</Text>
        </View>
        <Text style={s.adviceText}>{info.strategy}</Text>
      </View>
    </View>

    <View style={[s.actions, r.isTiny && s.actionsStack]}>
      <Pressable style={[s.btn, s.btnPrimary]} {...ripple('rgba(255,255,255,0.22)')} onPress={onBroadcast}>
        <Send size={14} color={C.surface} strokeWidth={2} />
        <Text style={s.btnPrimaryText}>Рассылка</Text>
      </Pressable>
      {!!onReward && (
        <Pressable
          style={[s.btn, s.btnAi, cell.count <= 0 && { opacity: 0.5 }]}
          {...ripple()}
          onPress={onReward}
          disabled={cell.count <= 0}
        >
          <Gift size={14} color={C.purpleDeep} strokeWidth={2} />
          <Text style={s.btnAiText}>🎁 Награда</Text>
        </Pressable>
      )}
    </View>
    {cell.count > 0 && (
      <View style={[s.actions, { marginTop: 8 }]}>
        <Pressable style={[s.btn, s.btnSecondary]} {...ripple()} onPress={onShowGuests}>
          <Users size={14} color={C.ink} strokeWidth={2} />
          <Text style={s.btnSecondaryText}>Гости ({fmtNum(cell.count)})</Text>
        </Pressable>
      </View>
    )}
  </View>
);

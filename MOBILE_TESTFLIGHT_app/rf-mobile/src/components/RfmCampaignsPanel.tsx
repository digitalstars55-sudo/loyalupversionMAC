import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import {
  ChevronDown, ChevronUp, X as XIcon, Ban, Gift, Coins, TrendingUp, TrendingDown,
} from 'lucide-react-native';
import { SheetModal } from './SheetModal';
import { SummaryRow } from './RewardModal';
import { C, F } from '../theme';
import { haptic, ripple } from '../platform';
import { fmtNum } from '../helpers';
import { fetchRfmCampaigns, fetchRfmCampaignDetail, cancelRfmCampaign } from '../api';
import type { RfmCampaign, RfmCampaignDetail } from '../types';
import type { Resp } from '../responsive';
import type { S } from '../styles';

// Статусы, для которых отмена ещё имеет смысл.
const CANCELLABLE = ['processing', 'completed', 'partially_failed'];

// ════════════════════════════════════════════════════════════════════
// ИСТОРИЯ RFM-КАМПАНИЙ — раскрывающийся блок на экране аналитики.
// Список грузится лениво (при первом раскрытии) и перечитывается, когда
// родитель меняет reloadToken (после создания или отмены кампании).
// Детали открываются модалкой RfmCampaignDetailModal — её монтирует экран
// рядом с остальными модалками, вне ScrollView.
// ════════════════════════════════════════════════════════════════════
export const RfmCampaignsPanel: React.FC<{
  reloadToken?: number;
  onOpenDetail: (campaignId: number) => void;
  s: S;
}> = ({ reloadToken = 0, onOpenDetail, s }) => {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<RfmCampaign[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setList(await fetchRfmCampaigns());
    } catch (e: any) {
      setList([]);
      setError(e?.message ?? 'Не удалось загрузить историю кампаний');
    } finally {
      setLoading(false);
    }
  }, []);

  // Первое раскрытие — грузим. Дальше — при изменении reloadToken.
  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reloadToken]);

  const onToggle = () => { haptic('light'); setOpen(v => !v); };
  const rows = list ?? [];

  return (
    <>
      <Pressable style={s.secHead} {...ripple()} onPress={onToggle}>
        <Text style={s.secTitle}>История RFM-кампаний</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[s.secMeta, { color: C.purple }]}>
            {open ? 'свернуть' : 'показать'}
          </Text>
          {open
            ? <ChevronUp size={14} color={C.purple} strokeWidth={2.4} />
            : <ChevronDown size={14} color={C.purple} strokeWidth={2.4} />
          }
        </View>
      </Pressable>

      {open && (
        <View style={[s.brList, { paddingHorizontal: 0, marginBottom: 24 }]}>
          {loading && list == null ? (
            <View style={cs.center}>
              <ActivityIndicator size="small" color={C.purple} />
              <Text style={cs.centerText}>Загружаем кампании…</Text>
            </View>
          ) : error ? (
            <View style={cs.center}>
              <Text style={cs.centerText}>{error}</Text>
              <Pressable style={cs.retry} {...ripple()} onPress={() => { haptic('light'); load(); }}>
                <Text style={cs.retryText}>Повторить</Text>
              </Pressable>
            </View>
          ) : rows.length === 0 ? (
            <View style={cs.center}>
              <Text style={cs.centerText}>
                Кампаний пока нет — назначьте награду сегменту кнопкой «🎁 Награда».
              </Text>
            </View>
          ) : (
            rows.map((c, i) => (
              <Pressable
                key={c.id}
                style={[cs.row, i === rows.length - 1 && cs.rowLast]}
                {...ripple()}
                onPress={() => { haptic('light'); onOpenDetail(c.id); }}
              >
                <View style={cs.rowTop}>
                  {c.reward_type === 'points'
                    ? <Coins size={13} color={C.purpleDeep} strokeWidth={2.2} />
                    : <Gift size={13} color={C.purpleDeep} strokeWidth={2.2} />
                  }
                  <Text style={cs.rowName} numberOfLines={1} ellipsizeMode="tail">
                    {c.name || `Кампания #${c.id}`}
                  </Text>
                  <StatusBadge status={c.status} label={c.status_label} />
                </View>
                <Text style={cs.rowMeta} numberOfLines={2}>
                  {[
                    fmtDate(c.created_at),
                    c.segment_label,
                    c.reward_label,
                  ].filter(Boolean).join(' · ')}
                </Text>
                <Text style={cs.rowNums}>
                  Аудитория {fmtNum(c.audience_total ?? 0)} · назначено{' '}
                  <Text style={cs.rowNumsAccent}>{fmtNum(c.assigned_count ?? 0)}</Text>
                  {c.control_count ? ` · контроль ${fmtNum(c.control_count)}` : ''}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      )}
    </>
  );
};

// ════════════════════════════════════════════════════════════════════
// ДЕТАЛИ КАМПАНИИ — счётчики, воронка подарков, возвраты vs контроль
// ════════════════════════════════════════════════════════════════════
export const RfmCampaignDetailModal: React.FC<{
  campaignId: number | null;
  onClose: () => void;
  onCancelled: () => void;
  s: S;
  r: Resp;
}> = ({ campaignId, onClose, onCancelled, s, r }) => {
  const [data, setData] = useState<RfmCampaignDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (campaignId == null) { setData(null); return; }
    let alive = true;
    setLoading(true);
    setData(null);
    setCancelling(false);
    fetchRfmCampaignDetail(campaignId)
      .then(d => { if (alive) setData(d); })
      .catch((e: any) => {
        if (!alive) return;
        Alert.alert('Ошибка', e?.message ?? 'Не удалось загрузить кампанию');
        onClose();
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const onCancel = () => {
    if (campaignId == null) return;
    haptic('medium');
    Alert.alert(
      'Отменить кампанию?',
      'Неактивированные подарки будут отозваны, баллы откатятся в пределах остатка',
      [
        { text: 'Не отменять', style: 'cancel' },
        {
          text: 'Отменить кампанию',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const res = await cancelRfmCampaign(campaignId);
              haptic('success');
              Alert.alert(
                'Кампания отменена',
                `Отозвано: ${fmtNum(res.revoked)}\nВозвращено баллов: ${fmtNum(res.refunded)}\nОставлено (уже использовано): ${fmtNum(res.kept)}`,
              );
              onCancelled();
            } catch (e: any) {
              haptic('error');
              Alert.alert('Не удалось отменить', e?.message ?? 'Попробуйте ещё раз');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  const visible = campaignId != null;
  const funnel = data?.gift_funnel ?? null;
  const returns = data?.returns ?? null;
  const canCancel = !!data && CANCELLABLE.includes(String(data.status));

  return (
    <SheetModal visible={visible} onClose={onClose}>
      <View style={s.modalHeader}>
        <Text style={s.detailEmoji}>{data?.reward_type === 'points' ? '🪙' : '🎁'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.modalSuper}>RFM-КАМПАНИЯ</Text>
          <Text style={s.modalTitle} numberOfLines={1} ellipsizeMode="tail">
            {data?.name || (campaignId != null ? `Кампания #${campaignId}` : '')}
          </Text>
        </View>
        <Pressable style={s.modalClose} {...ripple()} onPress={onClose}>
          <XIcon size={18} color={C.ink} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView
        style={[s.modalBody, { flexShrink: 1 }]}
        contentContainerStyle={s.modalBodyContent}
        showsVerticalScrollIndicator={false}
      >
        {loading || !data ? (
          <View style={cs.center}>
            <ActivityIndicator size="small" color={C.purple} />
            <Text style={cs.centerText}>Загружаем…</Text>
          </View>
        ) : (
          <>
            <View style={cs.headMeta}>
              <StatusBadge status={data.status} label={data.status_label} />
              <Text style={cs.headMetaText} numberOfLines={2}>
                {[fmtDate(data.created_at), data.segment_label, data.reward_label]
                  .filter(Boolean).join(' · ')}
              </Text>
            </View>

            <View style={cs.card}>
              <Text style={cs.cardTitle}>СЧЁТЧИКИ</Text>
              <SummaryRow label="Аудитория" value={fmtNum(data.audience_total ?? 0)} />
              <SummaryRow label="Назначено" value={fmtNum(data.assigned_count ?? 0)} accent />
              <SummaryRow label="Контрольная группа" value={fmtNum(data.control_count ?? 0)} />
              <SummaryRow label="Пропущено" value={fmtNum(data.skipped_count ?? 0)} />
              <SummaryRow label="Ошибок" value={fmtNum(data.failed_count ?? 0)} last />
            </View>

            {!!funnel && (
              <View style={cs.card}>
                <Text style={cs.cardTitle}>ВОРОНКА ПОДАРКОВ</Text>
                <SummaryRow label="Назначено" value={fmtNum(funnel.assigned ?? 0)} />
                <SummaryRow label="Активировано" value={fmtNum(funnel.activated ?? 0)} accent />
                <SummaryRow label="Ждут активации" value={fmtNum(funnel.waiting ?? 0)} />
                <SummaryRow label="Сгорело (не забрали)" value={fmtNum(funnel.claim_expired ?? 0)} last />
              </View>
            )}

            {!!returns && (
              <View style={cs.card}>
                <Text style={cs.cardTitle}>ВОЗВРАТЫ · ОСН. ГРУППА vs КОНТРОЛЬ</Text>
                <SummaryRow
                  label="Основная группа"
                  value={`${fmtNum(returns.assigned_returned ?? 0)} из ${fmtNum(returns.assigned_base ?? 0)} · ${pct(returns.assigned_return_rate)}`}
                  accent
                />
                <SummaryRow
                  label="Контрольная группа"
                  value={`${fmtNum(returns.control_returned ?? 0)} из ${fmtNum(returns.control_base ?? 0)} · ${pct(returns.control_return_rate)}`}
                  last
                />
                <View style={[cs.uplift, returns.assigned_improved ? cs.upliftGood : cs.upliftBad]}>
                  {returns.assigned_improved
                    ? <TrendingUp size={14} color={C.good} strokeWidth={2.4} />
                    : <TrendingDown size={14} color={C.warn} strokeWidth={2.4} />
                  }
                  <Text style={[cs.upliftText, { color: returns.assigned_improved ? C.good : C.warn }]}>
                    {returns.assigned_improved ? '+' : ''}{(returns.uplift_pp ?? 0).toFixed(1)} п.п.
                  </Text>
                  <Text style={cs.upliftHint} numberOfLines={2}>
                    {returns.assigned_improved
                      ? 'награда подняла возвраты'
                      : 'награда не подняла возвраты'}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {canCancel && (
        <View style={[s.modalFooter, r.isTiny && s.actionsStack]}>
          <Pressable
            style={[s.btn, s.btnDanger, cancelling && { opacity: 0.5 }]}
            {...ripple()}
            onPress={onCancel}
            disabled={cancelling}
          >
            {cancelling
              ? <ActivityIndicator size="small" color={C.warn} />
              : <Ban size={14} color={C.warn} strokeWidth={2.2} />
            }
            <Text style={s.btnDangerText}>Отменить кампанию</Text>
          </Pressable>
        </View>
      )}
    </SheetModal>
  );
};

// ─────────────────────────────────────────────
// Бейдж статуса
// ─────────────────────────────────────────────
const StatusBadge: React.FC<{ status?: string; label?: string }> = ({ status, label }) => {
  const tone = statusTone(status);
  return (
    <View style={[cs.badge, { backgroundColor: tone.bg }]}>
      <Text style={[cs.badgeText, { color: tone.ink }]} numberOfLines={1}>
        {label || status || '—'}
      </Text>
    </View>
  );
};

function statusTone(status?: string): { bg: string; ink: string } {
  switch (String(status)) {
    case 'completed':        return { bg: C.goodSoft, ink: C.good };
    case 'processing':
    case 'queued':           return { bg: C.purpleSoft, ink: C.purpleDeep };
    case 'partially_failed': return { bg: C.watchSoft, ink: C.watch };
    case 'failed':           return { bg: C.warnSoft, ink: C.warn };
    case 'cancelled':        return { bg: C.lineSoft, ink: C.ink3 };
    default:                 return { bg: C.lineSoft, ink: C.ink3 };
  }
}

function pct(v: number | null | undefined): string {
  return `${(v ?? 0).toFixed(1)}%`;
}

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

// ─────────────────────────────────────────────
// Локальные стили
// ─────────────────────────────────────────────
const cs = StyleSheet.create({
  center: { paddingVertical: 26, paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  centerText: {
    fontFamily: F.semibold, fontSize: 12, color: C.ink3,
    textAlign: 'center', lineHeight: 17,
  },
  retry: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, overflow: 'hidden',
    backgroundColor: C.purpleSoft,
  },
  retryText: { fontFamily: F.bold, fontSize: 12, color: C.purpleDeep },

  row: {
    paddingHorizontal: 14, paddingVertical: 12, gap: 4,
    borderBottomWidth: 1, borderBottomColor: C.lineSoft,
  },
  rowLast: { borderBottomWidth: 0 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rowName: {
    flex: 1, minWidth: 0,
    fontFamily: F.bold, fontSize: 13, color: C.ink, letterSpacing: -0.2,
  },
  rowMeta: { fontFamily: F.medium, fontSize: 11, color: C.ink3, lineHeight: 15 },
  rowNums: { fontFamily: F.semibold, fontSize: 11, color: C.ink4 },
  rowNumsAccent: { fontFamily: F.extrabold, color: C.purpleDeep },

  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, maxWidth: 120,
  },
  badgeText: { fontFamily: F.extrabold, fontSize: 9.5, letterSpacing: 0.4 },

  headMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  headMetaText: { flex: 1, minWidth: 0, fontFamily: F.medium, fontSize: 11, color: C.ink3, lineHeight: 15 },

  card: {
    marginBottom: 14,
    backgroundColor: C.paper, borderRadius: 12,
    borderWidth: 1, borderColor: C.line,
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 2,
  },
  cardTitle: {
    fontFamily: F.extrabold, fontSize: 10, letterSpacing: 1.6,
    color: C.ink3, marginBottom: 2,
  },

  uplift: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 8, marginBottom: 10,
    paddingHorizontal: 10, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1,
  },
  upliftGood: { backgroundColor: C.goodSoft, borderColor: '#A7F3C2' },
  upliftBad: { backgroundColor: C.warnSoft, borderColor: '#FCA5A5' },
  upliftText: { fontFamily: F.extrabold, fontSize: 14, letterSpacing: -0.2 },
  upliftHint: { flex: 1, minWidth: 0, fontFamily: F.medium, fontSize: 11, color: C.ink3, lineHeight: 15 },
});

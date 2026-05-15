import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, KeyRound, AlertTriangle, Zap } from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { fetchDailyCodes, fetchBranches, generateDailyCode } from '../api';
import { makeStyles } from '../styles';
import { Skeleton } from '../components/Skeleton';
import type { DailyCode, RFBranch } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// DAILY CODES SCREEN — read-only сегодня, emergency-кнопка если нет, история
// ════════════════════════════════════════════════════════════════════
const TODAY = new Date().toISOString().slice(0, 10);

export const DailyCodesScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [codes, setCodes] = useState<DailyCode[]>([]);
  const [branches, setBranches] = useState<RFBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);   // branch_id

  const load = async () => {
    try {
      const [c, br] = await Promise.all([fetchDailyCodes(), fetchBranches()]);
      setCodes(c); setBranches(br);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);
  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  const onGenerate = (branchId: number, branchName: string) => {
    haptic('warning');
    Alert.alert(
      'Сгенерировать код?',
      `На сегодня для «${branchName}» нет авто-сгенерированного кода. Создать вручную?\n\nИспользуйте только если автогенерация не сработала — обычно код приходит автоматически в полночь.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сгенерировать', onPress: async () => {
            setGenerating(branchId);
            try {
              const newCode = await generateDailyCode({ branch_id: branchId, purpose: 'BIRTHDAY' });
              setCodes(prev => [newCode, ...prev]);
              haptic('success');
            } catch (e: any) {
              haptic('error');
              Alert.alert('Ошибка', e?.message ?? 'Не удалось сгенерировать');
            } finally { setGenerating(null); }
          },
        },
      ],
    );
  };

  const todayCodes = codes.filter(c => c.valid_date === TODAY);
  const historyCodes = codes
    .filter(c => c.valid_date !== TODAY)
    .sort((a, b) => b.valid_date.localeCompare(a.valid_date) || b.created_at.localeCompare(a.created_at));

  const branchesActive = branches.filter(b => b.id !== 0);
  // Группируем код для каждой точки на сегодня
  const todayByBranch = new Map<number, DailyCode>();
  todayCodes.forEach(c => { if (!todayByBranch.has(c.branch_id)) todayByBranch.set(c.branch_id, c); });

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>Точка</Text>
          <Text style={s.screenTitleMain}>Коды дня</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
      >
        {/* Объяснение */}
        <View style={[s.modalHint, { marginHorizontal: r.pad, marginBottom: 14 }]}>
          <View style={s.modalHintHeader}>
            <KeyRound size={12} color={C.hintInk} strokeWidth={2.4} />
            <Text style={s.modalHintTitle}>Что это</Text>
          </View>
          <Text style={s.modalHintText}>
            Код дня — это секретный 4-значный код, который персонал называет имениннику чтобы тот активировал свой подарок ко ДР. Коды генерируются автоматически каждую ночь в 00:05 для каждой точки. Сообщите код официантам/баристам утром.
          </Text>
        </View>

        {/* Сегодня */}
        <Text style={s.menuSectionTitle}>Сегодня · {fmtDateRu(TODAY)}</Text>
        {loading ? (
          <View style={{ paddingHorizontal: r.pad, gap: 10 }}>
            {[1, 2, 3].map(i => <Skeleton key={i} w="100%" h={70} radius={14} />)}
          </View>
        ) : (
          branchesActive.map(b => {
            const code = todayByBranch.get(b.id);
            const missing = !code;
            const isGen = generating === b.id;
            return (
              <View key={b.id} style={[s.codeCard, missing && s.codeCardMissing]}>
                <View style={s.codeBranch}>
                  <Text style={s.codeBranchName} numberOfLines={1}>{b.name}</Text>
                  <Text style={s.codeBranchSub}>
                    {missing
                      ? '⚠ Авто-генерация не сработала'
                      : code.generated_by === 'MANUAL' ? 'Сгенерирован вручную' : 'Авто-генерация'}
                  </Text>
                </View>
                {missing ? (
                  <Pressable
                    style={[s.btn, { backgroundColor: C.warn, borderColor: C.warn, paddingHorizontal: 14 }]}
                    {...ripple('rgba(255,255,255,0.22)')}
                    onPress={() => onGenerate(b.id, b.name)}
                    disabled={isGen}
                  >
                    {isGen
                      ? <ActivityIndicator size="small" color={C.surface} />
                      : <Zap size={14} color={C.surface} strokeWidth={2.4} />
                    }
                    <Text style={[s.btnPrimaryText, { fontSize: 12 }]}>
                      {isGen ? '...' : 'СГЕНЕРИРОВАТЬ'}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={s.codeBig}>{code.code}</Text>
                )}
              </View>
            );
          })
        )}

        {/* Если есть пропуски — большая warning */}
        {!loading && branchesActive.some(b => !todayByBranch.has(b.id)) && (
          <View style={[s.requireReplyHint, { marginHorizontal: r.pad, marginTop: 4, marginBottom: 14 }]}>
            <AlertTriangle size={13} color={C.warn} strokeWidth={2.2} />
            <Text style={s.requireReplyHintText}>
              На некоторых точках нет авто-сгенерированного кода. Это значит — упало задание ночью. Сгенерируйте вручную и сообщите менеджеру ЛоялUP, чтобы починили автогенерацию.
            </Text>
          </View>
        )}

        {/* История */}
        <View style={s.secHead}>
          <Text style={s.secTitle}>История</Text>
          <Text style={s.secMeta}>{historyCodes.length} {plural(historyCodes.length, ['запись', 'записи', 'записей'])}</Text>
        </View>
        <View style={[s.feedCard, { paddingHorizontal: 0 }]}>
          {historyCodes.length === 0 ? (
            <View style={s.feedRow}>
              <Text style={s.feedSub}>Ещё нет истории</Text>
            </View>
          ) : (
            historyCodes.map((c, i, arr) => (
              <View key={c.id} style={[s.feedRow, i === arr.length - 1 && s.feedRowLast]}>
                <View style={[s.feedIcon, { backgroundColor: c.generated_by === 'MANUAL' ? C.warnSoft : C.purpleSoft }]}>
                  {c.generated_by === 'MANUAL'
                    ? <Zap size={14} color={C.warn} strokeWidth={2.4} />
                    : <KeyRound size={14} color={C.purpleDeep} strokeWidth={2.4} />
                  }
                </View>
                <View style={s.feedText}>
                  <Text style={s.feedTitle}>{c.branch_name ?? `Точка #${c.branch_id}`}</Text>
                  <Text style={s.feedSub}>{fmtDateRu(c.valid_date)} · {c.generated_by === 'MANUAL' ? 'вручную' : 'авто'}</Text>
                </View>
                <Text style={[s.feedTime, { fontFamily: 'Manrope_800ExtraBold', fontSize: 16, color: C.ink, letterSpacing: 1.5 }]}>
                  {c.code}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

function fmtDateRu(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const today = new Date().toISOString().slice(0, 10);
  const yest = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (iso === today) return `Сегодня, ${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]}`;
  if (iso === yest)  return `Вчера, ${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]}`;
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]}`;
}

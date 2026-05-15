import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Sparkles, MessageSquare, Users, BarChart3, Store, SlidersHorizontal,
  HelpCircle, LogOut, ChevronRight, Phone, Bell, Bot, User, Megaphone, Shield,
  Gift, Target, FolderTree, KeyRound, CloudOff,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { makeStyles } from '../styles';
import { AutoReplySettings } from './AutoReplySettings';
import { ManagerContact } from './ManagerContact';
import { CampaignsScreen } from './CampaignsScreen';
import { GuestsScreen } from './GuestsScreen';
import { BranchesScreen } from './BranchesScreen';
import { RFThresholdsScreen } from './RFThresholdsScreen';
import { ProfileScreen } from './ProfileScreen';
import { StaffScreen } from './StaffScreen';
import { HelpScreen } from './HelpScreen';
import { GeneralStatsScreen } from './GeneralStatsScreen';
import { ReportsScreen } from './ReportsScreen';
import { CatalogScreen } from './CatalogScreen';
import { CategoriesScreen } from './CategoriesScreen';
import { QuestsScreen } from './QuestsScreen';
import { PromotionsScreen } from './PromotionsScreen';
import { DailyCodesScreen } from './DailyCodesScreen';
import { AuditLogScreen } from './AuditLogScreen';
import { simulateLocalPush, type PushType } from '../push';
import { setForceOffline, isForceOffline } from '../network';
import type { AutoReplySettings as Settings, Review } from '../types';

// ════════════════════════════════════════════════════════════════════
// MORE SCREEN — меню с подразделами
// ════════════════════════════════════════════════════════════════════
type SubScreen =
  | 'auto-reply'
  | 'manager-contact'
  | 'campaigns'
  | 'guests'
  | 'branches'
  | 'rf-thresholds'
  | 'profile'
  | 'staff'
  | 'help'
  | 'general-stats'
  | 'reports'
  | 'catalog'
  | 'categories'
  | 'quests'
  | 'promotions'
  | 'daily-codes'
  | 'audit-log'
  | null;

export const MoreScreen: React.FC<{
  autoReplySettings: Settings;
  onAutoReplyChange: (s: Settings) => void;
  onOpenChat: () => void;
  reviews: Review[];
  onLogout?: () => void;
}> = ({ autoReplySettings, onAutoReplyChange, onOpenChat, reviews, onLogout }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);
  const [sub, setSub] = useState<SubScreen>(null);
  const [offline, setOffline] = useState<boolean>(isForceOffline());

  if (sub === 'auto-reply') {
    return (
      <AutoReplySettings
        settings={autoReplySettings}
        onChange={onAutoReplyChange}
        onBack={() => setSub(null)}
      />
    );
  }

  if (sub === 'manager-contact') {
    return (
      <ManagerContact
        onBack={() => setSub(null)}
        onOpenChat={() => { setSub(null); onOpenChat(); }}
      />
    );
  }

  if (sub === 'campaigns')     return <CampaignsScreen     onBack={() => setSub(null)} />;
  if (sub === 'guests')        return <GuestsScreen        onBack={() => setSub(null)} />;
  if (sub === 'branches')      return (
    <BranchesScreen
      onBack={() => setSub(null)}
      reviews={reviews}
      onContactManager={() => { setSub(null); onOpenChat(); }}
    />
  );
  if (sub === 'rf-thresholds') return <RFThresholdsScreen  onBack={() => setSub(null)} />;
  if (sub === 'profile')       return <ProfileScreen       onBack={() => setSub(null)} />;
  if (sub === 'staff')         return (
    <StaffScreen
      onBack={() => setSub(null)}
      onOpenAuditLog={() => setSub('audit-log')}
    />
  );
  if (sub === 'audit-log')     return <AuditLogScreen      onBack={() => setSub('staff')} />;
  if (sub === 'help')          return (
    <HelpScreen
      onBack={() => setSub(null)}
      onOpenChat={() => { setSub(null); onOpenChat(); }}
    />
  );
  if (sub === 'general-stats') return (
    <GeneralStatsScreen
      onBack={() => setSub(null)}
      onOpenReport={() => setSub('reports')}
    />
  );
  if (sub === 'reports')       return <ReportsScreen       onBack={() => setSub(null)} />;
  if (sub === 'catalog')       return (
    <CatalogScreen
      onBack={() => setSub(null)}
      onOpenCategories={() => setSub('categories')}
    />
  );
  if (sub === 'categories')    return <CategoriesScreen    onBack={() => setSub('catalog')} />;
  if (sub === 'quests')        return <QuestsScreen        onBack={() => setSub(null)} />;
  if (sub === 'promotions')    return <PromotionsScreen    onBack={() => setSub(null)} />;
  if (sub === 'daily-codes')   return <DailyCodesScreen    onBack={() => setSub(null)} />;

  const open = (next: SubScreen) => () => { haptic('light'); setSub(next); };
  const stub = (label: string) => () => {
    haptic('light');
    alert(`«${label}» — в разработке`);
  };

  const fakePush = (type: PushType) => () => {
    haptic('medium');
    const review_id = type === 'review_new' || type === 'draft_ready' ? 1 : undefined;
    simulateLocalPush({ type, review_id });
  };

  // Мини-аггрегаты для подзаголовков пунктов
  const draftsCount = reviews.filter(rev => rev.has_draft && !rev.is_replied).length;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.screenHeader}>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>Кабинет</Text>
          <Text style={s.screenTitleMain}>Ещё</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>

        {/* ИНСТРУМЕНТЫ */}
        <View style={s.menuSection}>
          <Text style={s.menuSectionTitle}>Инструменты</Text>
          <View style={s.menuCard}>
            <MenuRow
              s={s}
              icon={<Sparkles size={18} color={C.purpleDeep} strokeWidth={2} />}
              iconBg={C.purpleSoft}
              title="Автоответы"
              sub={draftsCount > 0 ? `${draftsCount} черновик${draftsCount === 1 ? '' : draftsCount < 5 ? 'а' : 'ов'} ждут` : 'AI-черновики на новые отзывы'}
              valueText={autoReplySettings.enabled ? 'Вкл' : 'Выкл'}
              valueOn={autoReplySettings.enabled}
              onPress={open('auto-reply')}
            />
            <MenuRow
              s={s}
              icon={<Megaphone size={18} color={C.purpleDeep} strokeWidth={2} />}
              iconBg={C.purpleSoft}
              title="Рассылки"
              sub="История рассылок и охват"
              onPress={open('campaigns')}
            />
            <MenuRow
              s={s}
              icon={<Users size={18} color={C.purpleDeep} strokeWidth={2} />}
              iconBg={C.purpleSoft}
              title="Гости"
              sub="База клиентов с поиском"
              onPress={open('guests')}
            />
            <MenuRow
              s={s}
              icon={<BarChart3 size={18} color={C.purpleDeep} strokeWidth={2} />}
              iconBg={C.purpleSoft}
              title="Общая статистика"
              sub="QR, рассылки, ДР, индекс сканирования"
              onPress={open('general-stats')}
            />
            <MenuRow
              s={s}
              last
              icon={<MessageSquare size={18} color={C.purpleDeep} strokeWidth={2} />}
              iconBg={C.purpleSoft}
              title="Отчёт"
              sub="Расширенный отчёт с PDF-выгрузкой"
              onPress={open('reports')}
            />
          </View>
        </View>

        {/* КОНТЕНТ */}
        <View style={s.menuSection}>
          <Text style={s.menuSectionTitle}>Контент</Text>
          <View style={s.menuCard}>
            <MenuRow
              s={s}
              icon={<Gift size={18} color={C.limeDeep} strokeWidth={2} />}
              iconBg={C.limeSoft}
              title="Подарки"
              sub="Каталог подарков за баллы"
              onPress={open('catalog')}
            />
            <MenuRow
              s={s}
              icon={<FolderTree size={18} color={C.limeDeep} strokeWidth={2} />}
              iconBg={C.limeSoft}
              title="Категории подарков"
              sub="Структура каталога по точкам"
              onPress={open('categories')}
            />
            <MenuRow
              s={s}
              icon={<Target size={18} color={C.limeDeep} strokeWidth={2} />}
              iconBg={C.limeSoft}
              title="Квесты"
              sub="Задания для гостей за баллы"
              onPress={open('quests')}
            />
            <MenuRow
              s={s}
              icon={<Megaphone size={18} color={C.limeDeep} strokeWidth={2} />}
              iconBg={C.limeSoft}
              title="Акции"
              sub="Баннеры на главной приложения"
              onPress={open('promotions')}
            />
            <MenuRow
              s={s}
              last
              icon={<KeyRound size={18} color={C.limeDeep} strokeWidth={2} />}
              iconBg={C.limeSoft}
              title="Коды дня"
              sub="Авто-генерация ежедневно"
              onPress={open('daily-codes')}
            />
          </View>
        </View>

        {/* НАСТРОЙКИ */}
        <View style={s.menuSection}>
          <Text style={s.menuSectionTitle}>Настройки</Text>
          <View style={s.menuCard}>
            <MenuRow
              s={s}
              icon={<Store size={18} color={C.limeDeep} strokeWidth={2} />}
              iconBg={C.limeSoft}
              title="Точки"
              sub="Список филиалов и рейтинг"
              onPress={open('branches')}
            />
            <MenuRow
              s={s}
              icon={<SlidersHorizontal size={18} color={C.limeDeep} strokeWidth={2} />}
              iconBg={C.limeSoft}
              title="Пороги RF"
              sub="R3/R2/R1 · F1/F2 границы"
              onPress={open('rf-thresholds')}
            />
            <MenuRow
              s={s}
              icon={<User size={18} color={C.limeDeep} strokeWidth={2} />}
              iconBg={C.limeSoft}
              title="Профиль"
              sub="ФИО, аватар, дата рождения"
              onPress={open('profile')}
            />
            <MenuRow
              s={s}
              last
              icon={<Shield size={18} color={C.limeDeep} strokeWidth={2} />}
              iconBg={C.limeSoft}
              title="Сотрудники"
              sub="Управление доступом и правами"
              onPress={open('staff')}
            />
          </View>
        </View>

        {/* ПОДДЕРЖКА */}
        <View style={s.menuSection}>
          <Text style={s.menuSectionTitle}>Поддержка</Text>
          <View style={s.menuCard}>
            <MenuRow
              s={s}
              icon={<Phone size={18} color={C.purpleDeep} strokeWidth={2} />}
              iconBg={C.purpleSoft}
              title="Менеджер"
              sub="Звонок и контакты"
              onPress={open('manager-contact')}
            />
            <MenuRow
              s={s}
              icon={<HelpCircle size={18} color={C.ink2} strokeWidth={2} />}
              iconBg={C.lineSoft}
              title="Помощь"
              sub="База знаний и контакты"
              onPress={open('help')}
            />
            <MenuRow
              s={s}
              last
              icon={<LogOut size={18} color={C.warn} strokeWidth={2} />}
              iconBg={C.warnSoft}
              title="Выход"
              sub="Завершить сессию на этом устройстве"
              onPress={() => {
                haptic('warning');
                Alert.alert('Выйти из аккаунта?', 'Придётся снова ввести логин и пароль.', [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Выйти', style: 'destructive', onPress: () => onLogout?.() },
                ]);
              }}
            />
          </View>
        </View>

        {/* РАЗРАБОТКА — симулятор пушей */}
        <View style={s.menuSection}>
          <Text style={s.menuSectionTitle}>Симулятор пушей</Text>
          <View style={s.menuCard}>
            <MenuRow
              s={s}
              icon={<Bell size={18} color={C.warn} strokeWidth={2} />}
              iconBg={C.warnSoft}
              title="Новый отзыв"
              sub="Имитация пуша о свежем отзыве"
              onPress={fakePush('review_new')}
            />
            <MenuRow
              s={s}
              icon={<Bot size={18} color={C.purpleDeep} strokeWidth={2} />}
              iconBg={C.purpleSoft}
              title="AI-черновик готов"
              sub="Имитация пуша о подтверждении черновика"
              onPress={fakePush('draft_ready')}
            />
            <MenuRow
              s={s}
              last
              icon={<MessageSquare size={18} color={C.good} strokeWidth={2} />}
              iconBg={C.goodSoft}
              title="Сообщение от менеджера"
              sub="Имитация чат-уведомления"
              onPress={fakePush('chat_message')}
            />
          </View>
        </View>

        {/* DEBUG — оффлайн-режим */}
        <View style={s.menuSection}>
          <Text style={s.menuSectionTitle}>Debug</Text>
          <View style={s.menuCard}>
            <MenuRow
              s={s}
              last
              icon={<CloudOff size={18} color={offline ? '#FEF3C7' : C.ink2} strokeWidth={2} />}
              iconBg={offline ? '#92400E' : C.lineSoft}
              title={offline ? 'Оффлайн (включён)' : 'Оффлайн (выключен)'}
              sub="Симулятор отсутствия сети — данные берём из кэша"
              valueText={offline ? 'ВКЛ' : 'ВЫКЛ'}
              valueOn={offline}
              onPress={() => {
                haptic('light');
                const next = !offline;
                setForceOffline(next);
                setOffline(next);
              }}
            />
          </View>
        </View>

        <Text style={[s.menuSectionTitle, { paddingHorizontal: 0, textAlign: 'center', marginTop: 8 }]}>
          ЛоялUP · версия 1.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

// ────────────────────────────────────────────────
const MenuRow: React.FC<{
  s: ReturnType<typeof makeStyles>;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  sub?: string;
  valueText?: string;
  valueOn?: boolean;
  last?: boolean;
  onPress: () => void;
}> = ({ s, icon, iconBg, title, sub, valueText, valueOn, last, onPress }) => (
  <Pressable style={[s.menuRow, last && s.menuRowLast]} {...ripple()} onPress={onPress}>
    <View style={[s.menuIconWrap, { backgroundColor: iconBg }]}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={s.menuRowTitle}>{title}</Text>
      {sub && <Text style={s.menuRowSub}>{sub}</Text>}
    </View>
    {valueText && (
      <Text style={[s.menuRowValue, valueOn && s.menuRowValueOn]}>{valueText}</Text>
    )}
    <ChevronRight size={16} color={C.ink4} strokeWidth={2} />
  </Pressable>
);

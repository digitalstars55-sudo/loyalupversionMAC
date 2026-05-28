import React, { useMemo } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X, Star, MessageSquare, CreditCard, FileText, Megaphone,
  UserCheck, KeyRound, Cake, Bot,
} from 'lucide-react-native';
import { C } from '../theme';
import { useResponsive } from '../responsive';
import { makeStyles } from '../styles';
import { relativeTime } from '../helpers';
import type { PushType } from '../push';

export interface NotificationItem {
  id: string;
  type: PushType;
  title: string;
  body: string;
  receivedAt: string;
}

const TYPE_META: Record<PushType, { icon: React.ReactNode; color: string; bg: string }> = {
  review_new:         { icon: <Star size={18} strokeWidth={2} />,        color: C.warn,      bg: C.warnSoft },
  draft_ready:        { icon: <Bot size={18} strokeWidth={2} />,         color: C.purpleDeep, bg: C.purpleSoft },
  chat_message:       { icon: <MessageSquare size={18} strokeWidth={2}/>, color: C.purpleDeep, bg: C.purpleSoft },
  payment_due:        { icon: <CreditCard size={18} strokeWidth={2} />,  color: C.warn,       bg: C.warnSoft },
  report_ready:       { icon: <FileText size={18} strokeWidth={2} />,    color: C.limeDeep,   bg: C.limeSoft },
  broadcast_done:     { icon: <Megaphone size={18} strokeWidth={2} />,   color: C.purpleDeep, bg: C.purpleSoft },
  staff_invited:      { icon: <UserCheck size={18} strokeWidth={2} />,   color: C.good,       bg: C.goodSoft },
  daily_code_missing: { icon: <KeyRound size={18} strokeWidth={2} />,    color: C.warn,       bg: C.warnSoft },
  guest_birthday:     { icon: <Cake size={18} strokeWidth={2} />,        color: C.limeDeep,   bg: C.limeSoft },
};

export const NotificationsScreen: React.FC<{
  notifications: NotificationItem[];
  onClose: () => void;
  onTap: (item: NotificationItem) => void;
}> = ({ notifications, onClose, onTap }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.paper }]} edges={['top']}>
      <StatusBar style="dark" />
      <View style={[s.screenHeader, { paddingRight: 8 }]}>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>Система</Text>
          <Text style={s.screenTitleMain}>Уведомления</Text>
        </View>
        <Pressable
          style={[s.backBtn, { marginLeft: 'auto' }]}
          onPress={onClose}
          hitSlop={8}
        >
          <X size={18} color={C.ink} strokeWidth={2.2} />
        </Pressable>
      </View>

      {notifications.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={{ fontSize: 36 }}>🔔</Text>
          <Text style={[s.emptyStateTitle, { marginTop: 12 }]}>Пока нет уведомлений</Text>
          <Text style={s.emptyStateSub}>
            Пуши о новых отзывах, рассылках и других событиях появятся здесь.
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...notifications].reverse()}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: r.pad, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => {
            const meta = TYPE_META[item.type];
            return (
              <Pressable
                style={[s.listCard, { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }]}
                onPress={() => onTap(item)}
                android_ripple={{ color: C.lineSoft }}
              >
                <View style={[s.taskIconWrap, { backgroundColor: meta.bg, marginTop: 2 }]}>
                  {React.cloneElement(meta.icon as any, { color: meta.color })}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[s.listTitle, { fontSize: 13, marginBottom: 2 }]} numberOfLines={1}>
                    {item.title || typeLabel(item.type)}
                  </Text>
                  {!!item.body && (
                    <Text style={[s.listSub, { fontSize: 12 }]} numberOfLines={2}>
                      {item.body}
                    </Text>
                  )}
                </View>
                <Text style={[s.listTime, { marginTop: 2 }]}>{relativeTime(item.receivedAt)}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

export const PUSH_TYPE_LABELS: Record<PushType, string> = {
  review_new:         'Новый отзыв',
  draft_ready:        'AI-черновик готов',
  chat_message:       'Сообщение от менеджера',
  payment_due:        'Напоминание об оплате',
  report_ready:       'Отчёт готов',
  broadcast_done:     'Рассылка завершена',
  staff_invited:      'Сотрудник присоединился',
  daily_code_missing: 'Код дня не сгенерирован',
  guest_birthday:     'День рождения гостя',
};

function typeLabel(type: PushType): string {
  return PUSH_TYPE_LABELS[type] ?? type;
}

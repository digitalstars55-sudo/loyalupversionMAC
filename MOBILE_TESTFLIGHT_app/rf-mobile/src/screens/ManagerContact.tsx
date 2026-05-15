import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Phone, Clock, MessageSquare, Mail,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple, callPhone, formatPhone } from '../platform';
import { initials, relativeTime } from '../helpers';
import { fetchChatManager } from '../api';
import { makeStyles } from '../styles';
import type { ChatManager } from '../types';

// ════════════════════════════════════════════════════════════════════
// MANAGER CONTACT — карточка контактов менеджера (read-only)
// ════════════════════════════════════════════════════════════════════
export const ManagerContact: React.FC<{
  onBack: () => void;
  onOpenChat: () => void;
}> = ({ onBack, onOpenChat }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);
  const [manager, setManager] = useState<ChatManager | null>(null);

  useEffect(() => { fetchChatManager().then(setManager).catch(() => {}); }, []);

  if (!manager) {
    return (
      <SafeAreaView style={[s.root, s.center]} edges={['top']}>
        <StatusBar style="dark" />
        <ActivityIndicator color={C.purple} />
        <Text style={s.loadingText}>Загружаем контакт…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={() => { haptic('light'); onBack(); }}>
          <ArrowLeft size={18} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.screenTitleSuper}>Поддержка</Text>
          <Text style={s.screenTitleMain}>Менеджер</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Главная карточка */}
        <View style={s.contactCard}>
          <View style={s.contactBigAvatar}>
            <Text style={s.contactBigAvatarText}>{initials(manager.name)}</Text>
            {manager.online && <View style={s.contactBigAvatarDot} />}
          </View>
          <Text style={s.contactName}>{manager.name}</Text>
          <View style={s.contactRolePill}>
            <Text style={s.contactRolePillText}>{manager.role}</Text>
          </View>

          {/* Инфо-блок: телефон, часы, статус */}
          <View style={s.contactInfoRows}>
            {manager.phone && (
              <View style={s.contactInfoRow}>
                <View style={s.contactInfoIcon}>
                  <Phone size={15} color={C.purpleDeep} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.contactInfoLabel}>Телефон</Text>
                  <Text style={s.contactInfoValue} selectable>{formatPhone(manager.phone)}</Text>
                </View>
              </View>
            )}

            {manager.work_hours && (
              <View style={s.contactInfoRow}>
                <View style={s.contactInfoIcon}>
                  <Clock size={15} color={C.limeDeep} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.contactInfoLabel}>Рабочие часы</Text>
                  <Text style={s.contactInfoValueMuted}>{manager.work_hours}</Text>
                </View>
              </View>
            )}

            <View style={s.contactInfoRow}>
              <View style={s.contactInfoIcon}>
                <Mail size={15} color={C.ink3} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.contactInfoLabel}>Статус</Text>
                <Text style={[s.contactInfoValueMuted, manager.online && { color: C.good }]}>
                  {manager.online ? '● Онлайн в чате' : `Был ${relativeTime(manager.last_seen)}`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Действия */}
        <View style={s.contactActions}>
          {manager.phone && (
            <Pressable
              style={[s.btn, s.btnPrimary]}
              {...ripple('rgba(255,255,255,0.22)')}
              onPress={() => callPhone({ phone: manager.phone!, name: manager.name, workHours: manager.work_hours })}
            >
              <Phone size={14} color={C.surface} strokeWidth={2.2} />
              <Text style={s.btnPrimaryText}>Позвонить</Text>
            </Pressable>
          )}
          <Pressable
            style={[s.btn, s.btnSecondary]}
            {...ripple()}
            onPress={() => { haptic('light'); onOpenChat(); }}
          >
            <MessageSquare size={14} color={C.ink} strokeWidth={2} />
            <Text style={s.btnSecondaryText}>Открыть чат</Text>
          </Pressable>
        </View>

        <Text style={s.contactActionsHint}>
          Контакт назначает ЛоялUP. Если что-то изменилось — менеджер сам напишет вам в чат.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

import React, { useMemo, useState } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, ArrowRight, Eye, EyeOff, AtSign, ArrowLeft } from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { login } from '../api';
import { makeStyles } from '../styles';
import type { Profile } from '../types';

// ════════════════════════════════════════════════════════════════════
// AUTH SCREEN — экран логина
// ════════════════════════════════════════════════════════════════════
export const AuthScreen: React.FC<{
  onAuthorized: (token: string, profile: Profile, refresh?: string) => void;
  onBack?: () => void;          // если задан — рисуем «назад» в шапке (для ChoiceScreen flow)
}> = ({ onAuthorized, onBack }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<'login' | 'password' | null>(null);

  const valid = loginValue.trim().length >= 3 && password.length >= 4;

  const onSubmit = async () => {
    if (!valid) {
      setError('Введите логин (мин. 3 символа) и пароль (мин. 4 символа)');
      return;
    }
    haptic('medium');
    setError(null);
    setSubmitting(true);
    try {
      const res = await login({ login: loginValue.trim(), password });
      haptic('success');
      onAuthorized(res.token, res.profile, res.refresh);
    } catch (e: any) {
      haptic('error');
      setError(e?.message ?? 'Не удалось войти');
    } finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={s.authRoot} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {onBack && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <Pressable
              style={{
                width: 38, height: 38, borderRadius: 12,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
              }}
              {...ripple()}
              onPress={() => { haptic('light'); onBack(); }}
              accessibilityLabel="Назад на стартовый экран"
            >
              <ArrowLeft size={18} color={C.ink2} strokeWidth={2.2} />
            </Pressable>
          </View>
        )}
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={s.authLogo}>
            <View style={s.authLogoIcon}>
              <Text style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 28, color: C.surface, letterSpacing: -1 }}>Л</Text>
            </View>
            <Text style={s.authLogoText}>ЛоялUP</Text>
          </View>

          <Text style={s.authTitle}>Вход в кабинет</Text>
          <Text style={s.authSub}>
            Введите логин и пароль, выданные при подключении заведения. Если не помните — напишите менеджеру ЛоялUP.
          </Text>

          {/* Error */}
          {error && (
            <View style={s.authError}>
              <Text style={s.authErrorText}>{error}</Text>
            </View>
          )}

          {/* Login field */}
          <View style={[s.authField, focusedField === 'login' && s.authFieldFocused]}>
            <AtSign size={18} color={focusedField === 'login' ? C.purple : C.ink4} strokeWidth={2.2} />
            <TextInput
              style={s.authInput}
              value={loginValue}
              onChangeText={(t) => { setLoginValue(t); setError(null); }}
              placeholder="Email или телефон"
              placeholderTextColor={C.ink4}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onFocus={() => setFocusedField('login')}
              onBlur={() => setFocusedField(null)}
              returnKeyType="next"
            />
          </View>

          {/* Password field */}
          <View style={[s.authField, focusedField === 'password' && s.authFieldFocused]}>
            <Lock size={18} color={focusedField === 'password' ? C.purple : C.ink4} strokeWidth={2.2} />
            <TextInput
              style={s.authInput}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(null); }}
              placeholder="Пароль"
              placeholderTextColor={C.ink4}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
            <Pressable
              onPress={() => { haptic('light'); setShowPwd(p => !p); }}
              hitSlop={8}
              accessibilityLabel={showPwd ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showPwd
                ? <EyeOff size={18} color={C.ink4} strokeWidth={2.2} />
                : <Eye    size={18} color={C.ink4} strokeWidth={2.2} />
              }
            </Pressable>
          </View>

          {/* Submit */}
          <Pressable
            style={[s.authSubmit, !valid && { opacity: 0.5 }]}
            {...ripple('rgba(255,255,255,0.22)')}
            onPress={onSubmit}
            disabled={!valid || submitting}
          >
            {submitting
              ? <ActivityIndicator size="small" color={C.surface} />
              : <ArrowRight size={18} color={C.surface} strokeWidth={2.4} />
            }
            <Text style={s.authSubmitText}>{submitting ? 'Входим…' : 'Войти'}</Text>
          </Pressable>

          {/* Forgot password */}
          <Pressable
            onPress={() => Alert.alert(
              'Забыли пароль?',
              'Напишите менеджеру ЛоялUP — он вышлет ссылку для сброса. Email: support@levelup.ru',
            )}
          >
            <Text style={s.authForgot}>Забыли пароль?</Text>
          </Pressable>
        </ScrollView>

        {/* Footer */}
        <View style={s.authFooter}>
          <Text style={s.authFooterText}>
            Нажимая «Войти», вы соглашаетесь с условиями использования.{'\n'}
            ЛоялUP · версия 1.0
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

import React from 'react';
import { View, Text, Pressable, Image, Alert, Platform } from 'react-native';
import { Camera, X } from 'lucide-react-native';

import { C } from '../theme';
import { haptic, ripple } from '../platform';
import type { S } from '../styles';

// expo-image-picker — обёрнут в try/catch для web/без модуля
let ImagePicker: any = null;
try { ImagePicker = require('expo-image-picker'); } catch {}

// ════════════════════════════════════════════════════════════════════
// IMAGE PICKER FIELD — переиспользуемый компонент для CRUD-форм
// ════════════════════════════════════════════════════════════════════
export const ImagePickerField: React.FC<{
  s: S;
  uri: string | null | undefined;        // текущая картинка (URL или локальный uri)
  onChange: (uri: string | null) => void; // null = удалить
  aspect?: [number, number];              // соотношение сторон (по умолчанию 16:9)
  hint?: string;                          // подсказка под пустым полем
}> = ({ s, uri, onChange, aspect = [16, 9], hint }) => {
  const onPick = async () => {
    haptic('light');

    // Web — через input[type=file]
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file: File | undefined = e.target?.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => onChange(reader.result as string);
          reader.readAsDataURL(file);
        };
        input.click();
      } catch (e: any) {
        Alert.alert('Ошибка', e?.message ?? 'Не удалось выбрать файл');
      }
      return;
    }

    // Native — expo-image-picker
    if (!ImagePicker) {
      Alert.alert('Недоступно', 'Модуль выбора изображения не подключён в этой сборке.');
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm?.granted) {
        Alert.alert('Доступ к галерее', 'Разрешите доступ в настройках, чтобы прикреплять фото.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'Images',
        quality: 0.85,
        allowsEditing: true,
        aspect,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (asset?.uri) onChange(asset.uri);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось выбрать фото');
    }
  };

  if (!uri) {
    return (
      <View style={s.imgPickerWrap}>
        <Pressable style={s.imgPickerEmpty} {...ripple()} onPress={onPick}>
          <Camera size={26} color={C.ink3} strokeWidth={2} />
          <Text style={s.imgPickerEmptyText}>Добавить фото</Text>
          {hint && <Text style={s.imgPickerEmptyHint}>{hint}</Text>}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.imgPickerWrap}>
      <Pressable onPress={onPick}>
        <Image source={{ uri }} style={[s.imgPickerImg, { aspectRatio: aspect[0] / aspect[1] }]} resizeMode="cover" />
      </Pressable>
      <Pressable
        style={s.imgPickerRemove}
        onPress={() => { haptic('warning'); onChange(null); }}
      >
        <X size={14} color={C.surface} strokeWidth={2.6} />
      </Pressable>
    </View>
  );
};

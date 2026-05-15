import React from 'react';
import { View, Text, Pressable, Modal, FlatList, ActivityIndicator } from 'react-native';
import { X as XIcon, Users } from 'lucide-react-native';
import { C } from '../theme';
import { ripple } from '../platform';
import { fmtNum } from '../helpers';
import type { RFCell, SegmentInfo, Guest } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// GUEST LIST MODAL — список гостей выбранного сегмента
// ════════════════════════════════════════════════════════════════════
export const GuestListModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  info: SegmentInfo | null;
  cell: RFCell | null;
  guests: Guest[];
  loading: boolean;
  s: S;
}> = ({ visible, onClose, info, cell, guests, loading, s }) => {
  if (!info || !cell) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.modalRoot}>
        <Pressable style={s.modalBackdrop} onPress={onClose} />
        <View style={[s.modalSheet, s.modalSheetTall]}>
          <View style={s.modalHandle} />

          <View style={s.modalHeader}>
            <Text style={s.detailEmoji}>{info.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.modalSuper}>{info.code}</Text>
              <Text style={s.modalTitle} numberOfLines={1} ellipsizeMode="tail">{info.name}</Text>
            </View>
            <View style={s.guestCountChip}>
              <Text style={s.guestCountChipText}>
                {loading ? '…' : `${fmtNum(guests.length)} / ${fmtNum(cell.count)}`}
              </Text>
            </View>
            <Pressable style={s.modalClose} {...ripple()} onPress={onClose}>
              <XIcon size={18} color={C.ink} strokeWidth={2.2} />
            </Pressable>
          </View>

          {loading ? (
            <View style={s.guestsEmpty}>
              <ActivityIndicator color={C.purple} />
              <Text style={s.guestsEmptyText}>Загружаем гостей…</Text>
            </View>
          ) : guests.length === 0 ? (
            <View style={s.guestsEmpty}>
              <Users size={36} color={C.ink4} strokeWidth={1.5} />
              <Text style={s.guestsEmptyText}>В этом сегменте пока нет гостей</Text>
            </View>
          ) : (
            <FlatList
              data={guests}
              keyExtractor={(g) => g.vk_id}
              contentContainerStyle={s.guestsListContent}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <View style={s.guestCard}>
                  <View style={s.guestCardHead}>
                    <Text style={s.guestIdx}>#{index + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.guestName} numberOfLines={1} ellipsizeMode="tail">
                        {item.first_name} {item.last_name}
                      </Text>
                      <Text style={s.guestVk}>VK ID: {item.vk_id}</Text>
                    </View>
                    <View style={s.guestCoins}>
                      <Text style={s.guestCoinsVal}>{fmtNum(item.coins)}</Text>
                      <Text style={s.guestCoinsLbl}>коинов</Text>
                    </View>
                  </View>
                  <View style={s.guestStats}>
                    <View style={s.guestStat}>
                      <Text style={s.guestStatVal}>{item.frequency}</Text>
                      <Text style={s.guestStatLbl}>визитов</Text>
                    </View>
                    <View style={[s.guestStat, s.guestStatMid]}>
                      <Text style={s.guestStatVal}>{item.recency_days}</Text>
                      <Text style={s.guestStatLbl}>дн. назад</Text>
                    </View>
                    <View style={s.guestStat}>
                      <Text style={s.guestStatVal}>{item.last_visit}</Text>
                      <Text style={s.guestStatLbl}>посл. визит</Text>
                    </View>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

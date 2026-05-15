import React from 'react';
import { View, Text, Image, Pressable, Linking, Platform } from 'react-native';
import { Paperclip } from 'lucide-react-native';
import { C } from '../theme';
import { chatTime } from '../helpers';
import type { ChatMessage } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// CHAT BUBBLE — один пузырёк сообщения (с attachments)
// ════════════════════════════════════════════════════════════════════
export const ChatBubble: React.FC<{ msg: ChatMessage; s: S }> = ({ msg, s }) => {
  const isUser = msg.sender === 'user';
  const attachments = msg.attachments ?? [];

  const openFile = (uri: string) => {
    if (Platform.OS === 'web') {
      window.open(uri, '_blank');
      return;
    }
    Linking.openURL(uri).catch(() => {});
  };

  return (
    <View style={[s.bubbleRow, isUser ? s.bubbleRowUser : s.bubbleRowMgr]}>
      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleMgr]}>
        {!!msg.text && (
          <Text style={isUser ? s.bubbleTextUser : s.bubbleTextMgr}>{msg.text}</Text>
        )}

        {attachments.map((att, i) => (
          att.type === 'image' ? (
            <Pressable key={i} onPress={() => openFile(att.uri)}>
              <Image
                source={{ uri: att.uri }}
                style={s.bubbleImage}
                resizeMode="cover"
              />
            </Pressable>
          ) : (
            <Pressable
              key={i}
              style={[s.bubbleFile, !isUser && { backgroundColor: C.paper, borderWidth: 1, borderColor: C.line }]}
              onPress={() => openFile(att.uri)}
            >
              <Paperclip size={14} color={isUser ? C.surface : C.ink2} strokeWidth={2.2} />
              <Text
                style={[s.bubbleFileText, !isUser && { color: C.ink }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {att.name ?? 'Файл'}
              </Text>
            </Pressable>
          )
        ))}

        <View style={s.bubbleMetaRow}>
          <Text style={[s.bubbleTime, isUser ? s.bubbleTimeUser : s.bubbleTimeMgr]}>
            {chatTime(msg.created_at)}
          </Text>
          {isUser && msg.status && (
            <Text
              style={[
                s.bubbleStatus,
                {
                  color:
                    msg.status === 'sending' ? 'rgba(255,255,255,0.5)' :
                    msg.status === 'failed'  ? '#FCA5A5' :
                    msg.status === 'read'    ? C.lime :
                    'rgba(255,255,255,0.85)',
                },
              ]}
            >
              {msg.status === 'sending' ? '◌'
                : msg.status === 'failed' ? '⚠'
                : msg.status === 'read' ? '✓✓'
                : msg.status === 'delivered' ? '✓✓'
                : '✓'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

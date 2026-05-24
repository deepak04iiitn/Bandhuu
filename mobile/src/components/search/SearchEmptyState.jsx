import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const C = { ink: "#1C1410", muted: "#9C8D84" };

export default function SearchEmptyState({ query }) {
  return (
    <View style={s.wrap}>
      <Text style={s.emoji}>{query ? '🔍' : '👋'}</Text>
      <Text style={s.title}>
        {query ? `No one found for "${query}"` : 'Find your people'}
      </Text>
      <Text style={s.sub}>
        {query
          ? 'Try a different name, hometown city, or username.'
          : 'Search by name, hometown city, or @username to connect with your homies in different city.'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:  { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 10 },
  emoji: { fontSize: 44, marginBottom: 4 },
  title: { fontFamily: SERIF, fontSize: 18, fontWeight: '700', color: C.ink, textAlign: 'center' },
  sub:   { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 },
});

import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const C = {
  ink:        "#1C1410",
  inkMid:     "#5C4F47",
  inkMuted:   "#9C8D84",
  border:     "#E8E0D8",
  divider:    "#F0EAE3",
  surface:    "#FEFCFA",
  terra:      "#C84B0C",
  terraLight: "#FDF0EA",
  green:      "#1A6B4A",
  greenLight: "#E8F5EE",
};

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

const PALETTE = [
  { bg: '#FDF0EA', text: '#C84B0C' },
  { bg: '#EEF3FC', text: '#3B6CA8' },
  { bg: '#E8F5F1', text: '#1A7A5E' },
  { bg: '#FDEEF3', text: '#B83055' },
  { bg: '#F3EEFE', text: '#7040B8' },
];
const getAvatarPalette = (name) => PALETTE[(name?.charCodeAt(0) ?? 0) % PALETTE.length];

export default function SearchResultItem({ user, onPress, onConnect, isLast, connectingId }) {
  const pal         = getAvatarPalette(user.fullName);
  const hometown    = user.hometownCity || user.hometown;
  const currentCity = user.city || user.location?.split(',')[0]?.trim();
  const status      = user.connectionStatus;
  const isConnecting = connectingId === user._id;

  let connectLabel = '+ Connect';
  let connectStyle = s.connectPill;
  let connectTxt   = s.connectPillTxt;

  if (isConnecting) {
    connectLabel = '···';
  } else if (status === 'connected') {
    connectLabel = 'Connected'; connectStyle = [s.connectPill, s.connectDone]; connectTxt = s.connectDoneTxt;
  } else if (status === 'request_sent') {
    connectLabel = 'Requested'; connectStyle = [s.connectPill, s.connectSent]; connectTxt = s.connectSentTxt;
  } else if (status === 'request_received') {
    connectLabel = 'Accept'; connectStyle = [s.connectPill, s.connectAccept]; connectTxt = s.connectAcceptTxt;
  }

  return (
    <Pressable
      style={[s.row, !isLast && s.rowBorder]}
      onPress={() => onPress(user)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[s.avatar, { backgroundColor: pal.bg }]}>
        {user.profileImageUri
          ? <Image source={{ uri: user.profileImageUri }} style={s.avatarImg} />
          : <Text style={[s.avatarInitial, { color: pal.text }]}>{(user.fullName || '?')[0].toUpperCase()}</Text>
        }
      </View>

      {/* Info */}
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{user.fullName}</Text>
        {(hometown || currentCity) ? (
          <View style={s.journeyRow}>
            {hometown ? (
              <>
                <View style={s.journeyDot} />
                <Text style={s.journeyTxt} numberOfLines={1}>{hometown}</Text>
              </>
            ) : null}
            {hometown && currentCity ? (
              <MaterialIcons name="east" size={10} color={C.inkMuted} />
            ) : null}
            {currentCity ? (
              <Text style={s.journeyCity} numberOfLines={1}>{currentCity}</Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Connect button */}
      {onConnect && status !== 'self' && (
        <Pressable
          style={connectStyle}
          onPress={(e) => { e.stopPropagation?.(); onConnect(user); }}
          disabled={isConnecting || status === 'request_sent'}
          hitSlop={8}
        >
          <Text style={connectTxt}>{connectLabel}</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
    backgroundColor: C.surface,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, overflow: 'hidden',
  },
  avatarImg:     { width: 44, height: 44, borderRadius: 22 },
  avatarInitial: { fontSize: 18, fontWeight: '900' },
  info: { flex: 1, gap: 3, minWidth: 0 },
  name: {
    fontFamily: SERIF,
    fontSize: 14, fontWeight: '700', color: C.ink, letterSpacing: -0.2,
  },
  journeyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  journeyDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.terra },
  journeyTxt: { fontSize: 11, fontWeight: '600', color: C.terra },
  journeyCity:{ fontSize: 11, fontWeight: '500', color: C.inkMuted },
  connectPill: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1.5, borderColor: C.terra,
    flexShrink: 0,
  },
  connectPillTxt: { fontSize: 11, fontWeight: '700', color: C.terra },
  connectDone: { borderColor: C.border },
  connectDoneTxt: { fontSize: 11, fontWeight: '600', color: C.inkMuted },
  connectSent: { borderColor: C.green, backgroundColor: C.greenLight },
  connectSentTxt: { fontSize: 11, fontWeight: '700', color: C.green },
  connectAccept: { backgroundColor: C.terra, borderColor: C.terra },
  connectAcceptTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
});

import React, { useState, useRef } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const C = {
  ink:     "#1C1410",
  muted:   "#9C8D84",
  border:  "#E8E0D8",
  inputBg: "#F2EDE6",
  terra:   "#C84B0C",
  white:   "#FFFFFF",
};

export default function SearchInput({ value, onChangeText, placeholder }) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  return (
    <Pressable
      style={[s.wrap, focused && s.wrapFocused]}
      onPress={() => inputRef.current?.focus()}
    >
      <MaterialIcons name="search" size={18} color={focused ? C.terra : C.muted} />
      <TextInput
        ref={inputRef}
        style={s.input}
        placeholder={placeholder || "Search by name, city or hometown…"}
        placeholderTextColor={C.muted}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}>
          <MaterialIcons name="close" size={16} color={C.muted} />
        </Pressable>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: {
    height: 44,
    borderRadius: 12,
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },
  wrapFocused: { borderColor: C.terra, backgroundColor: C.white },
  input: { flex: 1, fontSize: 14, color: C.ink, fontWeight: '500', padding: 0 },
});

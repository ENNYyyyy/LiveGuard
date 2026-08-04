import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import colors from '../utils/colors';
import typography from '../utils/typography';

const PhoneInput = ({ value, onChangeText, error }) => {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  return (
    <View>
      <Text style={styles.label}>Phone number</Text>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={[styles.container, focused && styles.containerFocused, error && styles.containerError]}
      >
        <Text style={styles.prefix}>NGN ▼</Text>
        <View style={styles.divider} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="+234 (999) 000-0000"
          placeholderTextColor={colors.PLACEHOLDER_GREY}
          value={value}
          onChangeText={onChangeText}
          keyboardType="phone-pad"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </Pressable>
      {error && (
        <Text style={styles.errorText}>
          {typeof error === 'string' ? error : "Please don't leave empty"}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    ...typography.fieldLabel,
    marginBottom: 6,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.BACKGROUND_WHITE,
    borderWidth: 1.5,
    borderColor: colors.BORDER_GREY,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
  },
  containerFocused: {
    borderColor: colors.PRIMARY_BLUE,
  },
  containerError: {
    borderColor: colors.ERROR_RED,
  },
  prefix: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.TEXT_MEDIUM,
    marginRight: 10,
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: colors.BORDER_GREY,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.TEXT_DARK,
  },
  errorText: {
    fontSize: 13,
    color: colors.ERROR_RED,
    marginTop: 4,
  },
});

export default PhoneInput;

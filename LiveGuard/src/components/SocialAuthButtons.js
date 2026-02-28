import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const comingSoon = () => Alert.alert('Coming soon');

const SocialAuthButtons = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const BUTTONS = [
    { key: 'google1', text: 'G', textColor: '#4285F4' },
    { key: 'google2', text: 'G', textColor: '#4285F4' },
    { key: 'apple', iconName: 'logo-apple' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>or Continue with</Text>
      <View style={styles.row}>
        {BUTTONS.map(({ key, text, textColor, iconName }) => (
          <TouchableOpacity
            key={key}
            style={styles.btn}
            onPress={comingSoon}
            activeOpacity={0.75}
          >
            {iconName
              ? <Ionicons name={iconName} size={22} color={colors.TEXT_DARK} />
              : <Text style={[styles.icon, { color: textColor }]}>{text}</Text>
            }
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
  },
  label: {
    fontSize: 14,
    color: colors.TEXT_MEDIUM,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.BORDER_GREY,
    backgroundColor: colors.BACKGROUND_WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
    fontWeight: '700',
  },
});

export default SocialAuthButtons;

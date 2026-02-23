import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import colors from '../utils/colors';

const BUTTONS = [
  { key: 'google1', icon: 'G', iconColor: '#4285F4' },
  { key: 'google2', icon: 'G', iconColor: '#4285F4' },
  { key: 'apple',   icon: '🍎', iconColor: colors.TEXT_DARK },
];

const comingSoon = () => Alert.alert('Coming soon');

const SocialAuthButtons = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>or Continue with</Text>
      <View style={styles.row}>
        {BUTTONS.map(({ key, icon, iconColor }) => (
          <TouchableOpacity
            key={key}
            style={styles.btn}
            onPress={comingSoon}
            activeOpacity={0.75}
          >
            <Text style={[styles.icon, { color: iconColor }]}>{icon}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../utils/colors';
import { calculatePasswordStrength } from '../utils/helpers';

const FILL_COLORS = {
  0: colors.BORDER_GREY,
  1: '#EF4444',
  2: '#EF4444',
  3: '#F59E0B',
  4: '#16A34A',
  5: '#059669',
};

const PasswordStrengthBar = ({ password }) => {
  const strength = calculatePasswordStrength(password);
  const fillColor = FILL_COLORS[strength];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Password strength:</Text>
      <View style={styles.bars}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[styles.bar, { backgroundColor: i <= strength ? fillColor : colors.BORDER_GREY }]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginTop: 6,
  },
  label: {
    fontSize: 13,
    color: colors.TEXT_MEDIUM,
  },
  bars: {
    flexDirection: 'row',
    gap: 4,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
});

export default PasswordStrengthBar;

import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const OutlinedButton = ({ title, onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={styles.label}>{title}</Text>
    </TouchableOpacity>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.BORDER_GREY,
    marginHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  label: {
    fontWeight: '600',
    fontSize: 18,
    color: colors.TEXT_DARK,
  },
});

export default OutlinedButton;

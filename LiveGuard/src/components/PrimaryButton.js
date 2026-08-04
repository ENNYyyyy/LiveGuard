import React, { useMemo } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const PrimaryButton = ({ title, onPress, loading = false, disabled = false }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={[styles.button, (disabled || loading) && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <Text style={styles.label}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  button: {
    backgroundColor: colors.PRIMARY_BLUE,
    height: 56,
    borderRadius: 28,
    marginHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  label: {
    fontWeight: '600',
    fontSize: 18,
    color: '#FFFFFF',
  },
});

export default PrimaryButton;

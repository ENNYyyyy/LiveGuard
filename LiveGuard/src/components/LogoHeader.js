import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const LogoHeader = ({ size = 'small' }) => {
  const isLarge = size === 'large';
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <MaterialCommunityIcons
          name="shield-alert"
          size={isLarge ? 36 : 24}
          color={colors.PRIMARY_NAVY}
        />
        <Text style={isLarge ? styles.titleLarge : styles.titleSmall}>LiveGuard</Text>
      </View>
      {isLarge && (
        <Text style={styles.tagline}>Emergency Help Community</Text>
      )}
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleSmall: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.PRIMARY_NAVY,
  },
  titleLarge: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.PRIMARY_NAVY,
  },
  tagline: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '500',
    color: colors.PRIMARY_NAVY,
  },
});

export default LogoHeader;

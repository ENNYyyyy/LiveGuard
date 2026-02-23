import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../utils/colors';

const LogoHeader = ({ size = 'small' }) => {
  const isLarge = size === 'large';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={isLarge ? styles.iconLarge : styles.iconSmall}>🚨</Text>
        <Text style={isLarge ? styles.titleLarge : styles.titleSmall}>LiveGuard</Text>
      </View>
      {isLarge && (
        <Text style={styles.tagline}>Emergency Help Community</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconSmall: {
    fontSize: 24,
  },
  iconLarge: {
    fontSize: 36,
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

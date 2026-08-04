import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const LocationBar = ({ avatarUri, address, onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.75}>
      {/* Avatar with online dot */}
      <View style={styles.avatarWrapper}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>U</Text>
          </View>
        )}
        <View style={styles.onlineDot} />
      </View>

      {/* Address info */}
      <View style={styles.info}>
        <Text style={styles.label}>Your Current Address</Text>
        <Text style={styles.address} numberOfLines={1}>
          {address || 'Fetching location...'}
        </Text>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={20} color={colors.PLACEHOLDER_GREY} />
    </TouchableOpacity>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.CARD_WHITE,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarWrapper: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    backgroundColor: colors.PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.SUCCESS_GREEN,
    borderWidth: 1.5,
    borderColor: colors.CARD_WHITE,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.TEXT_DARK,
  },
  address: {
    fontSize: 13,
    color: colors.TEXT_MEDIUM,
  },
});

export default LocationBar;

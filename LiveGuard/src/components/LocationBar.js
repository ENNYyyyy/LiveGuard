import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../utils/colors';

const LocationBar = ({ avatarUri, address, onPress }) => {
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
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.BACKGROUND_WHITE,
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
    color: colors.BACKGROUND_WHITE,
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
    borderColor: colors.BACKGROUND_WHITE,
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
  chevron: {
    fontSize: 22,
    color: colors.PLACEHOLDER_GREY,
  },
});

export default LocationBar;

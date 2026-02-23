import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Sticky banner shown at the top of the screen when offline.
 * Props:
 *   visible (boolean) — renders nothing when false
 */
const NoInternetBanner = ({ visible }) => {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <View style={[styles.banner, { top: insets.top }]}>
      <Text style={styles.text}>
        No internet connection. Some features may not work.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999,
    height: 44,
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default NoInternetBanner;

import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import colors from '../utils/colors';
import typography from '../utils/typography';

const SOSButton = ({ onPress }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onPress?.();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      accessibilityLabel="Emergency SOS Button"
      style={styles.wrapper}
    >
      {/* Outermost glow — lowest opacity */}
      <Animated.View style={[styles.glow3, { transform: [{ scale: pulseAnim }] }]} />
      {/* Middle glow */}
      <Animated.View style={[styles.glow2, { transform: [{ scale: pulseAnim }] }]} />
      {/* Inner glow */}
      <View style={styles.glow1} />
      {/* Solid SOS circle */}
      <View style={styles.circle}>
        <Text style={styles.label}>SOS</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 250,
    height: 250,
  },
  glow3: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: `rgba(248,113,113,0.12)`, // SOS_GLOW ~12%
  },
  glow2: {
    position: 'absolute',
    width: 225,
    height: 225,
    borderRadius: 112,
    backgroundColor: `rgba(248,113,113,0.22)`, // SOS_GLOW ~22%
  },
  glow1: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: `rgba(248,113,113,0.32)`, // SOS_GLOW ~32%
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.SOS_RED,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.SOS_RED,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  label: {
    ...typography.sosText,
    letterSpacing: 4,
  },
});

export default SOSButton;

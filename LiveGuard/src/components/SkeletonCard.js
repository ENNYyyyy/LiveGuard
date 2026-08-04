import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const SkeletonBox = ({ width, height, borderRadius = 8, style }) => {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: colors.BORDER_GREY, opacity },
        style,
      ]}
    />
  );
};

export const SkeletonIncidentCard = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <SkeletonBox width={44} height={44} borderRadius={12} />
      <View style={styles.body}>
        <SkeletonBox width="70%" height={14} borderRadius={6} />
        <SkeletonBox width="45%" height={11} borderRadius={6} style={{ marginTop: 8 }} />
      </View>
      <SkeletonBox width={64} height={24} borderRadius={12} />
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.CARD_WHITE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  body: { flex: 1, gap: 4 },
});

export default SkeletonBox;

import React, { useMemo } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const LoadingOverlay = ({ visible, message = 'Please wait...' }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={colors.PRIMARY_BLUE} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.CARD_WHITE,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    minWidth: 160,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  message: {
    fontSize: 14,
    color: colors.TEXT_MEDIUM,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default LoadingOverlay;

import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

/**
 * Modal prompting the user to grant location permission.
 * Props:
 *   visible        (boolean)  — controls Modal visibility
 *   onOpenSettings (function) — called when "Open Settings" is pressed
 *   onDismiss      (function) — called when "Not Now" is pressed
 */
const LocationPermissionModal = ({ visible, onOpenSettings, onDismiss }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Ionicons name="location" size={48} color={colors.PRIMARY_BLUE} />

          <Text style={styles.title}>Location Access Required</Text>

          <Text style={styles.body}>
            Location access is required to send your exact coordinates to
            emergency responders.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={onOpenSettings} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Open Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlineBtn} onPress={onDismiss} activeOpacity={0.75}>
            <Text style={styles.outlineBtnText}>Not Now</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: colors.CARD_WHITE,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.TEXT_DARK,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: colors.TEXT_MEDIUM,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 4,
  },
  primaryBtn: {
    backgroundColor: colors.PRIMARY_BLUE,
    borderRadius: 100,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  outlineBtn: {
    borderRadius: 100,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.BORDER_GREY,
  },
  outlineBtnText: {
    color: colors.TEXT_MEDIUM,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default LocationPermissionModal;

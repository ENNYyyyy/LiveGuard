import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { createEmergencyAlert, fetchAlertHistory } from '../../store/alertSlice';
import { getFullLocationData } from '../../services/locationService';
import ChipSelector from '../../components/ChipSelector';
import PrimaryButton from '../../components/PrimaryButton';
import LoadingOverlay from '../../components/LoadingOverlay';
import NoInternetBanner from '../../components/NoInternetBanner';
import useNetInfo from '../../hooks/useNetInfo';
import { useTheme } from '../../context/ThemeContext';
import { EMERGENCY_TYPES, PRIORITY_LEVELS } from '../../utils/constants';
import { getContacts } from '../../services/contactsService';
import { Ionicons } from '@expo/vector-icons';

const PENDING_ALERT_KEY = 'PENDING_ALERT';

const EmergencyAlertScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const submitError = useSelector((state) => state.alert.submitError);
  const { isConnected } = useNetInfo();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [selectedType, setSelectedType] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [hasPendingAlert, setHasPendingAlert] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);

  // Success notification state
  const [showSuccess, setShowSuccess] = useState(false);
  const successAlertIdRef = useRef(null);
  const locationAddressRef = useRef('');
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PENDING_ALERT_KEY);
        if (raw) {
          const pending = JSON.parse(raw);
          setHasPendingAlert(true);
          if (pending.alert_type) setSelectedType(pending.alert_type);
          if (pending.priority_level) setSelectedPriority(pending.priority_level);
        }
      } catch {
        // Ignore read errors
      }
      const contacts = await getContacts();
      setEmergencyContacts(contacts);
    })();
  }, []);

  const validate = () => {
    const e = {};
    if (!selectedType)     e.type     = 'Please select an emergency type';
    if (!selectedPriority) e.priority = 'Please select a priority level';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleConfirm = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const locationData = await getFullLocationData();
      locationAddressRef.current = locationData.address || '';

      const alertPayload = {
        alert_type:     selectedType,
        priority_level: selectedPriority,
        latitude:       parseFloat(locationData.latitude.toFixed(7)),
        longitude:      parseFloat(locationData.longitude.toFixed(7)),
        accuracy:       locationData.accuracy,
      };

      const result = await dispatch(createEmergencyAlert(alertPayload));

      if (createEmergencyAlert.fulfilled.match(result)) {
        const createdAlertId = result.payload?.alert_id;
        successAlertIdRef.current = createdAlertId;
        setHasPendingAlert(false);
        setLoading(false);

        // Show success notification ON THIS SCREEN first
        setShowSuccess(true);
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6 }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();

        dispatch(fetchAlertHistory());
        AsyncStorage.removeItem(PENDING_ALERT_KEY).catch(() => {});

        // After 2.5 seconds, navigate to AlertStatusScreen
        setTimeout(() => {
          setShowSuccess(false);
          navigation.navigate('AlertStatusScreen', { alert_id: createdAlertId });
        }, 2500);

        return; // skip finally setLoading
      } else {
        await AsyncStorage.setItem(PENDING_ALERT_KEY, JSON.stringify(alertPayload));
        setHasPendingAlert(false);
      }
    } catch (err) {
      const msg = err?.message || 'Unable to get location. Please try again.';
      Alert.alert('Location Error', msg);
      try {
        await AsyncStorage.setItem(
          PENDING_ALERT_KEY,
          JSON.stringify({ alert_type: selectedType, priority_level: selectedPriority })
        );
      } catch {
        // Ignore write errors
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyContacts = async () => {
    if (emergencyContacts.length === 0) return;
    const phones = emergencyContacts.map(c => c.phone).join(',');
    const typeLabel = (selectedType || 'Emergency').replace(/_/g, ' ');
    const address = locationAddressRef.current;
    const message =
      `🚨 SOS ALERT via LiveGuard!\nEmergency: ${typeLabel}.` +
      (address ? `\nLocation: ${address}.` : '') +
      `\nPlease check on me immediately.`;
    const encoded = encodeURIComponent(message);
    const url =
      Platform.OS === 'ios'
        ? `sms:${phones}&body=${encoded}`
        : `sms:?addresses=${phones}&body=${encoded}`;
    try {
      await Linking.openURL(url);
    } catch {
      // silently fail — do not disrupt the alert flow
    }
  };

  const handleDismissPending = async () => {
    await AsyncStorage.removeItem(PENDING_ALERT_KEY);
    setHasPendingAlert(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LoadingOverlay visible={loading} message="Sending alert…" />

      <NoInternetBanner visible={!isConnected} />

      {/* Header */}
      <View style={[styles.header, !isConnected && styles.headerOffsetForBanner]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Emergency Alert</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Pending alert banner */}
        {hasPendingAlert && (
          <View style={styles.pendingBanner}>
            <View style={styles.pendingBannerLeft}>
              <Text style={styles.pendingBannerTitle}>You have an unsent alert.</Text>
              <Text style={styles.pendingBannerSub}>Form pre-filled. Tap Confirm to retry.</Text>
            </View>
            <TouchableOpacity onPress={handleDismissPending} style={styles.pendingBannerDismiss}>
              <Text style={styles.pendingBannerDismissText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Submission error with retry */}
        {submitError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorCardTitle}>Alert Failed</Text>
            <Text style={styles.errorCardMsg}>{submitError}</Text>
            <TouchableOpacity style={styles.errorRetryBtn} onPress={handleConfirm} disabled={loading}>
              <Text style={styles.errorRetryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Emergency Type */}
        <ChipSelector
          label="Emergency Type"
          options={EMERGENCY_TYPES}
          selectedKey={selectedType}
          onSelect={setSelectedType}
          required
        />
        {errors.type ? <Text style={styles.errorText}>{errors.type}</Text> : null}

        <View style={styles.gap20} />

        {/* Priority Level */}
        <ChipSelector
          label="Priority Level"
          options={PRIORITY_LEVELS}
          selectedKey={selectedPriority}
          onSelect={setSelectedPriority}
          required
        />
        {errors.priority ? <Text style={styles.errorText}>{errors.priority}</Text> : null}

        <View style={styles.gap32} />

        {/* Warning */}
        <View style={styles.warningCard}>
          <View style={styles.warningInner}>
            <Ionicons name="warning-outline" size={18} color={colors.WARNING_TEXT} />
            <Text style={styles.warningText}>
              Only use this in genuine emergencies. False alerts may result in penalties.
            </Text>
          </View>
        </View>

        <View style={styles.gap20} />

        <PrimaryButton
          title="Confirm Emergency Alert"
          onPress={handleConfirm}
          loading={loading}
        />

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Alert Sent Success overlay — shown on THIS screen before navigating */}
      <Modal visible={showSuccess} transparent animationType="none">
        <View style={styles.successOverlay}>
          <Animated.View
            style={[
              styles.successCard,
              { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
            ]}
          >
            <Ionicons name="checkmark-circle" size={60} color="#16A34A" style={styles.successIcon} />
            <Text style={styles.successTitle}>Alert Sent!</Text>
            <Text style={styles.successSub}>
              Your emergency alert has been received.{'\n'}Connecting you to emergency services…
            </Text>
            {emergencyContacts.length > 0 && (
              <TouchableOpacity
                style={styles.notifyBtn}
                onPress={handleNotifyContacts}
                activeOpacity={0.8}
              >
                <View style={styles.notifyBtnInner}>
                  <Ionicons name="phone-portrait-outline" size={16} color="#2563EB" />
                  <Text style={styles.notifyBtnText}>
                    Notify {emergencyContacts.length} emergency contact{emergencyContacts.length > 1 ? 's' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            <ActivityIndicator color="#2563EB" size="small" style={styles.successSpinner} />
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.BACKGROUND_LIGHT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.BACKGROUND_WHITE,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER_GREY,
  },
  headerOffsetForBanner: {
    marginTop: 44,
  },
  backBtn: {
    width: 32,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.TEXT_DARK,
  },
  headerRight: {
    width: 32,
  },
  container: {
    padding: 24,
    paddingBottom: 48,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.PENDING_BANNER_BG,
    borderWidth: 1,
    borderColor: colors.PENDING_BANNER_BORDER,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  pendingBannerLeft: {
    flex: 1,
    gap: 2,
  },
  pendingBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.PENDING_TITLE_TEXT,
  },
  pendingBannerSub: {
    fontSize: 12,
    color: colors.PENDING_SUB_TEXT,
  },
  pendingBannerDismiss: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  pendingBannerDismissText: {
    fontSize: 16,
    color: colors.PENDING_SUB_TEXT,
    fontWeight: '700',
  },
  errorCard: {
    backgroundColor: colors.ERROR_CARD_BG,
    borderWidth: 1,
    borderColor: colors.ERROR_CARD_BORDER,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 8,
    alignItems: 'flex-start',
  },
  errorCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ERROR_RED,
  },
  errorCardMsg: {
    fontSize: 13,
    color: colors.ERROR_RED,
    lineHeight: 19,
  },
  errorRetryBtn: {
    marginTop: 4,
    backgroundColor: colors.ERROR_RED,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  errorRetryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 13,
    color: colors.ERROR_RED,
    marginTop: 4,
  },
  warningCard: {
    backgroundColor: colors.WARNING_BG,
    borderRadius: 12,
    padding: 14,
  },
  warningInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.WARNING_TEXT,
    fontWeight: '500',
    lineHeight: 20,
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.TEXT_MEDIUM,
  },
  gap20: { height: 20 },
  gap32: { height: 32 },
  // Success overlay (modal)
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 36,
    alignItems: 'center',
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  successSub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
  },
  notifyBtn: {
    marginTop: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  notifyBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  successSpinner: {
    marginTop: 16,
  },
});

export default EmergencyAlertScreen;

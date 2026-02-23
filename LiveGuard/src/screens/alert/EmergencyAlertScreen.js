import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { createEmergencyAlert } from '../../store/alertSlice';
import { getFullLocationData } from '../../services/locationService';
import ChipSelector from '../../components/ChipSelector';
import PrimaryButton from '../../components/PrimaryButton';
import LoadingOverlay from '../../components/LoadingOverlay';
import NoInternetBanner from '../../components/NoInternetBanner';
import useNetInfo from '../../hooks/useNetInfo';
import colors from '../../utils/colors';
import { EMERGENCY_TYPES, PRIORITY_LEVELS } from '../../utils/constants';

const PENDING_ALERT_KEY = 'PENDING_ALERT';

const EmergencyAlertScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { isConnected } = useNetInfo();

  const [selectedType, setSelectedType] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [hasPendingAlert, setHasPendingAlert] = useState(false);

  // On mount: check for a cached pending alert
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PENDING_ALERT_KEY);
        if (raw) {
          const pending = JSON.parse(raw);
          setHasPendingAlert(true);
          // Pre-fill form with cached values
          if (pending.alert_type) setSelectedType(pending.alert_type);
          if (pending.priority_level) setSelectedPriority(pending.priority_level);
        }
      } catch {
        // Ignore read errors
      }
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
    setSubmitError(null);
    try {
      // Fresh GPS
      const locationData = await getFullLocationData();

      const alertPayload = {
        alert_type:     selectedType,
        priority_level: selectedPriority,
        latitude:       locationData.latitude,
        longitude:      locationData.longitude,
        accuracy:       locationData.accuracy,
      };

      const result = await dispatch(createEmergencyAlert(alertPayload));

      if (createEmergencyAlert.fulfilled.match(result)) {
        // Clear any cached pending alert on success
        await AsyncStorage.removeItem(PENDING_ALERT_KEY);
        setHasPendingAlert(false);
        navigation.navigate('AlertStatusScreen');
      } else {
        const msg = result.payload || 'Something went wrong. Please try again.';
        setSubmitError(msg);
        // Cache the failed alert data for retry
        await AsyncStorage.setItem(PENDING_ALERT_KEY, JSON.stringify(alertPayload));
        setHasPendingAlert(false); // banner no longer needed since we just tried
      }
    } catch (err) {
      const msg = err?.message || 'Unable to get location. Please try again.';
      setSubmitError(msg);
      // Cache what we can
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

  const handleDismissPending = async () => {
    await AsyncStorage.removeItem(PENDING_ALERT_KEY);
    setHasPendingAlert(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LoadingOverlay visible={loading} message="Sending alert…" />

      {/* Offline banner */}
      <NoInternetBanner visible={!isConnected} />

      {/* Header */}
      <View style={[styles.header, !isConnected && styles.headerOffsetForBanner]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
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

        {/* Submission error with prominent retry */}
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
          <Text style={styles.warningText}>
            ⚠️ Only use this in genuine emergencies. False alerts may result in penalties.
          </Text>
        </View>

        <View style={styles.gap20} />

        <PrimaryButton
          title="🚨  Confirm Emergency Alert"
          onPress={handleConfirm}
          loading={loading}
        />

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  backIcon: {
    fontSize: 24,
    color: colors.TEXT_DARK,
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
  // Pending alert banner
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
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
    color: '#92400E',
  },
  pendingBannerSub: {
    fontSize: 12,
    color: '#B45309',
  },
  pendingBannerDismiss: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  pendingBannerDismissText: {
    fontSize: 16,
    color: '#B45309',
    fontWeight: '700',
  },
  // Submission error card
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
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
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 14,
  },
  warningText: {
    fontSize: 13,
    color: '#F57C00',
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
});

export default EmergencyAlertScreen;

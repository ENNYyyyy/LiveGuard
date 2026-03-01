import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Animated,
  Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { cancelAlert, fetchAlertStatus, updateAlertLocation, rateAlert } from '../../store/alertSlice';
import StatusTimeline from '../../components/StatusTimeline';
import StatusBadge from '../../components/StatusBadge';
import NoInternetBanner from '../../components/NoInternetBanner';
import useNetInfo from '../../hooks/useNetInfo';
import { useTheme } from '../../context/ThemeContext';
import { DARK_MAP_STYLE } from '../../utils/mapStyles';
import typography from '../../utils/typography';
import { formatTime } from '../../utils/helpers';

const STATUS_ORDER  = ['PENDING', 'DISPATCHED', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED'];
const STEP_LABELS   = ['Alert Sent', 'Dispatched', 'Acknowledged', 'En Route', 'Resolved'];
const CANCEL_WINDOW = 60; // seconds

function buildSteps(status, createdAt) {
  const currentIndex = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER.map((s, i) => ({
    label: STEP_LABELS[i],
    completed: i <= currentIndex,
    time: i === 0 && createdAt ? formatTime(createdAt) : undefined,
  }));
}

const TERMINAL_STATUSES    = ['RESOLVED', 'CANCELLED'];
const CANCELLABLE_STATUSES = ['PENDING', 'DISPATCHED'];
const RATED_ALERTS_KEY     = 'RATED_ALERTS';

// ── Simple inline toast ────────────────────────────────────────────────────────
const Toast = ({ toast, colors }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [toast]);

  if (!toast) return null;
  const isSuccess = toast.type === 'success';
  return (
    <Animated.View
      style={[
        toastStyles.container,
        { backgroundColor: isSuccess ? '#16A34A' : '#DC2626', opacity },
      ]}
    >
      <Ionicons
        name={isSuccess ? 'checkmark-circle' : 'alert-circle'}
        size={16}
        color="#FFFFFF"
      />
      <Text style={toastStyles.text}>{toast.message}</Text>
    </Animated.View>
  );
};

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});

// ── Screen ─────────────────────────────────────────────────────────────────────
const AlertStatusScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { currentAlert, loading, statusError } = useSelector((state) => state.alert);
  const { isConnected } = useNetInfo();
  const isFocused = useIsFocused();
  const locationSubscription = useRef(null);
  const toastTimer = useRef(null);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [cancelSecondsLeft, setCancelSecondsLeft] = useState(CANCEL_WINDOW);
  const [toast, setToast] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const ratingShownRef = useRef(false);

  // On mount: check if this alert was already rated so modal never re-opens
  useEffect(() => {
    if (!currentAlert?.alert_id) return;
    AsyncStorage.getItem(RATED_ALERTS_KEY).then((raw) => {
      const rated = raw ? JSON.parse(raw) : [];
      if (rated.includes(currentAlert.alert_id)) {
        ratingShownRef.current = true;
      }
    });
  }, [currentAlert?.alert_id]);

  const showToast = (message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 2700);
  };

  const goHome = () => {
    navigation.navigate('MainDrawer', {
      screen: 'MainTabs',
      params: { screen: 'HomeTab' },
    });
  };

  const alertId =
    route?.params?.alert_id ?? route?.params?.alertId ?? currentAlert?.alert_id;
  const isTerminal = TERMINAL_STATUSES.includes(currentAlert?.status);
  const isCancellable = CANCELLABLE_STATUSES.includes(currentAlert?.status);

  const doFetch = () => {
    if (alertId) dispatch(fetchAlertStatus(alertId));
  };

  // ── Poll alert status ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isFocused || !alertId) return;
    doFetch();
    if (isTerminal) return;
    const interval = setInterval(doFetch, 5000);
    return () => clearInterval(interval);
  }, [isFocused, isTerminal, alertId]);

  // ── 60-second cancel countdown ───────────────────────────────────────────────
  useEffect(() => {
    if (!currentAlert?.created_at || isTerminal) return;

    const tick = () => {
      const elapsed = Math.floor(
        (Date.now() - new Date(currentAlert.created_at).getTime()) / 1000
      );
      const left = Math.max(0, CANCEL_WINDOW - elapsed);
      setCancelSecondsLeft(left);
    };

    tick(); // run immediately
    const countdown = setInterval(tick, 1000);
    return () => clearInterval(countdown);
  }, [currentAlert?.created_at, isTerminal]);

  // ── Live location streaming ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isFocused || isTerminal || !alertId) return;

    (async () => {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== 'granted') return;

      locationSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 15, timeInterval: 10000 },
        (loc) => {
          dispatch(updateAlertLocation({
            alertId,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
          }));
        }
      );
    })();

    return () => {
      locationSubscription.current?.remove();
      locationSubscription.current = null;
    };
  }, [isFocused, isTerminal, alertId]);

  // Show rating modal once when alert is RESOLVED
  useEffect(() => {
    if (currentAlert?.status === 'RESOLVED' && !ratingShownRef.current && !ratingSubmitted) {
      ratingShownRef.current = true;
      setTimeout(() => setShowRating(true), 800);
    }
  }, [currentAlert?.status]);

  const handleRatingSubmit = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRatingSubmitted(true);
    setShowRating(false);
    showToast('Thank you for your feedback!', 'success');

    // Persist locally so the modal never re-opens for this alert
    try {
      const raw = await AsyncStorage.getItem(RATED_ALERTS_KEY);
      const rated = raw ? JSON.parse(raw) : [];
      await AsyncStorage.setItem(
        RATED_ALERTS_KEY,
        JSON.stringify([...rated, currentAlert.alert_id])
      );
    } catch {
      // Ignore storage errors — rating is still sent to backend
    }

    // Fire-and-forget — backend saves the rating
    dispatch(rateAlert({ alertId: currentAlert.alert_id, rating }));
  };

  const firstAck = currentAlert?.assignments?.[0]?.acknowledgment;
  const canCancel = isCancellable && cancelSecondsLeft > 0;

  // Live ETA countdown
  const [etaRemaining, setEtaRemaining] = useState(null);
  useEffect(() => {
    if (!firstAck?.estimated_arrival || !currentAlert?.created_at || currentAlert.status === 'RESOLVED') {
      setEtaRemaining(null);
      return;
    }
    const etaSeconds = firstAck.estimated_arrival * 60;
    const base = new Date(currentAlert.created_at).getTime();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - base) / 1000);
      const remaining = Math.max(0, etaSeconds - elapsed);
      setEtaRemaining(remaining);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [firstAck?.estimated_arrival, currentAlert?.created_at, currentAlert?.status]);

  const handleCancel = () => {
    Alert.alert('Cancel Alert', 'Are you sure you want to cancel this alert?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          const result = await dispatch(cancelAlert(currentAlert?.alert_id));
          if (cancelAlert.fulfilled.match(result)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showToast('Alert cancelled.', 'success');
            setTimeout(goHome, 1200);
          } else {
            showToast('Failed to cancel. Try again.', 'error');
          }
        },
      },
    ]);
  };

  if (!currentAlert) {
    return (
      <SafeAreaView style={styles.safe}>
        <NoInternetBanner visible={!isConnected} />
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={56} color={colors.BORDER_GREY} />
          <Text style={styles.emptyText}>No active alert</Text>
          <TouchableOpacity onPress={goHome}>
            <Text style={styles.goHome}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const userCoord = {
    latitude:  currentAlert.location?.latitude  || 6.5244,
    longitude: currentAlert.location?.longitude || 3.3792,
  };
  const responderCoord = currentAlert.responder?.currentLocation;

  return (
    <SafeAreaView style={styles.safe}>
      <NoInternetBanner visible={!isConnected} />

      {/* Header */}
      <View style={[styles.header, !isConnected && styles.headerOffsetForBanner]}>
        <Text style={styles.headerTitle}>Alert Status</Text>
        <StatusBadge status={currentAlert.status} />
      </View>

      {/* API error bar */}
      {statusError && !loading ? (
        <TouchableOpacity style={styles.apiErrorBar} onPress={doFetch} activeOpacity={0.8}>
          <Text style={styles.apiErrorText}>
            Unable to load alert status. Check your connection.
          </Text>
          <View style={styles.apiErrorRetryRow}>
            <Text style={styles.apiErrorRetry}>Retry</Text>
            <Ionicons name="refresh" size={14} color={colors.ERROR_RED} />
          </View>
        </TouchableOpacity>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Map */}
        <View style={styles.mapWrapper}>
          <MapView
            style={styles.map}
            region={{
              latitude:       userCoord.latitude,
              longitude:      userCoord.longitude,
              latitudeDelta:  0.015,
              longitudeDelta: 0.015,
            }}
            scrollEnabled={false}
            customMapStyle={isDark ? DARK_MAP_STYLE : []}
            userInterfaceStyle={isDark ? 'dark' : 'light'}
          >
            <Marker coordinate={userCoord} pinColor={colors.SOS_RED} title="You" />
            {responderCoord && (
              <Marker coordinate={responderCoord} pinColor={colors.SUCCESS_GREEN} title="Responder" />
            )}
            {responderCoord && (
              <Polyline
                coordinates={[userCoord, responderCoord]}
                strokeColor={colors.PRIMARY_BLUE}
                strokeWidth={3}
                lineDashPattern={[6, 3]}
              />
            )}
          </MapView>
          {/* Locate-me FAB */}
          <TouchableOpacity
            style={[styles.locateMeBtn, { backgroundColor: colors.BACKGROUND_WHITE }]}
            activeOpacity={0.8}
            onPress={() => {/* map is already centred on user coord */}}
          >
            <Ionicons name="locate" size={18} color={colors.PRIMARY_BLUE} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* ETA */}
          {firstAck?.estimated_arrival && (
            <View style={styles.etaCard}>
              <Text style={styles.etaLabel}>Estimated Arrival</Text>
              {etaRemaining !== null ? (
                <>
                  <Text style={styles.etaValue}>
                    {Math.floor(etaRemaining / 60)}:{String(etaRemaining % 60).padStart(2, '0')}
                  </Text>
                  <Text style={styles.etaSub}>min remaining</Text>
                </>
              ) : (
                <Text style={styles.etaValue}>{firstAck.estimated_arrival} min</Text>
              )}
            </View>
          )}

          {/* Responder cards */}
          {currentAlert?.assignments?.map((asgmt) => {
            const ack   = asgmt.acknowledgment;
            const phone = ack?.responder_contact || asgmt?.agency?.contact_phone;
            return (
              <View key={asgmt.assignment_id} style={styles.responderCard}>
                <Text style={styles.responderName}>{asgmt.agency?.agency_name}</Text>
                {phone && (
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => Linking.openURL(`tel:${phone}`)}
                  >
                    <View style={styles.callBtnInner}>
                      <Ionicons name="call-outline" size={14} color={colors.SUCCESS_GREEN} />
                      <Text style={styles.callBtnText}>Call</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Timeline */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Response Timeline</Text>
            <StatusTimeline steps={buildSteps(currentAlert.status, currentAlert.created_at)} />
          </View>

          {/* Alert details */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Alert Details</Text>
            <Text style={styles.detailRow}>
              Type: <Text style={styles.detailValue}>{currentAlert.alert_type?.replace(/_/g, ' ')}</Text>
            </Text>
            <Text style={styles.detailRow}>
              Priority: <Text style={styles.detailValue}>{currentAlert.priority_level}</Text>
            </Text>
            <Text style={styles.detailRow}>
              Sent: <Text style={styles.detailValue}>{new Date(currentAlert.created_at).toLocaleString()}</Text>
            </Text>
            {currentAlert.description ? (
              <Text style={styles.detailRow}>
                Note: <Text style={styles.detailValue}>{currentAlert.description}</Text>
              </Text>
            ) : null}
          </View>

          {/* Cancel button — visible for PENDING/DISPATCHED within first 60 s */}
          {canCancel && (
            <TouchableOpacity style={styles.cancelAlertBtn} onPress={handleCancel} activeOpacity={0.8}>
              <Ionicons name="close-circle-outline" size={18} color={colors.SOS_RED} />
              <Text style={styles.cancelAlertText}>Cancel Alert</Text>
              <View style={styles.cancelCountdownBadge}>
                <Text style={styles.cancelCountdownText}>{cancelSecondsLeft}s</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Back to Home after terminal */}
          {TERMINAL_STATUSES.includes(currentAlert.status) && (
            <TouchableOpacity style={styles.doneBtn} onPress={goHome}>
              <Text style={styles.doneBtnText}>Back to Home</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Rating Modal */}
      <Modal visible={showRating} transparent animationType="slide" onRequestClose={() => setShowRating(false)}>
        <TouchableOpacity style={ratingModalStyles.overlay} activeOpacity={1} onPress={() => setShowRating(false)}>
          <TouchableOpacity activeOpacity={1} style={[ratingModalStyles.sheet, { backgroundColor: colors.CARD_WHITE }]}>
            <View style={[ratingModalStyles.handle, { backgroundColor: colors.BORDER_GREY }]} />
            <Text style={[ratingModalStyles.title, { color: colors.TEXT_DARK }]}>How was your experience?</Text>
            <Text style={[ratingModalStyles.sub, { color: colors.TEXT_MEDIUM }]}>
              Rate the emergency response you received
            </Text>
            <View style={ratingModalStyles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= rating ? '#F59E0B' : colors.BORDER_GREY}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[ratingModalStyles.submitBtn, { backgroundColor: rating > 0 ? colors.PRIMARY_BLUE : colors.BORDER_GREY }]}
              onPress={rating > 0 ? handleRatingSubmit : undefined}
              activeOpacity={0.8}
            >
              <Text style={ratingModalStyles.submitText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowRating(false)} style={ratingModalStyles.skipBtn}>
              <Text style={[ratingModalStyles.skipText, { color: colors.TEXT_MEDIUM }]}>Skip</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Toast */}
      <Toast toast={toast} colors={colors} />
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.BACKGROUND_LIGHT },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.BACKGROUND_WHITE,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER_GREY,
  },
  headerOffsetForBanner: { marginTop: 44 },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.TEXT_DARK,
  },
  apiErrorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.API_ERROR_BG,
    borderBottomWidth: 1,
    borderBottomColor: colors.API_ERROR_BORDER,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  apiErrorText: {
    fontSize: 13,
    color: colors.ERROR_RED,
    flex: 1,
    marginRight: 8,
  },
  apiErrorRetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  apiErrorRetry: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ERROR_RED,
  },
  mapWrapper: { height: 220 },
  map: { flex: 1 },
  locateMeBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  etaCard: {
    backgroundColor: colors.DECORATIVE_PINK,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  etaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.SOS_RED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  etaValue: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.SOS_RED,
    marginTop: 4,
    letterSpacing: 1,
  },
  etaSub: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.SOS_RED,
    opacity: 0.7,
    marginTop: 2,
  },
  responderCard: {
    backgroundColor: colors.CARD_WHITE,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  responderName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.TEXT_DARK,
    flex: 1,
    marginRight: 12,
  },
  callBtn: {
    backgroundColor: colors.CALL_BTN_BG,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  callBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.SUCCESS_GREEN,
  },
  section: {
    backgroundColor: colors.CARD_WHITE,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.PLACEHOLDER_GREY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    fontSize: 14,
    color: colors.TEXT_MEDIUM,
    fontWeight: '500',
  },
  detailValue: {
    color: colors.TEXT_DARK,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  cancelAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.SOS_RED,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: colors.ERROR_CARD_BG,
  },
  cancelAlertText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.SOS_RED,
    flex: 1,
    textAlign: 'center',
  },
  cancelCountdownBadge: {
    backgroundColor: colors.SOS_RED,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  cancelCountdownText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  doneBtn: {
    backgroundColor: colors.PRIMARY_BLUE,
    height: 52,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    ...typography.screenSubtitle,
    color: colors.TEXT_MEDIUM,
  },
  goHome: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.PRIMARY_BLUE,
  },
});

const ratingModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  stars: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  submitBtn: {
    width: '80%',
    height: 50,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AlertStatusScreen;

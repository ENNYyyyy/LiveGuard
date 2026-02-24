import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import { cancelAlert, fetchAlertStatus, updateAlertLocation } from '../../store/alertSlice';
import StatusTimeline from '../../components/StatusTimeline';
import StatusBadge from '../../components/StatusBadge';
import OutlinedButton from '../../components/OutlinedButton';
import NoInternetBanner from '../../components/NoInternetBanner';
import useNetInfo from '../../hooks/useNetInfo';
import colors from '../../utils/colors';
import typography from '../../utils/typography';
import { formatTime } from '../../utils/helpers';

const STATUS_ORDER = ['PENDING', 'DISPATCHED', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED'];
const STEP_LABELS  = ['Alert Sent', 'Dispatched', 'Acknowledged', 'En Route', 'Resolved'];

function buildSteps(status, createdAt) {
  const currentIndex = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER.map((s, i) => ({
    label: STEP_LABELS[i],
    completed: i <= currentIndex,
    time: i === 0 && createdAt ? formatTime(createdAt) : undefined,
  }));
}

const TERMINAL_STATUSES = ['RESOLVED', 'CANCELLED'];

const AlertStatusScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { currentAlert, loading, statusError } = useSelector((state) => state.alert);
  const { isConnected } = useNetInfo();
  const isFocused = useIsFocused();
  const locationSubscription = useRef(null);

  const goHome = () => {
    navigation.navigate('MainDrawer', {
      screen: 'MainTabs',
      params: { screen: 'HomeTab' },
    });
  };

  const alertId =
    route?.params?.alert_id ?? route?.params?.alertId ?? currentAlert?.alert_id;
  const isTerminal = TERMINAL_STATUSES.includes(currentAlert?.status);

  const doFetch = () => {
    if (alertId) dispatch(fetchAlertStatus(alertId));
  };

  useEffect(() => {
    if (!isFocused || !alertId) return;
    doFetch();
    if (isTerminal) return;
    const interval = setInterval(doFetch, 5000);
    return () => clearInterval(interval);
  }, [isFocused, isTerminal, alertId]);

  // Stream live location to the server while alert is active
  useEffect(() => {
    if (!isFocused || isTerminal || !alertId) return;

    (async () => {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== 'granted') return;

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 15,  // send update every 15 metres of movement
          timeInterval: 10000,   // no more than once every 10 seconds
        },
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

  // Use first assignment for ETA display; render all assignments below
  const firstAck = currentAlert?.assignments?.[0]?.acknowledgment;

  const handleCancel = () => {
    Alert.alert('Cancel Alert', 'Are you sure you want to cancel this alert?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          await dispatch(cancelAlert(currentAlert?.alert_id));
          goHome();
        },
      },
    ]);
  };

  if (!currentAlert) {
    return (
      <SafeAreaView style={styles.safe}>
        <NoInternetBanner visible={!isConnected} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No active alert</Text>
          <TouchableOpacity onPress={goHome}>
            <Text style={styles.goHome}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const userCoord = {
    latitude: currentAlert.location?.latitude || 6.5244,
    longitude: currentAlert.location?.longitude || 3.3792,
  };

  const responderCoord = currentAlert.responder?.currentLocation;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Offline banner */}
      <NoInternetBanner visible={!isConnected} />

      {/* Header */}
      <View style={[styles.header, !isConnected && styles.headerOffsetForBanner]}>
        <Text style={styles.headerTitle}>Alert Status</Text>
        <StatusBadge status={currentAlert.status} />
      </View>

      {/* API error bar with retry */}
      {statusError && !loading ? (
        <TouchableOpacity style={styles.apiErrorBar} onPress={doFetch} activeOpacity={0.8}>
          <Text style={styles.apiErrorText}>
            Unable to load alert status. Check your connection.
          </Text>
          <Text style={styles.apiErrorRetry}>Retry ↻</Text>
        </TouchableOpacity>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Map */}
        <MapView
          style={styles.map}
          region={{
            latitude: userCoord.latitude,
            longitude: userCoord.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }}
          scrollEnabled={false}
        >
          <Marker coordinate={userCoord} pinColor={colors.SOS_RED} title="You" />
          {responderCoord && (
            <Marker
              coordinate={responderCoord}
              pinColor={colors.SUCCESS_GREEN}
              title="Responder"
            />
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

        <View style={styles.content}>
          {/* ETA */}
          {firstAck?.estimated_arrival && (
            <View style={styles.etaCard}>
              <Text style={styles.etaLabel}>Estimated Arrival</Text>
              <Text style={styles.etaValue}>{firstAck.estimated_arrival} min</Text>
            </View>
          )}

          {/* Responder info — one card per assignment */}
          {currentAlert?.assignments?.map((asgmt) => {
            const ack = asgmt.acknowledgment;
            const phone = ack?.responder_contact || asgmt?.agency?.contact_phone;
            return (
              <View key={asgmt.assignment_id} style={styles.responderCard}>
                <Text style={styles.responderName}>{asgmt.agency?.agency_name}</Text>
                {phone && (
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => Linking.openURL(`tel:${phone}`)}
                  >
                    <Text style={styles.callBtnText}>📞 Call</Text>
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
              Type: <Text style={styles.detailValue}>{currentAlert.alert_type}</Text>
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

          {/* Cancel — only available while alert is still pending */}
          {currentAlert.status === 'PENDING' && (
            <OutlinedButton
              title="Cancel Alert"
              onPress={handleCancel}
            />
          )}

          {['RESOLVED', 'CANCELLED'].includes(currentAlert.status) && (
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={goHome}
            >
              <Text style={styles.doneBtnText}>Back to Home</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  headerOffsetForBanner: {
    marginTop: 44,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.TEXT_DARK,
  },
  apiErrorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  apiErrorText: {
    fontSize: 13,
    color: colors.ERROR_RED,
    flex: 1,
    marginRight: 8,
  },
  apiErrorRetry: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ERROR_RED,
  },
  map: {
    height: 220,
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
    fontSize: 32,
    fontWeight: '800',
    color: colors.SOS_RED,
    marginTop: 4,
  },
  responderCard: {
    backgroundColor: colors.BACKGROUND_WHITE,
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
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  callBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.SUCCESS_GREEN,
  },
  section: {
    backgroundColor: colors.BACKGROUND_WHITE,
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
    textTransform: 'capitalize',
  },
  detailValue: {
    color: colors.TEXT_DARK,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 4,
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
    color: colors.BACKGROUND_WHITE,
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
  },
  goHome: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.PRIMARY_BLUE,
  },
});

export default AlertStatusScreen;

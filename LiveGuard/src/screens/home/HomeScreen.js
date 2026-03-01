import React, { useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { useDispatch, useSelector } from 'react-redux';
import { requestLocationPermission, getCurrentLocation, fetchLocation } from '../../store/locationSlice';
import { fetchAlertHistory } from '../../store/alertSlice';
import { setupNotificationListeners, registerForPushNotifications } from '../../services/notificationService';
import { registerDevice } from '../../store/authSlice';
import SOSButton from '../../components/SOSButton';
import LocationBar from '../../components/LocationBar';
import NoInternetBanner from '../../components/NoInternetBanner';
import useNetInfo from '../../hooks/useNetInfo';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { DARK_MAP_STYLE } from '../../utils/mapStyles';
import useShake from '../../hooks/useShake';

const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { latitude, longitude, address, permissionStatus, locationError, loading: locationLoading } =
    useSelector((state) => state.location);
  const user = useSelector((state) => state.auth.user);
  const { isConnected } = useNetInfo();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    const init = async () => {
      await dispatch(requestLocationPermission());
      dispatch(getCurrentLocation());
      dispatch(fetchAlertHistory());

      const token = await registerForPushNotifications();
      if (token) dispatch(registerDevice(token));
    };
    init();

    const cleanup = setupNotificationListeners(
      () => {},
      (response) => {
        const data = response?.notification?.request?.content?.data;
        if (data?.alert_id) {
          navigation.navigate('AlertStatusScreen', { alertId: data.alert_id });
        }
      }
    );
    return cleanup;
  }, []);

  const hasCoords = latitude !== null && longitude !== null;
  const permissionDenied = permissionStatus === 'denied';
  const hasLocationError = locationError === 'timeout' || locationError === 'unavailable';

  const handleSOSPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (!isConnected) {
      Alert.alert(
        'No internet connection',
        'Your alert may not be sent.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send Anyway', onPress: () => navigation.navigate('EmergencyAlertScreen') },
        ]
      );
    } else {
      navigation.navigate('EmergencyAlertScreen');
    }
  }, [isConnected, navigation]);

  useShake(handleSOSPress);

  const handleRetryLocation = () => {
    dispatch(fetchLocation());
  };

  const renderLocationStatus = () => {
    if (permissionDenied) {
      return (
        <View style={styles.locationStatusRow}>
          <View style={styles.dotRed} />
          <Text style={styles.locationStatusText}>Location unavailable</Text>
        </View>
      );
    }
    if (hasLocationError) {
      return (
        <View style={styles.locationErrorRow}>
          <Text style={styles.locationErrorText}>Unable to get location</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetryLocation} disabled={locationLoading}>
            <Text style={styles.retryBtnText}>{locationLoading ? 'Retrying…' : 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <NoInternetBanner visible={!isConnected} />

      {/* Header */}
      <View style={[styles.header, !isConnected && styles.headerOffsetForBanner]}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={26} color={colors.TEXT_DARK} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.welcomeLabel}>Welcome,</Text>
          <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
        </View>

        <View style={styles.avatarWrapper}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>
                {user?.firstName?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        {renderLocationStatus()}

        {/* SOS card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Are you in an emergency?</Text>
          <Text style={styles.cardSubtitle}>
            Press the button below and help will reach you shortly
          </Text>
          <View style={styles.gap24} />
          <SOSButton onPress={handleSOSPress} />
        </View>

        {/* Mini map */}
        <View style={styles.mapContainer}>
          {hasCoords && !permissionDenied ? (
            <MapView
              style={styles.map}
              region={{
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              customMapStyle={isDark ? DARK_MAP_STYLE : []}
              userInterfaceStyle={isDark ? 'dark' : 'light'}
            >
              <Marker
                coordinate={{ latitude, longitude }}
                pinColor={colors.PRIMARY_BLUE}
                title="You"
              />
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>
                {permissionDenied
                  ? 'Location access denied'
                  : hasLocationError
                  ? 'Unable to get location'
                  : address || 'Fetching location…'}
              </Text>
            </View>
          )}
          {/* Locate-me FAB */}
          <TouchableOpacity
            style={[styles.locateMeBtn, { backgroundColor: colors.BACKGROUND_WHITE }]}
            onPress={handleRetryLocation}
            activeOpacity={0.8}
          >
            <Ionicons name="locate" size={18} color={colors.PRIMARY_BLUE} />
          </TouchableOpacity>
        </View>

        {/* Location bar */}
        <LocationBar
          address={address}
          avatarUri={user?.avatar || null}
          onPress={() => navigation.navigate('LocationPickerScreen')}
        />
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.BACKGROUND_WHITE,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER_GREY,
  },
  headerOffsetForBanner: {
    marginTop: 44,
  },
  menuBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  welcomeLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.ACCENT_RED,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.TEXT_DARK,
  },
  avatarWrapper: {
    width: 40,
    alignItems: 'flex-end',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: colors.CARD_WHITE,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.TEXT_DARK,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.TEXT_MEDIUM,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  gap24: { height: 24 },
  mapContainer: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: colors.BORDER_GREY,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  mapPlaceholderText: {
    fontSize: 13,
    color: colors.TEXT_MEDIUM,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  locationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.ERROR_CARD_BG,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dotRed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.ERROR_RED,
  },
  locationStatusText: {
    fontSize: 13,
    color: colors.ERROR_RED,
    fontWeight: '500',
  },
  locationErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.ERROR_CARD_BG,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  locationErrorText: {
    fontSize: 13,
    color: colors.ERROR_RED,
    fontWeight: '500',
    flex: 1,
  },
  retryBtn: {
    backgroundColor: colors.ERROR_RED,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default HomeScreen;

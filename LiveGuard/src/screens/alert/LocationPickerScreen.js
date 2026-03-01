import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import { setLocation } from '../../store/locationSlice';
import { reverseGeocode } from '../../services/locationService';
import PrimaryButton from '../../components/PrimaryButton';
import { useTheme } from '../../context/ThemeContext';
import { DARK_MAP_STYLE } from '../../utils/mapStyles';

const DEFAULT_REGION = {
  latitude: 6.5244,
  longitude: 3.3792,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const LocationPickerScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { latitude, longitude, address: storedAddress } = useSelector((state) => state.location);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const initialRegion =
    latitude && longitude
      ? { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
      : DEFAULT_REGION;

  const [pinCoords, setPinCoords]         = useState({ latitude: initialRegion.latitude, longitude: initialRegion.longitude });
  const [address, setAddress]             = useState(storedAddress || '');
  const [searchText, setSearchText]       = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [geocoding, setGeocoding]         = useState(false);
  const [searching, setSearching]         = useState(false);

  const mapRef      = useRef(null);
  const debounceRef = useRef(null);

  const handleRegionChangeComplete = useCallback(async (newRegion) => {
    const coords = { latitude: newRegion.latitude, longitude: newRegion.longitude };
    setPinCoords(coords);
    setGeocoding(true);
    try {
      const addr = await reverseGeocode(coords.latitude, coords.longitude);
      setAddress(addr);
    } catch {
      // keep previous address
    } finally {
      setGeocoding(false);
    }
  }, []);

  const handleSearch = useCallback(
    (text) => {
      setSearchText(text);
      if (!text.trim()) { setSearchResults([]); return; }

      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSearching(true);
        try {
          const raw = await Location.geocodeAsync(text);
          if (!raw || raw.length === 0) { setSearchResults([]); return; }

          const enriched = await Promise.all(
            raw.slice(0, 5).map(async (r) => {
              const addr = await reverseGeocode(r.latitude, r.longitude);
              const dist =
                latitude && longitude
                  ? haversineKm(latitude, longitude, r.latitude, r.longitude)
                  : null;
              return { latitude: r.latitude, longitude: r.longitude, address: addr, distance: dist };
            })
          );
          setSearchResults(enriched);
        } catch {
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, 500);
    },
    [latitude, longitude]
  );

  const handleSelectResult = (result) => {
    const newRegion = { ...result, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    setPinCoords({ latitude: result.latitude, longitude: result.longitude });
    setAddress(result.address);
    setSearchText(result.address);
    setSearchFocused(false);
    setSearchResults([]);
    Keyboard.dismiss();
    mapRef.current?.animateToRegion(newRegion, 500);
  };

  const handlePickLocation = () => {
    dispatch(setLocation({ latitude: pinCoords.latitude, longitude: pinCoords.longitude, address }));
    navigation.goBack();
  };

  const openSearch = () => {
    setSearchText('');
    setSearchResults([]);
    setSearchFocused(true);
  };

  const closeSearch = () => {
    setSearchFocused(false);
    setSearchText(address);
    setSearchResults([]);
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      {/* Full-screen map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
        customMapStyle={isDark ? DARK_MAP_STYLE : []}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
      />

      {/* Fixed center pin */}
      <View style={styles.centerPinWrapper} pointerEvents="none">
        <Text style={styles.centerPin}>📍</Text>
      </View>

      {/* Top floating bar */}
      {!searchFocused && (
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBarInner} onPress={() => navigation.goBack()}>
            <Text style={styles.topBarArrow}>←</Text>
            <Text style={styles.topBarTitle}>Current Location</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Normal bottom sheet */}
      {!searchFocused ? (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Pick your Current Location</Text>
          <Text style={styles.sheetSubtitle}>Drag the map to move the pin</Text>

          <View style={styles.gap12} />

          <TouchableOpacity style={styles.searchRow} onPress={openSearch} activeOpacity={0.8}>
            <Text style={styles.pinIcon}>📍</Text>
            <Text
              style={[styles.searchDisplay, !address && styles.placeholder]}
              numberOfLines={1}
            >
              {geocoding ? 'Getting address…' : address || 'Search location…'}
            </Text>
            <Text style={styles.searchIconText}>🔍</Text>
          </TouchableOpacity>

          <View style={styles.gap20} />
          <PrimaryButton title="Pick your Current Location" onPress={handlePickLocation} />
        </View>
      ) : (
        /* Expanded search sheet */
        <View style={styles.expandedSheet}>
          <View style={styles.expandedHeader}>
            <TouchableOpacity onPress={closeSearch} style={styles.expandedBack}>
              <Text style={styles.topBarArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.expandedTitle}>Pick your Current Location</Text>
          </View>

          <View style={styles.searchRow}>
            <Text style={styles.pinIcon}>📍</Text>
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={handleSearch}
              placeholder="Search location…"
              placeholderTextColor={colors.PLACEHOLDER_GREY}
              autoFocus
              returnKeyType="search"
            />
            {searching ? (
              <ActivityIndicator size="small" color={colors.PRIMARY_BLUE} />
            ) : (
              <Text style={styles.searchIconText}>🔍</Text>
            )}
          </View>

          <FlatList
            data={searchResults}
            keyExtractor={(_, i) => String(i)}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.resultsList}
            renderItem={({ item, index }) => (
              <>
                <TouchableOpacity style={styles.resultRow} onPress={() => handleSelectResult(item)}>
                  <View style={styles.resultMeta}>
                    <Text style={styles.clockIcon}>🕐</Text>
                    {item.distance !== null && (
                      <Text style={styles.distanceText}>
                        {item.distance < 1
                          ? `${Math.round(item.distance * 1000)}m`
                          : `${Math.round(item.distance)}km`}
                      </Text>
                    )}
                  </View>
                  <View style={styles.resultBody}>
                    <Text style={styles.resultName} numberOfLines={1}>
                      {item.address.split(',')[0]}
                    </Text>
                    <Text style={styles.resultAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                </TouchableOpacity>
                {index < searchResults.length - 1 && <View style={styles.divider} />}
              </>
            )}
            ListEmptyComponent={
              !searching && searchText.length > 2 ? (
                <Text style={styles.noResults}>No results found</Text>
              ) : null
            }
          />
        </View>
      )}
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },

  centerPinWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
  },
  centerPin: { fontSize: 40 },

  topBar: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    backgroundColor: colors.BACKGROUND_WHITE,
    borderRadius: 32,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  topBarInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarArrow: { fontSize: 20, color: colors.TEXT_DARK },
  topBarTitle: { fontSize: 15, fontWeight: '600', color: colors.TEXT_DARK },

  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.BACKGROUND_WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.BORDER_GREY,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: colors.TEXT_DARK, marginBottom: 4 },
  sheetSubtitle: { fontSize: 14, color: colors.TEXT_MEDIUM },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.BACKGROUND_LIGHT,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginTop: 8,
  },
  pinIcon: { fontSize: 18 },
  searchDisplay: { flex: 1, fontSize: 14, color: colors.TEXT_DARK },
  placeholder: { color: colors.PLACEHOLDER_GREY },
  searchInput: { flex: 1, fontSize: 14, color: colors.TEXT_DARK, paddingVertical: 0 },
  searchIconText: { fontSize: 16 },

  expandedSheet: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.BACKGROUND_WHITE,
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  expandedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  expandedBack: { padding: 4 },
  expandedTitle: { fontSize: 16, fontWeight: '700', color: colors.TEXT_DARK, flex: 1 },

  resultsList: { marginTop: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  resultMeta: { alignItems: 'center', minWidth: 44 },
  clockIcon: { fontSize: 16 },
  distanceText: { fontSize: 11, color: colors.TEXT_MEDIUM, marginTop: 2 },
  resultBody: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '600', color: colors.TEXT_DARK },
  resultAddress: { fontSize: 12, color: colors.TEXT_MEDIUM, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.BORDER_GREY },
  noResults: { fontSize: 14, color: colors.TEXT_MEDIUM, textAlign: 'center', paddingTop: 32 },

  gap12: { height: 12 },
  gap20: { height: 20 },
});

export default LocationPickerScreen;

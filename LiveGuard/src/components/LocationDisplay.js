import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import colors from '../utils/colors';

/**
 * Displays location data for an alert.
 * Props:
 *   location — { latitude, longitude, accuracy, address, maps_url }
 */
const LocationDisplay = ({ location }) => {
  if (!location) return null;

  const mapsUrl =
    location.maps_url ||
    `https://maps.google.com/?q=${location.latitude},${location.longitude}`;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Location</Text>

      {location.address ? (
        <Text style={styles.address}>{location.address}</Text>
      ) : null}

      <Text style={styles.coords}>
        {parseFloat(location.latitude).toFixed(6)},{' '}
        {parseFloat(location.longitude).toFixed(6)}
        {location.accuracy ? `  ±${Math.round(location.accuracy)}m` : ''}
      </Text>

      <TouchableOpacity
        style={styles.mapsBtn}
        onPress={() => Linking.openURL(mapsUrl)}
        activeOpacity={0.8}
      >
        <Text style={styles.mapsBtnText}>Open in Google Maps →</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.BACKGROUND_WHITE,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.PLACEHOLDER_GREY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  address: {
    fontSize: 14,
    color: colors.TEXT_DARK,
    fontWeight: '600',
  },
  coords: {
    fontSize: 12,
    color: colors.TEXT_MEDIUM,
    fontFamily: 'monospace',
  },
  mapsBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  mapsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.PRIMARY_BLUE,
  },
});

export default LocationDisplay;

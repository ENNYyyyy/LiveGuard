import * as Location from 'expo-location';

export async function requestLocationPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentPosition() {
  // Returns { latitude, longitude, accuracy }
  // Throws if permission denied or GPS unavailable
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
    timeout: 10000,
  });
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
  };
}

export async function reverseGeocode(latitude, longitude) {
  // Returns human-readable address string
  const results = await Location.reverseGeocodeAsync({ latitude, longitude });
  if (results && results.length > 0) {
    const addr = results[0];
    return [addr.street, addr.district, addr.city, addr.region, addr.country]
      .filter(Boolean)
      .join(', ');
  }
  return 'Address unavailable';
}

export async function getFullLocationData() {
  // Convenience: coordinates + address in one call
  // Call this in the SOS/alert submission flow
  const coords = await getCurrentPosition();
  const address = await reverseGeocode(coords.latitude, coords.longitude);
  return { ...coords, address };
}

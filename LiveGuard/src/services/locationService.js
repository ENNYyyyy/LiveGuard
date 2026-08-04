import * as Location from 'expo-location';

export async function requestLocationPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentPosition() {
  // Fast path: return a recent cached fix instantly (no GPS wait needed).
  try {
    const last = await Location.getLastKnownPositionAsync();
    if (last) {
      const ageMs = Date.now() - last.timestamp;
      if (ageMs <= 30_000 && last.coords.accuracy <= 200) {
        return {
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
          accuracy: last.coords.accuracy,
        };
      }
    }
  } catch {
    // getLastKnownPositionAsync can throw on some devices; fall through
  }

  // Slow path: request a fresh GPS fix with a real 10-second timeout.
  // Note: the `timeout` option is not supported by expo-location — we use Promise.race instead.
  const locationPromise = Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error('Unable to determine your location. Please try again.')),
      10_000
    )
  );
  const location = await Promise.race([locationPromise, timeoutPromise]);
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

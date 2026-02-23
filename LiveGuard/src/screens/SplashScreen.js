import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import LogoHeader from '../components/LogoHeader';
import colors from '../utils/colors';

// Prevent native splash from auto-hiding until JS splash takes over
ExpoSplashScreen.preventAutoHideAsync();

const SplashScreen = ({ navigation, isAuthenticated }) => {
  useEffect(() => {
    const init = async () => {
      await ExpoSplashScreen.hideAsync(); // hand off from native → JS splash
      await new Promise((resolve) => setTimeout(resolve, 2000));
      navigation.replace(isAuthenticated ? 'MainDrawer' : 'OnboardingScreen');
    };
    init();
  }, []);

  return (
    <View style={styles.container}>
      <LogoHeader size="large" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND_WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SplashScreen;

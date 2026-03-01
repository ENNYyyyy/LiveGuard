import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import LogoHeader from '../components/LogoHeader';
import { useTheme } from '../context/ThemeContext';

// Prevent native splash from auto-hiding until JS splash takes over
ExpoSplashScreen.preventAutoHideAsync();

const SplashScreen = ({ navigation, isAuthenticated, onboardingSeen }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    if (onboardingSeen === null) return; // wait for AsyncStorage read
    const init = async () => {
      await ExpoSplashScreen.hideAsync();
      await new Promise((resolve) => setTimeout(resolve, 1800));
      if (isAuthenticated) {
        navigation.replace('MainDrawer');
      } else if (!onboardingSeen) {
        navigation.replace('OnboardingWalkthrough');
      } else {
        navigation.replace('OnboardingScreen');
      }
    };
    init();
  }, [onboardingSeen]);

  return (
    <View style={styles.container}>
      <LogoHeader size="large" />
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND_WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SplashScreen;

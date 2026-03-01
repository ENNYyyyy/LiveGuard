import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import PrimaryButton from '../components/PrimaryButton';
import OutlinedButton from '../components/OutlinedButton';
import { useTheme } from '../context/ThemeContext';

const IllustrationPlaceholder = () => {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <View style={illustrationStyles.placeholder}>
        <Text style={illustrationStyles.placeholderIcon}>🚑</Text>
      </View>
    );
  }
  return (
    <Image
      source={require('../../assets/images/onboarding-ambulance.png')}
      style={illustrationStyles.illustration}
      resizeMode="contain"
      onError={() => setError(true)}
    />
  );
};

const illustrationStyles = StyleSheet.create({
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: { fontSize: 80 },
  illustration: { width: '100%', height: '100%' },
});

const { height } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }) => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    if (isAuthenticated) navigation.replace('MainDrawer');
  }, [isAuthenticated]);

  return (
    <View style={styles.container}>
      {/* Top — cream area with ambulance illustration */}
      <View style={styles.top}>
        <IllustrationPlaceholder />
      </View>

      {/* Bottom — area with text + buttons */}
      <View style={styles.bottom}>
        <Text style={styles.title}>Emergency Help Needed?</Text>
        <Text style={styles.subtitle}>
          Because every second counts. One tap to alert the right person, right when you need them.
        </Text>
        <View style={styles.buttons}>
          <PrimaryButton title="Login"    onPress={() => navigation.navigate('LoginScreen')} />
          <View style={styles.gap} />
          <OutlinedButton title="Register" onPress={() => navigation.navigate('RegisterScreen')} />
        </View>
      </View>
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND_WHITE,
  },
  top: {
    height: height * 0.45,
    backgroundColor: colors.BACKGROUND_CREAM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    flex: 1,
    backgroundColor: colors.BACKGROUND_WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.PRIMARY_NAVY,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.TEXT_MEDIUM,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 24,
    marginTop: 12,
  },
  buttons: {
    width: '100%',
    marginTop: 32,
  },
  gap: { height: 12 },
});

export default OnboardingScreen;

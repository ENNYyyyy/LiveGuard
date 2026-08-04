import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearError, loadStoredAuth } from '../../store/authSlice';
import LogoHeader from '../../components/LogoHeader';
import InputField from '../../components/InputField';
import PrimaryButton from '../../components/PrimaryButton';
import SocialAuthButtons from '../../components/SocialAuthButtons';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { STORAGE_KEYS } from '../../utils/constants';

const REMEMBERED_EMAIL_KEY = 'REMEMBERED_EMAIL';

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [errors, setErrors]         = useState({});
  const [rememberMe, setRememberMe] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigation.replace('MainDrawer');
  }, [isAuthenticated]);

  useEffect(() => { return () => dispatch(clearError()); }, []);

  // Load remembered email + check biometric availability
  useEffect(() => {
    (async () => {
      const savedEmail = await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (savedEmail) { setEmail(savedEmail); setRememberMe(true); }

      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled   = await LocalAuthentication.isEnrolledAsync();
      setHasBiometric(compatible && enrolled && !!token);
    })();
  }, []);

  const handleBiometricLogin = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verify to log in',
      fallbackLabel: 'Use Password',
      cancelLabel: 'Cancel',
    });
    if (result.success) {
      dispatch(loadStoredAuth());
    }
  };

  const validate = () => {
    const e = {};
    if (!email.trim())    e.email    = "Please don't leave empty";
    if (!password.trim()) e.password = "Please don't leave empty";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    if (rememberMe) {
      await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
    } else {
      await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }
    dispatch(loginUser({ email: email.trim(), password }));
  };

  return (
    <View style={styles.flex}>
      {/* Decorative circle */}
      <View style={[styles.decorCircle, { pointerEvents: 'none' }]} />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <LogoHeader size="small" />
        </View>

        <View style={styles.gap24} />

        {/* Heading */}
        <Text style={styles.title}>Login here!</Text>
        <Text style={styles.subtitle}>Welcome back. Your safety is our priority.</Text>

        <View style={styles.gap32} />

        {/* Backend error */}
        {error ? <Text style={styles.backendError}>{error}</Text> : null}

        {/* Fields */}
        <InputField
          label="Email/Phone"
          placeholder="example@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
        />

        <View style={styles.gap16} />

        <InputField
          label="Password"
          placeholder="Password required"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={errors.password}
        />

        {/* Remember Me + Forgot password row */}
        <View style={styles.rememberRow}>
          <View style={styles.rememberLeft}>
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              thumbColor={colors.BACKGROUND_WHITE}
              trackColor={{ false: colors.BORDER_GREY, true: colors.PRIMARY_BLUE }}
              style={styles.rememberSwitch}
            />
            <Text style={styles.rememberText}>Remember me</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gap24} />

        {/* Login button */}
        <PrimaryButton title="Login" onPress={handleLogin} loading={loading} />

        {/* Biometric login */}
        {hasBiometric && (
          <>
            <View style={styles.gap16} />
            <TouchableOpacity style={[styles.biometricBtn, { borderColor: colors.BORDER_GREY }]} onPress={handleBiometricLogin} activeOpacity={0.8}>
              <Ionicons name="finger-print-outline" size={22} color={colors.PRIMARY_BLUE} />
              <Text style={[styles.biometricText, { color: colors.PRIMARY_BLUE }]}>Login with Biometrics</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.gap16} />

        {/* Sign up row */}
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>You don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('RegisterScreen')}>
            <Text style={styles.signupLink}>Sign up</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gap24} />

        <SocialAuthButtons />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.BACKGROUND_WHITE,
  },
  decorCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.DECORATIVE_PINK,
    top: -80,
    right: -80,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 40,
  },
  logoRow: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    fontSize: 28,
    color: colors.TEXT_DARK,
    textAlign: 'center',
  },
  subtitle: {
    fontWeight: '400',
    fontSize: 16,
    color: colors.TEXT_MEDIUM,
    textAlign: 'center',
  },
  backendError: {
    fontSize: 13,
    color: colors.ERROR_RED,
    textAlign: 'center',
    marginBottom: 12,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rememberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rememberSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  rememberText: {
    fontSize: 14,
    color: colors.TEXT_MEDIUM,
    fontWeight: '500',
  },
  forgotText: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.LINK_BLUE,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  biometricText: {
    fontSize: 15,
    fontWeight: '700',
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: colors.TEXT_MEDIUM,
  },
  signupLink: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.LINK_BLUE,
  },
  gap16: { height: 16 },
  gap24: { height: 24 },
  gap32: { height: 32 },
});

export default LoginScreen;

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, registerDevice, clearError } from '../../store/authSlice';
import { requestLocationPermission } from '../../services/locationService';
import { registerForPushNotifications } from '../../services/notificationService';
import LogoHeader from '../../components/LogoHeader';
import InputField from '../../components/InputField';
import PhoneInput from '../../components/PhoneInput';
import PrimaryButton from '../../components/PrimaryButton';
import PasswordStrengthBar from '../../components/PasswordStrengthBar';
import SocialAuthButtons from '../../components/SocialAuthButtons';
import { useTheme } from '../../context/ThemeContext';

const RegisterScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
  });
  const [errors, setErrors] = useState({});

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  useEffect(() => { return () => dispatch(clearError()); }, []);

  useEffect(() => {
    if (isAuthenticated) handlePostRegister();
  }, [isAuthenticated]);

  const handlePostRegister = async () => {
    await requestLocationPermission();
    Alert.alert(
      'LiveGuard',
      'Your carrier may charge for SMS messages used to receive emergency alert.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            const token = await registerForPushNotifications();
            if (token) dispatch(registerDevice(token));
            navigation.replace('MainDrawer');
          },
        },
      ]
    );
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = "Please don't leave empty";
    if (!form.last_name.trim())  e.last_name  = "Please don't leave empty";
    if (!form.email.trim())      e.email      = "Please don't leave empty";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.phone_number.trim())    e.phone_number    = "Please don't leave empty";
    if (!form.password.trim())        e.password        = "Please don't leave empty";
    if (!form.confirm_password.trim()) e.confirm_password = "Please don't leave empty";
    else if (form.password !== form.confirm_password)
      e.confirm_password = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else {
      if (!validateStep2()) return;
      dispatch(registerUser({
        first_name:   form.first_name.trim(),
        last_name:    form.last_name.trim(),
        email:        form.email.trim(),
        phone_number: form.phone_number.trim(),
        password:     form.password,
      }));
    }
  };

  const SignInRow = () => (
    <View style={styles.signinRow}>
      <Text style={styles.signinText}>You have an account already? </Text>
      <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
        <Text style={styles.signinLink}>Sign in</Text>
      </TouchableOpacity>
    </View>
  );

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

        {/* Step indicator */}
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
        </View>
        <Text style={styles.stepLabel}>Step {step} of 2</Text>

        <View style={styles.gap24} />

        {/* Heading */}
        <Text style={styles.title}>Create an Account!</Text>
        <Text style={styles.subtitle}>Welcome back. Your safety is our priority.</Text>

        <View style={styles.gap32} />

        {/* Backend error */}
        {error ? <Text style={styles.backendError}>{error}</Text> : null}

        {step === 1 ? (
          <>
            <InputField
              label="First Name"
              placeholder="Oladoye"
              value={form.first_name}
              onChangeText={set('first_name')}
              autoCapitalize="words"
              error={errors.first_name}
            />
            <View style={styles.gap16} />
            <InputField
              label="Last Name"
              placeholder="Nifemi"
              value={form.last_name}
              onChangeText={set('last_name')}
              autoCapitalize="words"
              error={errors.last_name}
            />
            <View style={styles.gap16} />
            <InputField
              label="Email"
              placeholder="example@email.com"
              value={form.email}
              onChangeText={set('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            <View style={styles.gap24} />
            <PrimaryButton title="Next" onPress={handleNext} />
            <View style={styles.gap16} />
            <SignInRow />
            <View style={styles.gap24} />
            <SocialAuthButtons />
          </>
        ) : (
          <>
            <PhoneInput
              value={form.phone_number}
              onChangeText={set('phone_number')}
              error={errors.phone_number}
            />
            <View style={styles.gap16} />
            <InputField
              label="Password"
              placeholder="Password"
              value={form.password}
              onChangeText={set('password')}
              secureTextEntry
              error={errors.password}
            />
            <PasswordStrengthBar password={form.password} />
            <View style={styles.gap16} />
            <InputField
              label="Confirm Password"
              placeholder="Confirm Password"
              value={form.confirm_password}
              onChangeText={set('confirm_password')}
              secureTextEntry
              error={errors.confirm_password}
            />
            <View style={styles.gap24} />
            <PrimaryButton title="Next" onPress={handleNext} loading={loading} />
            <View style={styles.gap16} />
            <SignInRow />
            <View style={styles.gap16} />
            <Text style={styles.terms}>
              By clicking "Next", you agree to accept our{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
              {', and '}
              <Text style={styles.termsLink}>Terms of Service</Text>
            </Text>
            <View style={styles.gap24} />
            <SocialAuthButtons />
          </>
        )}
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
  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signinText: {
    fontSize: 14,
    color: colors.TEXT_MEDIUM,
  },
  signinLink: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.LINK_BLUE,
  },
  terms: {
    fontSize: 13,
    color: colors.TEXT_MEDIUM,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: colors.LINK_BLUE,
    fontWeight: '600',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.BORDER_GREY,
  },
  stepDotActive: {
    backgroundColor: colors.PRIMARY_BLUE,
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: colors.BORDER_GREY,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: colors.PRIMARY_BLUE,
  },
  stepLabel: {
    fontSize: 13,
    color: colors.TEXT_MEDIUM,
    textAlign: 'center',
    marginTop: 8,
  },
  gap16: { height: 16 },
  gap24: { height: 24 },
  gap32: { height: 32 },
});

export default RegisterScreen;

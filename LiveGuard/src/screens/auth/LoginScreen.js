import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearError } from '../../store/authSlice';
import LogoHeader from '../../components/LogoHeader';
import InputField from '../../components/InputField';
import PrimaryButton from '../../components/PrimaryButton';
import SocialAuthButtons from '../../components/SocialAuthButtons';
import colors from '../../utils/colors';
import typography from '../../utils/typography';

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState({});

  useEffect(() => {
    if (isAuthenticated) navigation.replace('MainDrawer');
  }, [isAuthenticated]);

  useEffect(() => { return () => dispatch(clearError()); }, []);

  const validate = () => {
    const e = {};
    if (!email.trim())    e.email    = "Please don't leave empty";
    if (!password.trim()) e.password = "Please don't leave empty";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = () => {
    if (!validate()) return;
    dispatch(loginUser({ email: email.trim(), password }));
  };

  return (
    <View style={styles.flex}>
      {/* Decorative pink circle */}
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

        {/* Forgotten password */}
        <TouchableOpacity style={styles.forgotRow}>
          <Text style={styles.forgotText}>Forgotten Password?</Text>
        </TouchableOpacity>

        <View style={styles.gap24} />

        {/* Login button */}
        <PrimaryButton title="Login" onPress={handleLogin} loading={loading} />

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

const styles = StyleSheet.create({
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
    ...typography.screenTitle,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.screenSubtitle,
    textAlign: 'center',
  },
  backendError: {
    ...typography.errorText,
    textAlign: 'center',
    marginBottom: 12,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotText: {
    ...typography.link,
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
    ...typography.link,
  },
  gap16: { height: 16 },
  gap24: { height: 24 },
  gap32: { height: 32 },
});

export default LoginScreen;

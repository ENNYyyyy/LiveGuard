import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser, updateProfile } from '../../store/authSlice';
import NoInternetBanner from '../../components/NoInternetBanner';
import useNetInfo from '../../hooks/useNetInfo';
import { useTheme } from '../../context/ThemeContext';

// ── Inline toast ───────────────────────────────────────────────────────────────
const Toast = ({ toast }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [toast]);

  if (!toast) return null;
  const isSuccess = toast.type !== 'error';
  return (
    <Animated.View
      style={[
        profileToastStyles.container,
        { backgroundColor: isSuccess ? '#16A34A' : '#DC2626', opacity },
      ]}
    >
      <Ionicons name={isSuccess ? 'checkmark-circle' : 'alert-circle'} size={16} color="#FFFFFF" />
      <Text style={profileToastStyles.text}>{toast.message}</Text>
    </Animated.View>
  );
};

const profileToastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  text: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', flex: 1 },
});

// ── Screen ─────────────────────────────────────────────────────────────────────
const ProfileScreen = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const loading = useSelector((state) => state.auth.loading);
  const { isConnected } = useNetInfo();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const toastTimer = useRef(null);

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 2700);
  };

  const initials = `${user?.firstName?.charAt(0) || ''}${user?.lastName?.charAt(0) || ''}`.trim();

  const handleEditToggle = () => {
    if (!editing) {
      setFirstName(user?.firstName || '');
      setLastName(user?.lastName || '');
      setPhone(user?.phone || '');
    }
    setEditing((v) => !v);
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      showToast('First name cannot be empty.', 'error');
      return;
    }
    const result = await dispatch(
      updateProfile({ first_name: firstName.trim(), last_name: lastName.trim(), phone_number: phone.trim() })
    );
    if (updateProfile.fulfilled.match(result)) {
      setEditing(false);
      showToast('Profile updated successfully.');
    } else {
      showToast(result.payload || 'Could not save changes.', 'error');
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => dispatch(logoutUser()),
      },
    ]);
  };

  const MenuItem = ({ icon, label, value, onPress, danger }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.menuIconBox}>{icon}</View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, danger && { color: colors.SOS_RED }]}>{label}</Text>
        {value && <Text style={styles.menuValue}>{value}</Text>}
      </View>
      {!danger && <Ionicons name="chevron-forward" size={18} color={colors.PLACEHOLDER_GREY} />}
    </TouchableOpacity>
  );

  const EditField = ({ icon, label, value, onChangeText, keyboardType }) => (
    <View style={styles.editField}>
      <View style={styles.menuIconBox}>{icon}</View>
      <View style={styles.editFieldContent}>
        <Text style={styles.editFieldLabel}>{label}</Text>
        <TextInput
          style={styles.editInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || 'default'}
          autoCapitalize="words"
          placeholderTextColor={colors.PLACEHOLDER_GREY}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <NoInternetBanner visible={!isConnected} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={!isConnected ? styles.scrollOffsetForBanner : undefined}
      >
        {/* Avatar section */}
        <View style={styles.avatarSection}>
          {initials ? (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person-outline" size={36} color={colors.PLACEHOLDER_GREY} />
            </View>
          )}
          <Text style={styles.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={editing ? handleSave : handleEditToggle}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading && editing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.editBtnText}>{editing ? 'Save Changes' : 'Edit Profile'}</Text>
            )}
          </TouchableOpacity>

          {editing && (
            <TouchableOpacity onPress={handleEditToggle} style={styles.cancelEditBtn}>
              <Text style={styles.cancelEditText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>

          {editing ? (
            <>
              <EditField
                icon={<Ionicons name="person-outline" size={20} color={colors.TEXT_MEDIUM} />}
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
              />
              <EditField
                icon={<Ionicons name="person-outline" size={20} color={colors.TEXT_MEDIUM} />}
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
              />
              <EditField
                icon={<Ionicons name="phone-portrait-outline" size={20} color={colors.TEXT_MEDIUM} />}
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </>
          ) : (
            <>
              <MenuItem
                icon={<Ionicons name="person-outline" size={20} color={colors.TEXT_MEDIUM} />}
                label="Full Name"
                value={`${user?.firstName} ${user?.lastName}`}
                onPress={handleEditToggle}
              />
              <MenuItem
                icon={<Ionicons name="mail-outline" size={20} color={colors.TEXT_MEDIUM} />}
                label="Email"
                value={user?.email}
                onPress={() => {}}
              />
              <MenuItem
                icon={<Ionicons name="phone-portrait-outline" size={20} color={colors.TEXT_MEDIUM} />}
                label="Phone"
                value={user?.phone}
                onPress={handleEditToggle}
              />
            </>
          )}
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferences</Text>
          <MenuItem
            icon={<Ionicons name="notifications-outline" size={20} color={colors.TEXT_MEDIUM} />}
            label="Notifications"
            onPress={() => {}}
          />
          <MenuItem
            icon={<Ionicons name="location-outline" size={20} color={colors.TEXT_MEDIUM} />}
            label="Location Settings"
            onPress={() => {}}
          />
          <MenuItem
            icon={<Ionicons name="moon-outline" size={20} color={colors.TEXT_MEDIUM} />}
            label="Appearance"
            onPress={() => {}}
          />
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Support</Text>
          <MenuItem
            icon={<Ionicons name="help-circle-outline" size={20} color={colors.TEXT_MEDIUM} />}
            label="Help & FAQ"
            onPress={() => {}}
          />
          <MenuItem
            icon={<Ionicons name="document-text-outline" size={20} color={colors.TEXT_MEDIUM} />}
            label="Privacy Policy"
            onPress={() => {}}
          />
          <MenuItem
            icon={<Ionicons name="reader-outline" size={20} color={colors.TEXT_MEDIUM} />}
            label="Terms of Service"
            onPress={() => {}}
          />
          <MenuItem
            icon={<Ionicons name="information-circle-outline" size={20} color={colors.TEXT_MEDIUM} />}
            label="App Version"
            value="1.0.0"
            onPress={() => {}}
          />
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <MenuItem
            icon={<Ionicons name="log-out-outline" size={20} color={colors.SOS_RED} />}
            label="Log Out"
            onPress={handleLogout}
            danger
          />
        </View>
      </ScrollView>

      {/* Toast */}
      <Toast toast={toast} />
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.BACKGROUND_LIGHT },
  scrollOffsetForBanner: {
    marginTop: 44,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: colors.BACKGROUND_WHITE,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER_GREY,
    gap: 6,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarFallback: {
    backgroundColor: colors.BORDER_GREY,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.TEXT_DARK,
  },
  email: {
    fontSize: 14,
    color: colors.TEXT_MEDIUM,
  },
  editBtn: {
    marginTop: 8,
    backgroundColor: colors.PRIMARY_BLUE,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 100,
    minWidth: 120,
    alignItems: 'center',
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelEditBtn: {
    paddingVertical: 4,
  },
  cancelEditText: {
    fontSize: 14,
    color: colors.TEXT_MEDIUM,
  },
  section: {
    backgroundColor: colors.BACKGROUND_WHITE,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.BORDER_GREY,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.PLACEHOLDER_GREY,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.BORDER_GREY,
    gap: 14,
  },
  menuIconBox: {
    width: 28,
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.TEXT_DARK,
  },
  menuValue: {
    fontSize: 12,
    color: colors.PLACEHOLDER_GREY,
  },
  editField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.BORDER_GREY,
    gap: 14,
  },
  editFieldContent: {
    flex: 1,
    gap: 4,
  },
  editFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.PLACEHOLDER_GREY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editInput: {
    fontSize: 15,
    color: colors.TEXT_DARK,
    borderBottomWidth: 1,
    borderBottomColor: colors.PRIMARY_BLUE,
    paddingVertical: 4,
  },
});

export default ProfileScreen;

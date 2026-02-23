import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser, updateProfile } from '../../store/authSlice';
import NoInternetBanner from '../../components/NoInternetBanner';
import useNetInfo from '../../hooks/useNetInfo';
import colors from '../../utils/colors';

const MenuItem = ({ icon, label, value, onPress, danger }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.75}>
    <Text style={styles.menuIcon}>{icon}</Text>
    <View style={styles.menuContent}>
      <Text style={[styles.menuLabel, danger && { color: colors.SOS_RED }]}>{label}</Text>
      {value && <Text style={styles.menuValue}>{value}</Text>}
    </View>
    {!danger && <Text style={styles.chevron}>›</Text>}
  </TouchableOpacity>
);

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const loading = useSelector((state) => state.auth.loading);
  const { isConnected } = useNetInfo();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');

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
      Alert.alert('Validation', 'First name cannot be empty.');
      return;
    }
    const result = await dispatch(
      updateProfile({ first_name: firstName.trim(), last_name: lastName.trim(), phone_number: phone.trim() })
    );
    if (updateProfile.fulfilled.match(result)) {
      setEditing(false);
    } else {
      Alert.alert('Update Failed', result.payload || 'Could not save changes.');
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
              <Text style={styles.avatarPersonIcon}>👤</Text>
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
              <ActivityIndicator size="small" color={colors.BACKGROUND_WHITE} />
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
              <EditField icon="👤" label="First Name" value={firstName} onChangeText={setFirstName} />
              <EditField icon="👤" label="Last Name" value={lastName} onChangeText={setLastName} />
              <EditField icon="📱" label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </>
          ) : (
            <>
              <MenuItem icon="👤" label="Full Name" value={`${user?.firstName} ${user?.lastName}`} onPress={handleEditToggle} />
              <MenuItem icon="📧" label="Email" value={user?.email} onPress={() => {}} />
              <MenuItem icon="📱" label="Phone" value={user?.phone} onPress={handleEditToggle} />
            </>
          )}
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferences</Text>
          <MenuItem icon="🔔" label="Notifications" onPress={() => {}} />
          <MenuItem icon="📍" label="Location Settings" onPress={() => {}} />
          <MenuItem icon="🌙" label="Appearance" onPress={() => {}} />
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Support</Text>
          <MenuItem icon="❓" label="Help & FAQ" onPress={() => {}} />
          <MenuItem icon="📄" label="Privacy Policy" onPress={() => {}} />
          <MenuItem icon="📜" label="Terms of Service" onPress={() => {}} />
          <MenuItem icon="ℹ️" label="App Version" value="1.0.0" onPress={() => {}} />
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <MenuItem icon="🚪" label="Log Out" onPress={handleLogout} danger />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const EditField = ({ icon, label, value, onChangeText, keyboardType }) => (
  <View style={styles.editField}>
    <Text style={styles.menuIcon}>{icon}</Text>
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

const styles = StyleSheet.create({
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
    backgroundColor: '#E5E7EB',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.BACKGROUND_WHITE,
  },
  avatarPersonIcon: {
    fontSize: 36,
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
    color: colors.BACKGROUND_WHITE,
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
  menuIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
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
  chevron: {
    fontSize: 20,
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

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useTheme } from '../../context/ThemeContext';
import { changePassword, deleteAccount } from '../../store/authSlice';
import InputField from '../../components/InputField';
import PrimaryButton from '../../components/PrimaryButton';

const SettingRow = ({ icon, label, value, onPress, danger, colors, rightElement }) => {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.rowIconBox}>{icon}</View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger && { color: colors.ACCENT_RED }]}>
          {label}
        </Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {rightElement || (onPress && !danger && (
        <Ionicons name="chevron-forward" size={18} color={colors.PLACEHOLDER_GREY} />
      ))}
    </TouchableOpacity>
  );
};

const SettingsScreen = ({ navigation }) => {
  const { isDark, toggleTheme, colors } = useTheme();
  const dispatch = useDispatch();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Change password modal
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [cpForm, setCpForm] = useState({ current: '', next: '', confirm: '' });
  const [cpError, setCpError] = useState('');
  const [cpLoading, setCpLoading] = useState(false);
  const setCp = (key) => (val) => setCpForm((f) => ({ ...f, [key]: val }));

  const handleChangePassword = async () => {
    setCpError('');
    if (!cpForm.current || !cpForm.next || !cpForm.confirm) {
      setCpError('All fields are required.'); return;
    }
    if (cpForm.next !== cpForm.confirm) {
      setCpError('New passwords do not match.'); return;
    }
    if (cpForm.next.length < 8) {
      setCpError('Password must be at least 8 characters.'); return;
    }
    setCpLoading(true);
    const result = await dispatch(changePassword({ current_password: cpForm.current, new_password: cpForm.next }));
    setCpLoading(false);
    if (changePassword.fulfilled.match(result)) {
      setShowChangePassword(false);
      setCpForm({ current: '', next: '', confirm: '' });
      Alert.alert('Success', 'Password changed successfully.');
    } else {
      setCpError(result.payload || 'Failed to change password.');
    }
  };

  // Delete account modal
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleteError('');
    if (!deletePassword) { setDeleteError('Password is required.'); return; }
    setDeleteLoading(true);
    const result = await dispatch(deleteAccount({ password: deletePassword }));
    setDeleteLoading(false);
    if (deleteAccount.fulfilled.match(result)) {
      setShowDeleteAccount(false);
    } else {
      setDeleteError(result.payload || 'Failed to delete account.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <View style={styles.backRow}>
            <Ionicons name="chevron-back" size={20} color={colors.PRIMARY_BLUE} />
            <Text style={styles.backText}>Back</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings & Support</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Appearance</Text>
          <SettingRow
            icon={<Ionicons name="moon-outline" size={20} color={colors.TEXT_MEDIUM} />}
            label="Dark Mode"
            colors={colors}
            rightElement={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                thumbColor={colors.BACKGROUND_WHITE}
                trackColor={{ false: colors.BORDER_GREY, true: colors.PRIMARY_BLUE }}
              />
            }
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notifications</Text>
          <SettingRow
            icon={<Ionicons name="notifications-outline" size={20} color={colors.TEXT_MEDIUM} />}
            label="Push Notifications"
            onPress={() => {}}
            colors={colors}
          />
          <SettingRow
            icon={<Ionicons name="phone-portrait-outline" size={20} color={colors.TEXT_MEDIUM} />}
            label="Vibration Alerts"
            onPress={() => {}}
            colors={colors}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Location</Text>
          <SettingRow
            icon={<Ionicons name="location-outline" size={20} color={colors.TEXT_MEDIUM} />}
            label="Location Accuracy"
            value="High"
            onPress={() => {}}
            colors={colors}
          />
          <SettingRow
            icon={<Ionicons name="map-outline" size={20} color={colors.TEXT_MEDIUM} />}
            label="Background Location"
            onPress={() => {}}
            colors={colors}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <SettingRow
            icon={<Ionicons name="lock-closed-outline" size={20} color={colors.TEXT_MEDIUM} />}
            label="Change Password"
            onPress={() => setShowChangePassword(true)}
            colors={colors}
          />
          <SettingRow
            icon={<Ionicons name="trash-outline" size={20} color={colors.ACCENT_RED} />}
            label="Delete Account"
            onPress={() => setShowDeleteAccount(true)}
            colors={colors}
            danger
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Support</Text>
          <SettingRow
            icon={<Ionicons name="help-circle-outline" size={20} color={colors.TEXT_MEDIUM} />}
            label="Help & FAQ"
            onPress={() => {}}
            colors={colors}
          />
          <SettingRow
            icon={<Ionicons name="mail-outline" size={20} color={colors.TEXT_MEDIUM} />}
            label="Contact Support"
            onPress={() => Linking.openURL('mailto:support@liveguard.ng')}
            colors={colors}
          />
          <SettingRow
            icon={<Ionicons name="document-text-outline" size={20} color={colors.TEXT_MEDIUM} />}
            label="Privacy Policy"
            onPress={() => {}}
            colors={colors}
          />
          <SettingRow
            icon={<Ionicons name="reader-outline" size={20} color={colors.TEXT_MEDIUM} />}
            label="Terms of Service"
            onPress={() => {}}
            colors={colors}
          />
          <SettingRow
            icon={<Ionicons name="information-circle-outline" size={20} color={colors.TEXT_MEDIUM} />}
            label="App Version"
            value="1.0.0"
            colors={colors}
          />
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showChangePassword} transparent animationType="slide" onRequestClose={() => setShowChangePassword(false)}>
        <TouchableOpacity style={settingModalStyles.overlay} activeOpacity={1} onPress={() => setShowChangePassword(false)}>
          <TouchableOpacity activeOpacity={1} style={[settingModalStyles.sheet, { backgroundColor: colors.BACKGROUND_WHITE }]}>
            <View style={[settingModalStyles.handle, { backgroundColor: colors.BORDER_GREY }]} />
            <Text style={[settingModalStyles.title, { color: colors.TEXT_DARK }]}>Change Password</Text>
            {cpError ? <Text style={[settingModalStyles.errorText, { color: colors.ERROR_RED }]}>{cpError}</Text> : null}
            <View style={settingModalStyles.fields}>
              <InputField label="Current Password" placeholder="Current password" value={cpForm.current} onChangeText={setCp('current')} secureTextEntry />
              <InputField label="New Password" placeholder="New password" value={cpForm.next} onChangeText={setCp('next')} secureTextEntry />
              <InputField label="Confirm New Password" placeholder="Confirm new password" value={cpForm.confirm} onChangeText={setCp('confirm')} secureTextEntry />
            </View>
            <PrimaryButton title="Update Password" onPress={handleChangePassword} loading={cpLoading} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteAccount} transparent animationType="slide" onRequestClose={() => setShowDeleteAccount(false)}>
        <TouchableOpacity style={settingModalStyles.overlay} activeOpacity={1} onPress={() => setShowDeleteAccount(false)}>
          <TouchableOpacity activeOpacity={1} style={[settingModalStyles.sheet, { backgroundColor: colors.BACKGROUND_WHITE }]}>
            <View style={[settingModalStyles.handle, { backgroundColor: colors.BORDER_GREY }]} />
            <Text style={[settingModalStyles.title, { color: colors.TEXT_DARK }]}>Delete Account</Text>
            <Text style={[settingModalStyles.sub, { color: colors.TEXT_MEDIUM }]}>
              This action is permanent and cannot be undone. Enter your password to confirm.
            </Text>
            {deleteError ? <Text style={[settingModalStyles.errorText, { color: colors.ERROR_RED }]}>{deleteError}</Text> : null}
            <View style={settingModalStyles.fields}>
              <InputField label="Password" placeholder="Enter your password" value={deletePassword} onChangeText={setDeletePassword} secureTextEntry />
            </View>
            <TouchableOpacity
              style={[settingModalStyles.dangerBtn, { backgroundColor: colors.ACCENT_RED }]}
              onPress={handleDeleteAccount}
              disabled={deleteLoading}
            >
              <Text style={settingModalStyles.dangerBtnText}>{deleteLoading ? 'Deleting…' : 'Delete My Account'}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.BACKGROUND_LIGHT },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.BACKGROUND_WHITE,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER_GREY,
  },
  backBtn: {
    width: 60,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontSize: 16,
    color: colors.PRIMARY_BLUE,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.TEXT_DARK,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.BORDER_GREY,
    gap: 14,
  },
  rowIconBox: {
    width: 28,
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.TEXT_DARK,
  },
  rowValue: {
    fontSize: 12,
    color: colors.PLACEHOLDER_GREY,
  },
});

const settingModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '500',
  },
  fields: {
    gap: 12,
    marginBottom: 20,
  },
  dangerBtn: {
    height: 52,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default SettingsScreen;

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../store/authSlice';
import colors from '../utils/colors';

const DrawerContent = (props) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    props.navigation.replace('OnboardingScreen');
  };

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean).map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>

      {/* User profile row */}
      <TouchableOpacity
        style={styles.profileRow}
        onPress={() => props.navigation.navigate('MainTabs', { screen: 'ProfileTab' })}
        activeOpacity={0.75}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{user?.full_name || `${user?.first_name} ${user?.last_name}`}</Text>
          <Text style={styles.personalLabel}>Personal</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* Menu items */}
      <MenuItem icon="👤" label="My profile"    onPress={() => props.navigation.navigate('MainTabs', { screen: 'ProfileTab' })} />
      <MenuItem icon="🔔" label="Notification"  onPress={() => {}} />
      <MenuItem icon="👥" label="Invite friends" onPress={() => {}} />

      {/* Dark mode toggle */}
      <View style={styles.menuItem}>
        <Text style={styles.menuIcon}>🌙</Text>
        <Text style={styles.menuLabel}>Dark mode</Text>
        <Switch
          value={darkMode}
          onValueChange={setDarkMode}
          thumbColor={colors.BACKGROUND_WHITE}
          trackColor={{ false: colors.BORDER_GREY, true: colors.SUCCESS_GREEN }}
          style={styles.toggle}
        />
      </View>

      <View style={styles.spacer} />
      <View style={styles.divider} />

      <MenuItem icon="❓" label="Settings & support" onPress={() => props.navigation.navigate('SettingsScreen')} />
      <MenuItem icon="🚪" label="Log Out" onPress={handleLogout} danger />

    </DrawerContentScrollView>
  );
};

const MenuItem = ({ icon, label, onPress, danger }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.menuIcon}>{icon}</Text>
    <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND_LIGHT,
    paddingBottom: 24,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.BACKGROUND_WHITE,
    fontSize: 18,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.PRIMARY_NAVY,
  },
  personalLabel: {
    fontSize: 13,
    color: colors.TEXT_MEDIUM,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: colors.TEXT_MEDIUM,
  },
  divider: {
    height: 1,
    backgroundColor: colors.BORDER_GREY,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 20,
    gap: 14,
  },
  menuIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.TEXT_DARK,
  },
  menuLabelDanger: {
    color: colors.ACCENT_RED,
  },
  toggle: {
    marginLeft: 'auto',
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
});

export default DrawerContent;

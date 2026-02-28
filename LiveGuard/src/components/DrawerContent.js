import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../store/authSlice';
import { useTheme } from '../context/ThemeContext';

const DrawerContent = (props) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { isDark, toggleTheme, colors } = useTheme();

  const handleLogout = async () => {
    await dispatch(logoutUser());
    props.navigation.replace('OnboardingScreen');
  };

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean).map(n => n[0]).join('').toUpperCase() || 'U';

  const styles = useMemo(() => makeStyles(colors), [colors]);

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
        <Ionicons name="chevron-forward" size={20} color={colors.TEXT_MEDIUM} />
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* Menu items */}
      <MenuItem
        icon={<Ionicons name="person-outline" size={22} color={colors.TEXT_MEDIUM} />}
        label="My profile"
        onPress={() => props.navigation.navigate('MainTabs', { screen: 'ProfileTab' })}
        colors={colors}
      />
      <MenuItem
        icon={<MaterialCommunityIcons name="alarm-light-outline" size={22} color={colors.TEXT_MEDIUM} />}
        label="Emergency Contacts"
        onPress={() => props.navigation.navigate('EmergencyContactsScreen')}
        colors={colors}
      />
      <MenuItem
        icon={<Ionicons name="notifications-outline" size={22} color={colors.TEXT_MEDIUM} />}
        label="Notification"
        onPress={() => {}}
        colors={colors}
      />
      <MenuItem
        icon={<Ionicons name="people-outline" size={22} color={colors.TEXT_MEDIUM} />}
        label="Invite friends"
        onPress={() => {}}
        colors={colors}
      />

      {/* Dark mode toggle */}
      <View style={styles.darkModeRow}>
        <View style={styles.menuIconBox}>
          <Ionicons name="moon-outline" size={22} color={colors.TEXT_MEDIUM} />
        </View>
        <Text style={styles.menuLabel}>Dark mode</Text>
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          thumbColor={colors.BACKGROUND_WHITE}
          trackColor={{ false: colors.BORDER_GREY, true: colors.PRIMARY_BLUE }}
          style={styles.toggle}
        />
      </View>

      <View style={styles.spacer} />
      <View style={styles.divider} />

      <MenuItem
        icon={<Ionicons name="help-circle-outline" size={22} color={colors.TEXT_MEDIUM} />}
        label="Settings & support"
        onPress={() => props.navigation.navigate('SettingsScreen')}
        colors={colors}
      />
      <MenuItem
        icon={<Ionicons name="log-out-outline" size={22} color={colors.ACCENT_RED} />}
        label="Log Out"
        onPress={handleLogout}
        danger
        colors={colors}
      />

    </DrawerContentScrollView>
  );
};

const MenuItem = ({ icon, label, onPress, danger, colors }) => {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuIconBox}>{icon}</View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
    </TouchableOpacity>
  );
};

const makeStyles = (colors) => StyleSheet.create({
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.TEXT_DARK,
  },
  personalLabel: {
    fontSize: 13,
    color: colors.TEXT_MEDIUM,
    marginTop: 2,
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
  darkModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 20,
    gap: 14,
  },
  toggle: {
    alignSelf: 'center',
    flexShrink: 0,
  },
  menuIconBox: {
    width: 28,
    alignItems: 'center',
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
  spacer: {
    flex: 1,
    minHeight: 24,
  },
});

export default DrawerContent;

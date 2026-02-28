import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

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
  const styles = useMemo(() => makeStyles(colors), [colors]);

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

export default SettingsScreen;

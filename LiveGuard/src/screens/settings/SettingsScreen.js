import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../../utils/colors';

const SettingRow = ({ icon, label, value, onPress, danger }) => (
  <TouchableOpacity
    style={styles.row}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <Text style={styles.rowIcon}>{icon}</Text>
    <View style={styles.rowContent}>
      <Text style={[styles.rowLabel, danger && { color: colors.ACCENT_RED }]}>
        {label}
      </Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
    </View>
    {onPress && !danger && <Text style={styles.chevron}>›</Text>}
  </TouchableOpacity>
);

const SettingsScreen = ({ navigation }) => (
  <SafeAreaView style={styles.safe}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Settings & Support</Text>
      <View style={styles.backBtn} />
    </View>

    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notifications</Text>
        <SettingRow icon="🔔" label="Push Notifications" onPress={() => {}} />
        <SettingRow icon="📳" label="Vibration Alerts" onPress={() => {}} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Location</Text>
        <SettingRow icon="📍" label="Location Accuracy" value="High" onPress={() => {}} />
        <SettingRow icon="🗺️" label="Background Location" onPress={() => {}} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Support</Text>
        <SettingRow
          icon="❓"
          label="Help & FAQ"
          onPress={() => {}}
        />
        <SettingRow
          icon="📧"
          label="Contact Support"
          onPress={() => Linking.openURL('mailto:support@liveguard.ng')}
        />
        <SettingRow
          icon="📄"
          label="Privacy Policy"
          onPress={() => {}}
        />
        <SettingRow
          icon="📜"
          label="Terms of Service"
          onPress={() => {}}
        />
        <SettingRow icon="ℹ️" label="App Version" value="1.0.0" />
      </View>
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
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
  rowIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
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
  chevron: {
    fontSize: 20,
    color: colors.PLACEHOLDER_GREY,
  },
});

export default SettingsScreen;

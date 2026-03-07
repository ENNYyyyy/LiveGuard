import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const LAST_UPDATED = 'March 2026';

const PRIVACY_SECTIONS = [
  {
    heading: '1. Information We Collect',
    body: 'We collect information you provide when registering (name, email, phone number), your device location when you submit an emergency alert, your device push token for notifications, and emergency contact details you choose to store.',
  },
  {
    heading: '2. How We Use Your Information',
    body: 'Your information is used solely to operate the LiveGuard emergency response service: routing alerts to appropriate agencies, sending push notifications about your alert status, and enabling emergency contacts to be notified via SMS.',
  },
  {
    heading: '3. Location Data',
    body: 'Location is captured at the time of alert submission and during an active alert to provide real-time position updates to responding agencies. We do not track your location at any other time.',
  },
  {
    heading: '4. Data Sharing',
    body: 'Your alert data (type, location, description) is shared with the security agency assigned to respond. We do not sell your personal data to third parties. Third-party services used include Twilio (SMS), Firebase (push notifications), and mapping providers.',
  },
  {
    heading: '5. Data Retention',
    body: 'Alert records are retained for up to 5 years for safety audit purposes. Account data is deleted upon account deletion. You may request deletion of your data by contacting support.',
  },
  {
    heading: '6. Security',
    body: 'All data is transmitted over HTTPS. Passwords are hashed and never stored in plain text. Access tokens expire after 60 minutes and are rotated on every refresh.',
  },
  {
    heading: '7. Contact',
    body: 'For privacy concerns, contact us at support@liveguard.ng.',
  },
];

const TERMS_SECTIONS = [
  {
    heading: '1. Acceptance of Terms',
    body: 'By using LiveGuard, you agree to these Terms of Service. If you do not agree, do not use the app.',
  },
  {
    heading: '2. Intended Use',
    body: 'LiveGuard is designed exclusively for reporting genuine emergencies. Submitting false alerts is a misuse of the service and may result in account suspension and legal consequences.',
  },
  {
    heading: '3. User Responsibilities',
    body: 'You are responsible for ensuring your contact information and emergency contacts are accurate. You must maintain the security of your account credentials and notify us immediately of any unauthorised access.',
  },
  {
    heading: '4. No Guarantee of Response',
    body: 'While LiveGuard dispatches alerts to the nearest available agencies, we cannot guarantee response times or outcomes. Do not rely solely on LiveGuard in situations where calling emergency services directly is possible.',
  },
  {
    heading: '5. Limitation of Liability',
    body: 'LiveGuard and its operators are not liable for any harm resulting from delayed, failed, or incorrect emergency responses. The service is provided on an "as is" basis.',
  },
  {
    heading: '6. Account Termination',
    body: 'We reserve the right to suspend or terminate accounts that misuse the platform, submit false alerts, or violate these terms.',
  },
  {
    heading: '7. Changes to Terms',
    body: 'We may update these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms.',
  },
];

const CONTENT = {
  privacy: { title: 'Privacy Policy', sections: PRIVACY_SECTIONS },
  terms:   { title: 'Terms of Service', sections: TERMS_SECTIONS },
};

const LegalScreen = ({ navigation, route }) => {
  const type = route?.params?.type || 'privacy';
  const { title, sections } = CONTENT[type] || CONTENT.privacy;
  const { colors } = useTheme();
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
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last updated: {LAST_UPDATED}</Text>
        {sections.map((section, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
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
  backBtn: { width: 60 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { fontSize: 16, color: colors.PRIMARY_BLUE, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.TEXT_DARK },
  content: { padding: 20, paddingBottom: 48 },
  lastUpdated: {
    fontSize: 12,
    color: colors.PLACEHOLDER_GREY,
    marginBottom: 20,
  },
  section: { marginBottom: 20 },
  heading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.TEXT_DARK,
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    color: colors.TEXT_MEDIUM,
    lineHeight: 22,
  },
});

export default LegalScreen;

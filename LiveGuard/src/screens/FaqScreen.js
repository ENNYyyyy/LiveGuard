import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const FAQS = [
  {
    q: 'How do I send an emergency alert?',
    a: 'From the Home screen, tap the red SOS button. Select the emergency type, answer the risk assessment questions, then tap "Confirm Emergency Alert". Your location and alert are sent immediately to the nearest response agencies.',
  },
  {
    q: 'What happens after I send an alert?',
    a: 'Your alert is dispatched to the appropriate security agencies based on the emergency type and your location. You will receive a push notification when an agency acknowledges your alert and can track their estimated arrival time on the Alert Status screen.',
  },
  {
    q: 'How do I cancel a false alarm?',
    a: 'Open the Alert Status screen (accessible from the Home screen or History tab) and tap "Cancel Alert". You can only cancel alerts that are Pending or Dispatched. Cancellation immediately notifies any assigned agencies so they can stand down.',
  },
  {
    q: 'Why does the app need my location?',
    a: 'Your location is required to route your alert to the nearest available response agencies. Without location data, agencies cannot find you quickly. Location is only accessed when you send an alert or when you open the app; it is never tracked in the background without your permission.',
  },
  {
    q: 'What are emergency contacts and how do I add them?',
    a: 'Emergency contacts are people who receive an automatic SMS when you send an alert. To add them, open the drawer menu and tap "Emergency Contacts". You can add contacts from your phone book or by entering a number manually.',
  },
  {
    q: 'How do I rate my experience after an alert is resolved?',
    a: 'Once your alert status changes to Resolved, the Alert Status screen will show a 1–5 star rating prompt. Your rating helps improve the quality of emergency response services. Ratings can only be submitted once per alert.',
  },
  {
    q: 'What should I do if the app cannot get my location?',
    a: 'Ensure location permissions are granted in your device settings (Settings → LiveGuard → Location → While Using or Always). If the problem persists, move to an open area and tap the locate button on the map to retry.',
  },
];

const FaqItem = ({ item, colors }) => {
  const [open, setOpen] = useState(false);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <TouchableOpacity style={styles.item} onPress={toggle} activeOpacity={0.75}>
      <View style={styles.itemHeader}>
        <Text style={styles.question}>{item.q}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.TEXT_MEDIUM}
        />
      </View>
      {open && <Text style={styles.answer}>{item.a}</Text>}
    </TouchableOpacity>
  );
};

const FaqScreen = ({ navigation }) => {
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
        <Text style={styles.headerTitle}>Help & FAQ</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.intro}>Frequently asked questions about LiveGuard.</Text>
        {FAQS.map((item, i) => (
          <FaqItem key={i} item={item} colors={colors} />
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
  content: { padding: 16, paddingBottom: 48 },
  intro: {
    fontSize: 14,
    color: colors.TEXT_MEDIUM,
    lineHeight: 20,
    marginBottom: 12,
  },
  item: {
    backgroundColor: colors.BACKGROUND_WHITE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.BORDER_GREY,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  question: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.TEXT_DARK,
    lineHeight: 21,
  },
  answer: {
    marginTop: 10,
    fontSize: 14,
    color: colors.TEXT_MEDIUM,
    lineHeight: 22,
  },
});

export default FaqScreen;

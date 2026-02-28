import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { getContacts, saveContacts } from '../../services/contactsService';
import InputField from '../../components/InputField';
import PrimaryButton from '../../components/PrimaryButton';

const MAX_CONTACTS = 3;

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
        toastStyles.container,
        { backgroundColor: isSuccess ? '#16A34A' : '#DC2626', opacity },
      ]}
    >
      <Ionicons
        name={isSuccess ? 'checkmark-circle' : 'alert-circle'}
        size={16}
        color="#FFFFFF"
      />
      <Text style={toastStyles.text}>{toast.message}</Text>
    </Animated.View>
  );
};

const toastStyles = StyleSheet.create({
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
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});

// ── Screen ─────────────────────────────────────────────────────────────────────
const EmergencyContactsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const toastTimer = useRef(null);

  const [contacts, setContacts]     = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [formName, setFormName]     = useState('');
  const [formPhone, setFormPhone]   = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);

  useEffect(() => {
    getContacts().then(setContacts);
  }, []);

  const showToast = (message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 2700);
  };

  const handleAdd = async () => {
    const errs = {};
    if (!formName.trim())  errs.name  = 'Please enter a name';
    if (!formPhone.trim()) errs.phone = 'Please enter a phone number';
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const newContact = {
        id: Date.now().toString(),
        name: formName.trim(),
        phone: formPhone.trim(),
      };
      const updated = [...contacts, newContact];
      await saveContacts(updated);
      setContacts(updated);
      setFormName('');
      setFormPhone('');
      setShowForm(false);
      setFormErrors({});
      showToast(`${newContact.name} added as emergency contact.`);
    } catch {
      showToast('Failed to save contact. Try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert('Remove Contact', `Remove ${name} from emergency contacts?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = contacts.filter(c => c.id !== id);
            await saveContacts(updated);
            setContacts(updated);
            showToast(`${name} removed.`);
          } catch {
            showToast('Failed to remove contact.', 'error');
          }
        },
      },
    ]);
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormName('');
    setFormPhone('');
    setFormErrors({});
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="phone-portrait-outline" size={22} color={colors.PRIMARY_BLUE} style={{ marginTop: 1 }} />
          <Text style={styles.infoText}>
            When you send an SOS alert, these contacts are notified by SMS with your location.
          </Text>
        </View>

        {/* Contact cards */}
        {contacts.map((contact) => (
          <View key={contact.id} style={styles.contactCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {contact.name[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactPhone}>{contact.phone}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(contact.id, contact.name)}
              style={styles.deleteBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color={colors.ERROR_RED} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Inline add form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Contact</Text>

            <InputField
              label="Full Name"
              placeholder="e.g. Chidi Obi"
              value={formName}
              onChangeText={setFormName}
              autoCapitalize="words"
              error={formErrors.name}
            />

            <View style={styles.gap12} />

            <InputField
              label="Phone Number"
              placeholder="+234 801 234 5678"
              value={formPhone}
              onChangeText={setFormPhone}
              keyboardType="phone-pad"
              error={formErrors.phone}
            />

            <View style={styles.gap20} />

            <PrimaryButton title="Save Contact" onPress={handleAdd} loading={saving} />

            <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Add button */}
        {!showForm && contacts.length < MAX_CONTACTS && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowForm(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.PRIMARY_BLUE} />
            <Text style={styles.addBtnText}>Add Emergency Contact</Text>
          </TouchableOpacity>
        )}

        {contacts.length >= MAX_CONTACTS && !showForm && (
          <View style={styles.maxBanner}>
            <Ionicons name="checkmark-circle" size={16} color={colors.PRIMARY_BLUE} />
            <Text style={styles.maxText}>Maximum {MAX_CONTACTS} contacts added.</Text>
          </View>
        )}
      </ScrollView>

      {/* Toast */}
      <Toast toast={toast} />
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.BACKGROUND_LIGHT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.BACKGROUND_WHITE,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER_GREY,
  },
  backBtn: {
    width: 32,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.TEXT_DARK,
  },
  headerRight: {
    width: 32,
  },
  container: {
    padding: 20,
    paddingBottom: 48,
    gap: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.CHIP_ACTIVE_BG,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.PRIMARY_BLUE,
    fontWeight: '500',
    lineHeight: 21,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.CARD_WHITE,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  contactInfo: {
    flex: 1,
    gap: 3,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.TEXT_DARK,
  },
  contactPhone: {
    fontSize: 13,
    color: colors.TEXT_MEDIUM,
  },
  deleteBtn: {
    padding: 8,
  },
  formCard: {
    backgroundColor: colors.CARD_WHITE,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.TEXT_DARK,
    marginBottom: 16,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.PRIMARY_BLUE,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 16,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.PRIMARY_BLUE,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.TEXT_MEDIUM,
  },
  maxBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  maxText: {
    fontSize: 13,
    color: colors.TEXT_MEDIUM,
  },
  gap12: { height: 12 },
  gap20: { height: 20 },
});

export default EmergencyContactsScreen;

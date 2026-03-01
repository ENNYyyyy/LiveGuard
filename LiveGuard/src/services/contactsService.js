import AsyncStorage from '@react-native-async-storage/async-storage';

const CONTACTS_KEY = 'EMERGENCY_CONTACTS';

export const getContacts = async () => {
  try {
    const raw = await AsyncStorage.getItem(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveContacts = async (contacts) => {
  await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
};

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import DrawerContent from '../components/DrawerContent';
import { loadStoredAuth } from '../store/authSlice';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/home/HomeScreen';
import EmergencyAlertScreen from '../screens/alert/EmergencyAlertScreen';
import LocationPickerScreen from '../screens/alert/LocationPickerScreen';
import AlertStatusScreen from '../screens/alert/AlertStatusScreen';
import IncidentHistoryScreen from '../screens/history/IncidentHistoryScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import EmergencyContactsScreen from '../screens/contacts/EmergencyContactsScreen';
import OnboardingWalkthrough from '../screens/OnboardingWalkthrough';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// ─── Home Stack ───────────────────────────────────────────────────────────────
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen
        name="EmergencyAlertScreen"
        component={EmergencyAlertScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="LocationPickerScreen" component={LocationPickerScreen} />
    </Stack.Navigator>
  );
}

// ─── Bottom Tab Navigator ─────────────────────────────────────────────────────
function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.BACKGROUND_WHITE,
          height: 60,
          borderTopWidth: 0.5,
          borderTopColor: colors.BORDER_GREY,
        },
        tabBarActiveTintColor: colors.TAB_ACTIVE,
        tabBarInactiveTintColor: colors.TAB_INACTIVE,
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={IncidentHistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'location' : 'location-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Drawer Navigator ─────────────────────────────────────────────────────────
function MainDrawer() {
  const { colors } = useTheme();
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: colors.BACKGROUND_LIGHT,
          width: '80%',
        },
      }}
    >
      <Drawer.Screen name="MainTabs" component={MainTabs} />
    </Drawer.Navigator>
  );
}

// ─── Root Stack ───────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const [onboardingSeen, setOnboardingSeen] = useState(null);

  useEffect(() => {
    dispatch(loadStoredAuth());
    AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_SEEN).then((val) => {
      setOnboardingSeen(val === 'true');
    });
  }, []);

  return (
    <Stack.Navigator
      initialRouteName="SplashScreen"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="SplashScreen">
        {(props) => <SplashScreen {...props} isAuthenticated={isAuthenticated} onboardingSeen={onboardingSeen} />}
      </Stack.Screen>
      <Stack.Screen name="OnboardingWalkthrough" component={OnboardingWalkthrough} />
      <Stack.Screen name="OnboardingScreen" component={OnboardingScreen} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
      <Stack.Screen name="MainDrawer" component={MainDrawer} />
      <Stack.Screen name="AlertStatusScreen" component={AlertStatusScreen} />
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="EmergencyContactsScreen" component={EmergencyContactsScreen} />
    </Stack.Navigator>
  );
}

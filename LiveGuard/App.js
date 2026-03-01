import 'react-native-gesture-handler';
import React from 'react';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import store from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import { configureNotifications } from './src/services/notificationService';
import { navigationRef } from './src/navigation/navigationRef';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { StatusBar } from 'expo-status-bar';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

configureNotifications();

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Provider store={store}>
          <ThemeProvider>
            <ThemedStatusBar />
            <NavigationContainer ref={navigationRef}>
              <AppNavigator />
            </NavigationContainer>
          </ThemeProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

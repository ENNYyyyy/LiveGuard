import { createRef } from 'react';

// Shared navigation ref — passed to NavigationContainer in App.js.
// Use this to navigate imperatively from outside React components (e.g. auth failure handler).
export const navigationRef = createRef();

export const resetToOnboarding = () => {
  navigationRef.current?.reset({
    index: 0,
    routes: [{ name: 'OnboardingScreen' }],
  });
};

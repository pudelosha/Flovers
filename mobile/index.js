/**
 * @format
 */

// Silence RNFirebase modular migration warnings (no behavior change)
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

// must be first import for React Navigation gestures
import 'react-native-gesture-handler';

// (optional, but recommended for performance with Navigation)
import { enableScreens } from 'react-native-screens';
enableScreens(true);

// FCM background handler (must be registered in the entry file)
import messaging from '@react-native-firebase/messaging';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  // Android will display notifications automatically for "notification" payloads.
  // This handler is mainly useful for data-only messages.
});

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

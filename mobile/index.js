/**
 * @format
 */

// must be first import for React Navigation gestures
import 'react-native-gesture-handler';

// (optional, but recommended for performance with Navigation)
import { enableScreens } from 'react-native-screens';
enableScreens(true);

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

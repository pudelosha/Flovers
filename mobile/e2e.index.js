// CI-only entry for the separately named smoke APK. Same application/navigation;
// deliberately no Firebase background registration or production project config.
import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

enableScreens(true);
AppRegistry.registerComponent(appName, () => App);

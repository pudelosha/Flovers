import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const logo = require('../../assets/images/splash_logo.png');

/** Match the native launch artwork while session and shell inputs are prepared. */
export default function LaunchScreen() {
  return (
    <View testID="app-launch-screen" style={styles.container}>
      <Image
        testID="app-launch-logo"
        source={logo}
        defaultSource={logo}
        style={styles.logo}
        resizeMode="contain"
        fadeDuration={0}
        accessibilityLabel="Flovers"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B1820',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  logo: { width: 220, height: 220 },
});

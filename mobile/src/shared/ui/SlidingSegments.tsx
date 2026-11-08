import React from 'react';
import {
  Animated,
  AnimatedView,
  Easing,
  I18nManager,
  StyleSheet,
  View,
} from '../theme/native';
import type { StyleProp, ViewStyle } from 'react-native';
import { ThemeContrastScope } from '../theme/ThemeContext';

/** One moving pill behind equal-width segment buttons; the bar and labels stay still. */
export default function SlidingSegments({
  selectedIndex,
  children,
  style,
  testID,
}: {
  selectedIndex: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const count = React.Children.count(children);
  const index = selectedIndex;
  const position = React.useRef(new Animated.Value(index)).current;
  const [width, setWidth] = React.useState(0);
  const slotWidth = Math.max(0, width - 6) / Math.max(1, count);
  React.useEffect(() => {
    const animation = Animated.timing(position, {
      toValue: index,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [position, index]);
  return (
    <View
      testID={testID}
      style={style}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
    >
      {slotWidth > 0 && (
        <AnimatedView
          testID={testID ? `${testID}-indicator` : undefined}
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              width: slotWidth,
              transform: [
                {
                  translateX: Animated.multiply(
                    position,
                    I18nManager.isRTL ? -slotWidth : slotWidth,
                  ),
                },
              ],
            },
          ]}
        />
      )}
      {React.Children.map(children, (child, i) => (
        <ThemeContrastScope kind={i === selectedIndex ? 'accent' : 'surface'}>
          {child}
        </ThemeContrastScope>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    start: 3,
    borderRadius: 17,
    backgroundColor: '#0B7285',
  },
});

import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
} from '../theme/native';
import SlidingSegments from './SlidingSegments';

type Option<Value extends string> = {
  value: Value;
  label: string;
  accessibilityLabel?: string;
};

const LABEL_SIZE = 10;
const MIN_LABEL_SIZE = 8;
const OPTION_PADDING = 4;

/** A form choice using the same moving selection pill as the screen segments. */
export default function SegmentedChoice<Value extends string>({
  value,
  options,
  onChange,
  style,
  testID,
  borderRadius = 16,
}: {
  value: Value;
  options: readonly Option<Value>[];
  onChange: (value: Value) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  borderRadius?: number;
}) {
  const innerRadius = Math.max(0, borderRadius - 3);
  const { fontScale } = useWindowDimensions();
  const measurementKey = JSON.stringify([
    fontScale,
    options.map(option => [option.value, option.label]),
  ]);
  const currentMeasurement = React.useRef(measurementKey);
  currentMeasurement.current = measurementKey;
  const [slotWidths, setSlotWidths] = React.useState<Record<string, number>>(
    {},
  );
  const [measuredLabels, setMeasuredLabels] = React.useState<{
    key: string;
    widths: Record<string, number>;
  } | null>(null);

  const labelSize = (optionValue: Value) => {
    const naturalWidth =
      measuredLabels?.key === measurementKey
        ? measuredLabels.widths[optionValue]
        : undefined;
    const availableWidth = (slotWidths[optionValue] ?? 0) - OPTION_PADDING * 2;
    // Native auto-fit can measure a temporary zero-sized Android text view
    // and shrink its cached text. Keep it disabled and wait for real widths.
    if (!naturalWidth || availableWidth <= 0) return LABEL_SIZE;
    return Math.max(
      MIN_LABEL_SIZE,
      Math.min(
        LABEL_SIZE,
        Math.floor((LABEL_SIZE * availableWidth) / naturalWidth),
      ),
    );
  };
  return (
    <>
      <SlidingSegments
        selectedIndex={options.findIndex(option => option.value === value)}
        style={[styles.bar, { borderRadius }, style]}
        indicatorStyle={{ borderRadius: innerRadius }}
        testID={testID}
      >
        {options.map(option => (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ selected: value === option.value }}
            onPress={() => onChange(option.value)}
            style={[styles.option, { borderRadius: innerRadius }]}
            onLayout={({ nativeEvent: { layout } }) => {
              if (layout.width <= 0) return;
              setSlotWidths(previous =>
                previous[option.value] === layout.width
                  ? previous
                  : { ...previous, [option.value]: layout.width },
              );
            }}
          >
            <Text
              style={[styles.label, { fontSize: labelSize(option.value) }]}
              numberOfLines={1}
              adjustsFontSizeToFit={false}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </SlidingSegments>
      {/* Horizontal content measures the real, unwrapped label widths without
        taking space in the form or participating in taps/accessibility. */}
      <ScrollView
        horizontal
        scrollEnabled={false}
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.measurement}
        showsHorizontalScrollIndicator={false}
      >
        {options.map(option => (
          <Text
            key={`${measurementKey}:${option.value}`}
            testID={testID ? `${testID}-measure-${option.value}` : undefined}
            style={styles.measurementLabel}
            adjustsFontSizeToFit={false}
            onLayout={({ nativeEvent: { layout } }) => {
              if (
                currentMeasurement.current !== measurementKey ||
                layout.width <= 0
              )
                return;
              setMeasuredLabels(previous => {
                const widths =
                  previous?.key === measurementKey ? previous.widths : {};
                return widths[option.value] === layout.width
                  ? previous
                  : {
                      key: measurementKey,
                      widths: { ...widths, [option.value]: layout.width },
                    };
              });
            }}
          >
            {option.label}
          </Text>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    padding: 3,
    backgroundColor: '#051F18',
  },
  option: {
    flex: 1,
    minWidth: 0,
    minHeight: 38,
    paddingHorizontal: OPTION_PADDING,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#FFFFFF',
    fontSize: LABEL_SIZE,
    lineHeight: 20,
    alignSelf: 'stretch',
    fontWeight: '700',
    textAlign: 'center',
  },
  measurement: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 24,
    opacity: 0,
  },
  measurementLabel: { fontSize: LABEL_SIZE, fontWeight: '700' },
});

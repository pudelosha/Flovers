import Svg,{Circle} from 'react-native-svg';
import React from 'react';
import Calendar from 'react-native-calendars/src/calendar';
import { useAppTheme } from './ThemeContext';
import { themeColor } from './palette';
import { Pressable, View, Text } from './native';
/** Explicit day surface avoids library-cached dark styles hiding marks in Light. */
export function LightCalendarDay({
  date,
  marking,
  state,
  onPress,
  onLongPress,
  children,
  accessibilityLabel,
  testID,
}: any) {
  const { colors } = useAppTheme();
  const selected = !!marking?.selected;
  const disabled =
    marking?.disableTouchEvent ||
    (marking?.disabled && marking?.disableTouchEvent !== false);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={!!disabled}
      onPress={() => onPress?.(date)}
      onLongPress={() => onLongPress?.(date)}
      style={{
        width: 36,
        minHeight: 40,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          overflow: 'hidden',
        }}
      >
        {selected && <Svg testID="calendar-selected-circle" width={32} height={32} style={{position:"absolute",top:0,left:0}} pointerEvents="none"><Circle cx={16} cy={16} r={16} fill="#CAE8DB"/></Svg>}
        <Text
          style={{
            fontSize: 16,
            color:
              state === 'disabled'
                ? '#809E91'
                : state === 'today'
                ? colors.accent
                : colors.text,
            fontWeight: selected ? '800' : '500',
          }}
        >
          {children ?? date?.day}
        </Text>
      </View>
      <View
        style={{
          height: 6,
          flexDirection: 'row',
          gap: 2,
          justifyContent: 'center',
        }}
      >
        {marking?.dots?.map((dot: any) => (
          <View
            key={dot.key}
            testID={`calendar-dot-${date?.dateString}-${dot.key}`}
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: dot.color,
            }}
          />
        ))}
      </View>
    </Pressable>
  );
}
export default function ThemedCalendar(
  props: React.ComponentProps<typeof Calendar>,
) {
  const { isLight, colors } = useAppTheme();
  if (!isLight) return <Calendar {...props} />;
  const marked = Object.fromEntries(
    Object.entries(props.markedDates || {}).map(
      ([day, mark]: [string, any]) => [
        day,
        {
          ...mark,
          selectedColor: '#CAE8DB',
          selectedTextColor: colors.text,
          dots: mark.dots?.map((dot: any) => ({
            ...dot,
            color: themeColor(dot.color, 'foreground', true),
          })),
        },
      ],
    ),
  );
  return (
    <Calendar
      key="light"
      {...props}
      dayComponent={props.dayComponent ?? LightCalendarDay}
      markedDates={marked}
      theme={{
        ...props.theme,
        backgroundColor: 'transparent',
        calendarBackground: 'transparent',
        monthTextColor: colors.text,
        dayTextColor: colors.text,
        textDisabledColor: '#809E91',
        arrowColor: colors.accent,
        todayTextColor: colors.accent,
        textSectionTitleColor: colors.secondary,
      }}
    />
  );
}

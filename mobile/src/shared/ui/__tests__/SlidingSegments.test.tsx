import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text } from '../../theme/native';
import SlidingSegments from '../SlidingSegments';
import { ThemeContext } from '../../theme/ThemeContext';
import { LIGHT_COLORS } from '../../theme/palette';

afterEach(() => jest.restoreAllMocks());

it('moves one pill between equal-width slots while preserving button actions', () => {
  jest
    .spyOn(Animated, 'timing')
    .mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
  const press = jest.fn();
  const bar = (selected: number) => (
    <SlidingSegments testID="segments" selectedIndex={selected}>
      {['Info', 'Tasks', 'Readings'].map(label => (
        <Pressable key={label} onPress={press}>
          <Text>{label}</Text>
        </Pressable>
      ))}
    </SlidingSegments>
  );
  const view = render(bar(0));
  fireEvent(view.getByTestId('segments'), 'layout', {
    nativeEvent: { layout: { width: 306 } },
  });
  const indicator = view.getByTestId('segments-indicator');
  expect(StyleSheet.flatten(indicator.props.style).width).toBe(100);
  view.rerender(bar(2));
  expect(view.getByTestId('segments-indicator')).toBe(indicator);
  expect(Animated.timing).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({
      toValue: 2,
      duration: 220,
      useNativeDriver: true,
    }),
  );
  fireEvent.press(view.getByText('Tasks'));
  expect(press).toHaveBeenCalledTimes(1);
});

it('keeps selected text white on the coloured pill in light mode', () => {
  const view = render(
    <ThemeContext.Provider value={{ isLight: true, colors: LIGHT_COLORS }}>
      <SlidingSegments selectedIndex={1}>
        <Text style={{ color: '#FFFFFF' }}>Info</Text>
        <Text style={{ color: '#FFFFFF' }}>Tasks</Text>
      </SlidingSegments>
    </ThemeContext.Provider>,
  );
  expect(StyleSheet.flatten(view.getByText('Tasks').props.style).color).toBe(
    '#FFFFFF',
  );
  expect(StyleSheet.flatten(view.getByText('Info').props.style).color).not.toBe(
    '#FFFFFF',
  );
});

import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import SegmentedChoice from '../SegmentedChoice';
import { ThemeContext } from '../../theme/ThemeContext';
import { DARK_COLORS, LIGHT_COLORS } from '../../theme/palette';

it.each([false, true])(
  'preserves readable labels and selected contrast (light: %s)',
  isLight => {
    const change = jest.fn();
    const options = [
      { value: 'S', label: 'Płd.', accessibilityLabel: 'Południe' },
      { value: 'N', label: 'Płn.', accessibilityLabel: 'Północ' },
    ];
    const content = (value: string, borderRadius?: number) => (
      <ThemeContext.Provider
        value={{ isLight, colors: isLight ? LIGHT_COLORS : DARK_COLORS }}
      >
        <SegmentedChoice
          testID="directions"
          value={value}
          options={options}
          onChange={change}
          borderRadius={borderRadius}
        />
      </ThemeContext.Provider>
    );
    const view = render(content('S'));
    fireEvent(view.getByTestId('directions'), 'layout', {
      nativeEvent: { layout: { width: 300 } },
    });
    const indicator = view.getByTestId('directions-indicator');
    expect(
      StyleSheet.flatten(view.getByTestId('directions').props.style)
        .borderRadius,
    ).toBe(16);
    expect(StyleSheet.flatten(indicator.props.style).borderRadius).toBe(13);
    expect(view.getByRole('tab', { name: 'Południe' })).toBeSelected();
    expect(
      StyleSheet.flatten(view.getByText('Płd.').props.style).fontSize,
    ).toBe(10);
    expect(view.getByText('Płd.').props.adjustsFontSizeToFit).toBe(false);
    expect(StyleSheet.flatten(view.getByText('Płd.').props.style).color).toBe(
      '#FFFFFF',
    );
    if (isLight)
      expect(
        StyleSheet.flatten(view.getByText('Płn.').props.style).color,
      ).not.toBe('#FFFFFF');
    fireEvent.press(view.getByRole('tab', { name: 'Północ' }));
    expect(change).toHaveBeenCalledWith('N');
    view.rerender(content('N', 14));
    expect(
      StyleSheet.flatten(view.getByTestId('directions').props.style)
        .borderRadius,
    ).toBe(14);
    expect(StyleSheet.flatten(indicator.props.style).borderRadius).toBe(11);
    expect(view.getByRole('tab', { name: 'Północ' })).toBeSelected();
    expect(view.getByRole('tab', { name: 'Południe' })).not.toBeSelected();
    expect(view.getByTestId('directions-indicator')).toBe(indicator);
  },
);

it('keeps short labels full-sized through zero-size layouts and repeated measurements', () => {
  const view = render(
    <SegmentedChoice
      testID="sizes"
      value="S"
      options={[
        { value: 'S', label: 'S' },
        { value: 'E', label: 'E' },
      ]}
      onChange={jest.fn()}
    />,
  );
  const slot = view.getByRole('tab', { name: 'S' });
  const measure = view.getByTestId('sizes-measure-S', {
    includeHiddenElements: true,
  });
  const fontSize = () =>
    StyleSheet.flatten(view.getByText('S').props.style).fontSize;
  expect(fontSize()).toBe(10);
  fireEvent(slot, 'layout', { nativeEvent: { layout: { width: 0 } } });
  fireEvent(measure, 'layout', { nativeEvent: { layout: { width: 11 } } });
  expect(fontSize()).toBe(10);
  fireEvent(slot, 'layout', { nativeEvent: { layout: { width: 80 } } });
  expect(fontSize()).toBe(10);
  fireEvent(slot, 'layout', { nativeEvent: { layout: { width: 0 } } });
  expect(fontSize()).toBe(10);
});

it('shrinks only genuinely long labels with a readable floor, and restores them when space grows', () => {
  const view = render(
    <SegmentedChoice
      testID="sizes"
      value="outdoor"
      options={[{ value: 'outdoor', label: 'Di luar ruangan' }]}
      onChange={jest.fn()}
    />,
  );
  const slot = view.getByRole('tab', { name: 'Di luar ruangan' });
  const measure = view.getByTestId('sizes-measure-outdoor', {
    includeHiddenElements: true,
  });
  const fontSize = () =>
    StyleSheet.flatten(view.getByText('Di luar ruangan').props.style).fontSize;
  fireEvent(slot, 'layout', { nativeEvent: { layout: { width: 120 } } });
  fireEvent(measure, 'layout', { nativeEvent: { layout: { width: 130 } } });
  expect(fontSize()).toBe(8);
  fireEvent(slot, 'layout', { nativeEvent: { layout: { width: 40 } } });
  expect(fontSize()).toBe(8);
  fireEvent(slot, 'layout', { nativeEvent: { layout: { width: 160 } } });
  expect(fontSize()).toBe(10);
  expect(view.getAllByRole('tab')).toHaveLength(1);
});

it('remeasures translated labels and ignores measurement events from the previous language', () => {
  const content = (label: string) => (
    <SegmentedChoice
      testID="sizes"
      value="indoor"
      options={[{ value: 'indoor', label }]}
      onChange={jest.fn()}
    />
  );
  const view = render(content('Indoor'));
  fireEvent(view.getByRole('tab'), 'layout', {
    nativeEvent: { layout: { width: 90 } },
  });
  const oldMeasurement = view.getByTestId('sizes-measure-indoor', {
    includeHiddenElements: true,
  }).props.onLayout;
  fireEvent(
    view.getByTestId('sizes-measure-indoor', { includeHiddenElements: true }),
    'layout',
    { nativeEvent: { layout: { width: 44 } } },
  );
  view.rerender(content('Innenbereich'));
  expect(
    StyleSheet.flatten(view.getByText('Innenbereich').props.style).fontSize,
  ).toBe(10);
  fireEvent(
    view.getByTestId('sizes-measure-indoor', { includeHiddenElements: true }),
    'layout',
    { nativeEvent: { layout: { width: 108 } } },
  );
  expect(
    StyleSheet.flatten(view.getByText('Innenbereich').props.style).fontSize,
  ).toBe(8);
  act(() => oldMeasurement({ nativeEvent: { layout: { width: 44 } } }));
  expect(
    StyleSheet.flatten(view.getByText('Innenbereich').props.style).fontSize,
  ).toBe(8);
});

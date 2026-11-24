import React from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { act, fireEvent, render, within } from '@testing-library/react-native';
import ReadingTile from '../ReadingTile';
import type { ReadingTileModel } from '../../types/readings.types';
import { ThemeContext } from '../../../../shared/theme/ThemeContext';
import { LIGHT_COLORS } from '../../../../shared/theme/palette';

const data: ReadingTileModel = {
  id: '1',
  name: 'Fern',
  status: 'enabled',
  lastReadISO: '2026-10-29T10:00:00Z',
  createdAtISO: '2026-10-29T09:00:00Z',
  intervalMinutes: 60,
  metrics: { temperature: 21, humidity: 50, light: 30, moisture: 40 },
  location: 'Bedroom',
  pumpIncluded: false,
  automaticPumpLaunch: false,
};
const callbacks = {
  isMenuOpen: false,
  onPressBody: jest.fn(),
  onPressMenu: jest.fn(),
  onEdit: jest.fn(),
  onDeviceDetails: jest.fn(),
  onHistory: jest.fn(),
  onPlantDetails: jest.fn(),
  onDelete: jest.fn(),
  onMetricPress: jest.fn(),
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-29T10:59:59Z'));
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.useRealTimers();
});

it('keeps readings in the upper panel and working pump controls in the overlapping lower section', () => {
  const onLaunchPump = jest.fn();
  const onAutoPumpToggle = jest.fn();
  const view = render(
    <ReadingTile
      data={{ ...data, pumpIncluded: true }}
      {...callbacks}
      onLaunchPump={onLaunchPump}
      onAutoPumpToggle={onAutoPumpToggle}
    />,
  );
  const readings = within(view.getByTestId('device-readings-section'));
  const pump = within(view.getByTestId('device-pump-section'));
  expect(readings.getByText('Fern')).toBeTruthy();
  expect(readings.getByText('50.0%')).toBeTruthy();
  expect(readings.queryByText('Automatic pump')).toBeNull();
  expect(view.getByTestId('device-readings-surface')).toBeTruthy();
  fireEvent.press(pump.getByText('Schedule watering'));
  expect(onLaunchPump).toHaveBeenCalledTimes(1);
  fireEvent(pump.getByRole('switch'), 'valueChange', true);
  expect(onAutoPumpToggle).toHaveBeenCalledWith(true);
  fireEvent.press(readings.getByText('50.0%'));
  expect(callbacks.onMetricPress).toHaveBeenCalledWith('humidity');
});

it('uses a single Profile-style surface when no pump is configured', () => {
  const view = render(<ReadingTile data={data} {...callbacks} />);
  expect(view.queryByTestId('device-pump-section')).toBeNull();
  expect(view.queryByTestId('device-readings-surface')).toBeNull();
  expect(view.getByTestId('device-base-surface').props.colors).toEqual([
    'rgba(16, 80, 63, 0.9)',
    'rgba(5, 31, 24, 0.9)',
  ]);
  expect(view.getByText('Fern')).toBeTruthy();
});

it('keeps pump controls unavailable to shared viewers', () => {
  const view = render(
    <ReadingTile
      data={{
        ...data,
        pumpIncluded: true,
        access: {
          is_owner: false,
          is_shared: true,
          can_edit: false,
          can_complete_tasks: true,
          owner: { id: '2', name: 'Owner' },
          expires_at: null,
        },
      }}
      {...callbacks}
    />,
  );
  expect(view.queryByTestId('device-pump-section')).toBeNull();
  expect(view.queryByRole('switch')).toBeNull();
  expect(view.queryByText('Schedule watering')).toBeNull();
});

it('retains the two-section layout with light-theme surfaces', () => {
  const view = render(
    <ThemeContext.Provider value={{ isLight: true, colors: LIGHT_COLORS }}>
      <ReadingTile data={{ ...data, pumpIncluded: true }} {...callbacks} />
    </ThemeContext.Provider>,
  );
  expect(view.getByTestId('device-readings-surface').props.colors).toEqual([
    LIGHT_COLORS.surfaceAlt,
    LIGHT_COLORS.surface,
  ]);
  expect(view.getByTestId('device-pump-section')).toBeTruthy();
});

it('keeps the missing-readings warning red in light mode', () => {
  jest.setSystemTime(new Date('2026-10-29T11:05:00Z'));
  const view = render(
    <ThemeContext.Provider value={{ isLight: true, colors: LIGHT_COLORS }}>
      <ReadingTile data={data} {...callbacks} />
    </ThemeContext.Provider>,
  );
  expect(view.getByTestId('missing-readings-pulse').props.colors).toEqual([
    'rgba(255, 59, 48, 0.55)',
    'rgba(255, 59, 48, 0.18)',
    'rgba(255, 59, 48, 0.00)',
  ]);
  view.unmount();
});

it('starts pulsing at the deadline without another server refresh and stops after a fresh reading', () => {
  const view = render(<ReadingTile data={data} {...callbacks} />);
  expect(view.queryByTestId('missing-readings-pulse')).toBeNull();
  act(() => jest.advanceTimersByTime(1000));
  expect(view.getByTestId('missing-readings-pulse')).toBeTruthy();
  expect(view.getByText('Readings overdue')).toBeTruthy();
  view.rerender(
    <ReadingTile
      data={{ ...data, lastReadISO: '2026-10-29T11:00:00Z' }}
      {...callbacks}
    />,
  );
  expect(view.queryByTestId('missing-readings-pulse')).toBeNull();
  expect(view.queryByText('Readings overdue')).toBeNull();
  view.unmount();
});

it('does not pulse a disabled device even when its last reading is old', () => {
  const view = render(
    <ReadingTile data={{ ...data, status: 'disabled' }} {...callbacks} />,
  );
  act(() => jest.advanceTimersByTime(3600_000));
  expect(view.queryByTestId('missing-readings-pulse')).toBeNull();
  view.unmount();
});

it('rechecks the clock on foreground and removes its listener on unmount', () => {
  let activate: ((state: AppStateStatus) => void) | undefined;
  const remove = jest.fn();
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, listener) => {
      activate = listener;
      return { remove };
    });
  const view = render(<ReadingTile data={data} {...callbacks} />);
  act(() => {
    jest.setSystemTime(new Date('2026-10-29T11:05:00Z'));
    activate?.('active');
  });
  expect(view.getByTestId('missing-readings-pulse')).toBeTruthy();
  view.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});

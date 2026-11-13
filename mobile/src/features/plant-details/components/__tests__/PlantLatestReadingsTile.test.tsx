import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PlantLatestReadingsTile from '../PlantLatestReadingsTile';

const mockT = (key: string, values: any) => values?.defaultValue ?? key;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock('../../../../app/providers/LanguageProvider', () => ({ useLanguage: () => ({ currentLanguage: 'en' }) }));
jest.mock('../../../../app/providers/SettingsProvider', () => ({ useSettings: () => ({ settings: { temperatureUnit: 'F' } }) }));

it('shows converted 24-hour statistics and retains history and pump actions', () => {
  const metric = jest.fn(), schedule = jest.fn();
  const values = { avg: 20, min: 10, max: 30 };
  const view = render(<PlantLatestReadingsTile embedded
    latestReadings={{ temperature: 25, humidity: 40, light: 20, moisture: 9, tsISO: '2026-11-13T12:00:00Z' }}
    summary24h={{ from: '2026-11-12T12:00:00Z', to: '2026-11-13T12:00:00Z', metrics: {
      temperature: values, humidity: values, light: values, moisture: values,
    } }} onMetricPress={metric} pumpIncluded onScheduleWatering={schedule} />);
  expect(view.getByText('Latest results')).toBeTruthy();
  expect(view.getByText('Last 24 hours')).toBeTruthy();
  expect(view.getByText('68.0°F')).toBeTruthy();
  expect(view.getByText('50.0°F')).toBeTruthy();
  expect(view.getByText('86.0°F')).toBeTruthy();
  fireEvent.press(view.getByText('77.0°F'));
  expect(metric).toHaveBeenCalledWith('temperature');
  fireEvent.press(view.getByText('Schedule watering'));
  expect(schedule).toHaveBeenCalledTimes(1);
});

it('does not invent statistics when the summary is unavailable or offer a pump when none is linked', () => {
  const view = render(<PlantLatestReadingsTile embedded
    latestReadings={{ temperature: null, humidity: null, light: null, moisture: null, tsISO: null }}
    onMetricPress={jest.fn()} />);
  expect(view.getByText('The 24-hour summary is currently unavailable.')).toBeTruthy();
  expect(view.queryByText('Watering')).toBeNull();
  expect(view.queryByText('0%')).toBeNull();
});

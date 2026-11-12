import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import MeasureExposureModal from '../MeasureExposureModal';

const mockT = (key: string) => key;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock('../../../../../app/providers/LanguageProvider', () => ({ useLanguage: () => ({ currentLanguage: 'en' }) }));
jest.mock('../../../../../shared/ui/AppModalFrame', () => ({
  __esModule: true,
  default: (props: any) => props.visible ? require('react').createElement(require('react-native').View, {}, props.children) : null,
  appModalStyles: {},
}));
jest.mock('../../../services/Sensors', () => ({ Sensors: {
  startLight: jest.fn(async (sample: any) => { sample(500); return { remove: jest.fn() }; }),
  startHeading: jest.fn(async (sample: any) => { sample(90); return { remove: jest.fn() }; }),
} }));

beforeEach(() => jest.useFakeTimers());
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

it('reserves the progress area before starting and counts down five seconds without changing button labels', async () => {
  const apply = jest.fn();
  const view = render(<MeasureExposureModal visible onClose={jest.fn()} onApply={apply} />);
  await act(async () => { await Promise.resolve(); });
  expect(view.getByTestId('exposure-measurement-progress')).toBeTruthy();
  expect(view.getByRole('progressbar').props.accessibilityValue.now).toBe(0);
  fireEvent.press(view.getByText('Measure'));
  expect(view.getByText('5s')).toBeTruthy();
  expect(view.queryByText('Measuring…')).toBeNull();
  await act(async () => { jest.advanceTimersByTime(2000); });
  expect(view.getByText('3s')).toBeTruthy();
  expect(view.getByRole('progressbar').props.accessibilityValue.now).toBe(2);
  fireEvent.press(view.getByText('Apply'));
  expect(apply).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(3000); });
  expect(view.getByText('done')).toBeTruthy();
  expect(view.getByRole('progressbar').props.accessibilityValue.now).toBe(5);
  fireEvent.press(view.getByText('Apply'));
  expect(apply).toHaveBeenCalledWith({ light: 'low', orientation: 'E' });
});

it('cancels the countdown on close and starts a reopened modal at five seconds', async () => {
  const props = { onClose: jest.fn(), onApply: jest.fn() };
  const view = render(<MeasureExposureModal visible {...props} />);
  await act(async () => { await Promise.resolve(); });
  fireEvent.press(view.getByText('Measure'));
  act(() => { jest.advanceTimersByTime(1000); });
  view.rerender(<MeasureExposureModal visible={false} {...props} />);
  act(() => { jest.advanceTimersByTime(5000); });
  view.rerender(<MeasureExposureModal visible {...props} />);
  await act(async () => { await Promise.resolve(); });
  expect(view.getByText('5s')).toBeTruthy();
  expect(view.getByRole('progressbar').props.accessibilityValue.now).toBe(0);
});

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import RemindersScreen from '../RemindersScreen';
import CenteredSpinner from '../../../../shared/ui/CenteredSpinner';
import { listReminders, listReminderTasks } from '../../../../api/services/reminders.service';
import { fetchPlantInstances } from '../../../../api/services/plant-instances.service';

let mockFocused = false;
const mockT = (key: string) => key;
const mockNavigation = { navigate: jest.fn(), setParams: jest.fn() };
const mockRoute = { params: undefined };
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
  useFocusEffect: (callback: any) => require('react').useEffect(
    () => mockFocused ? callback() : undefined, [callback, mockFocused]),
}));
jest.mock('../../../../app/providers/LanguageProvider', () => ({ useLanguage: () => ({ currentLanguage: 'en' }) }));
jest.mock('../../../../app/providers/SettingsProvider', () => ({ useSettings: () => ({ settings: { fabPosition: 'right' } }) }));
jest.mock('../../../../api/services/reminders.service', () => ({ listReminders: jest.fn(), listReminderTasks: jest.fn() }));
jest.mock('../../../../api/services/plant-instances.service', () => ({ fetchPlantInstances: jest.fn() }));
jest.mock('../../../../shared/ui/GlassHeader', () => () => null);
jest.mock('../../../../shared/ui/FAB', () => () => null);
jest.mock('../../../../shared/ui/TopSnackbar', () => () => null);
jest.mock('../../components/modals/ConfirmDeleteReminderModal', () => () => null);
jest.mock('../../components/modals/ConfirmToggleReminderModal', () => () => null);
jest.mock('../../components/modals/EditReminderModal', () => () => null);
jest.mock('../../components/modals/SortRemindersModal', () => () => null);
jest.mock('../../components/modals/FilterRemindersModal', () => () => null);

beforeEach(() => {
  jest.clearAllMocks(); mockFocused = false;
  (listReminderTasks as jest.Mock).mockResolvedValue([]);
  (fetchPlantInstances as jest.Mock).mockResolvedValue([]);
});

it('starts with a spinner before the focus request and waits for a confirmed empty response', async () => {
  let resolve!: (value: unknown[]) => void;
  (listReminders as jest.Mock).mockReturnValue(new Promise(done => { resolve = done; }));
  const view = render(<RemindersScreen />);
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  expect(listReminders).not.toHaveBeenCalled();
  mockFocused = true; view.rerender(<RemindersScreen />);
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  await act(async () => { resolve([]); });
  expect(view.UNSAFE_queryByType(CenteredSpinner)).toBeNull();
  expect(view.getByText('No reminders yet')).toBeTruthy();
  expect(view.queryByRole('alert')).toBeNull();
});

it('shows a retryable failure rather than a no-reminders tile after a failed request', async () => {
  mockFocused = true;
  (listReminders as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  const view = render(<RemindersScreen />);
  await view.findByRole('alert');
  expect(view.queryByText('No reminders yet')).toBeNull();
  (listReminders as jest.Mock).mockResolvedValue([]);
  await act(async () => { fireEvent.press(view.getByText('inbox.retry')); });
  expect(view.queryByRole('alert')).toBeNull();
  expect(view.getByText('No reminders yet')).toBeTruthy();
});

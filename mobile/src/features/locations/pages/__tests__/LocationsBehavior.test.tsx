import React from 'react';
import { Alert, RefreshControl } from 'react-native';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import Screen from '../LocationsScreen';
import * as api from '../../../../api/services/locations.service';
import { ApiError } from '../../../../api/client';

const mockT = (key: string) => key;
let mockFocused = true;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (effect: any) => require('react').useEffect(() => mockFocused ? effect() : undefined, [effect, mockFocused]),
}));
jest.mock('../../../../api/services/locations.service', () => ({
  fetchUserLocations: jest.fn(), createLocation: jest.fn(), updateLocation: jest.fn(), deleteLocation: jest.fn(),
}));
// Keep the screen, tiles, forms, validation and request guard real. Replace only
// navigation/presentation shells so tests need no native portal/layout engine.
jest.mock('../../../../shared/ui/GlassHeader', () => () => null);
jest.mock('../../../../shared/ui/HeaderPresentation', () => ({ useHeaderContentReady: () => true,
  ScreenLoadingSpinner: () => require('react').createElement(require('react-native').Text, { testID: 'loading' }, 'Loading'),
}));
jest.mock('../../../../shared/ui/AppModalFrame', () => ({ __esModule: true, appModalStyles: {},
  default: ({ visible, children }: any) => visible ? children : null,
}));
jest.mock('../../../../shared/ui/FloatingTileMenu', () => ({ children }: any) => children);
jest.mock('../../../../shared/ui/FAB', () => ({ actions }: any) => require('react').createElement(require('react-native').View, null,
  actions.map((action: any) => require('react').createElement(require('react-native').Text,
    { key: action.key, onPress: action.onPress }, action.label))));
jest.mock('../../../../shared/ui/TopSnackbar', () => ({ visible, message }: any) => visible
  ? require('react').createElement(require('react-native').Text, { testID: 'toast' }, message) : null);

const list = jest.mocked(api.fetchUserLocations);
const room = { id: '1', name: 'Kitchen', category: 'indoor' as const, plant_count: 0 };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => { jest.useFakeTimers(); jest.resetAllMocks(); mockFocused = true; list.mockResolvedValue([room]); });
afterEach(() => { cleanup(); act(() => jest.runOnlyPendingTimers()); jest.useRealTimers(); });
async function loaded() { const view = render(<Screen />); await act(async () => {}); return view; }
function refresh(view: ReturnType<typeof render>) { fireEvent(view.UNSAFE_getByType(RefreshControl), 'refresh'); }

it('shows loading until a successful empty response confirms the empty state', async () => {
  const pending = deferred<any[]>(); list.mockReturnValueOnce(pending.promise);
  const view = render(<Screen />);
  expect(view.getByTestId('loading')).toBeTruthy();
  expect(view.queryByText('No locations yet')).toBeNull();
  await act(async () => pending.resolve([]));
  expect(view.queryByTestId('loading')).toBeNull();
  expect(view.getByText('No locations yet')).toBeTruthy();
});

it.each([401, 403, 500])('shows a retryable error, not an empty collection, for HTTP %s', async status => {
  list.mockRejectedValueOnce(new ApiError(status, { detail: 'Unavailable' })).mockResolvedValueOnce([room]);
  const view = await loaded();
  expect(view.getByRole('alert')).toBeTruthy();
  expect(view.queryByText('No locations yet')).toBeNull();
  await act(async () => fireEvent.press(view.getByText('inbox.retry')));
  expect(view.getByText('Kitchen')).toBeTruthy();
  expect(view.queryByRole('alert')).toBeNull();
});

it('creates, edits and deletes through actual forms and tile menus', async () => {
  jest.mocked(api.createLocation).mockResolvedValueOnce({ ...room, id: '2', name: 'Patio', category: 'outdoor' });
  jest.mocked(api.updateLocation).mockResolvedValueOnce({ ...room, id: '2', name: 'Garden', category: 'outdoor' });
  jest.mocked(api.deleteLocation).mockResolvedValueOnce(undefined);
  const view = await loaded();
  fireEvent.press(view.getByText('Add location'));
  fireEvent.changeText(view.getByPlaceholderText('e.g. Living room, Kitchen shelf'), ' Patio ');
  fireEvent.press(view.getAllByText('Outdoor')[0]); // Segment, before suggestion heading.
  await act(async () => fireEvent.press(view.getByText('Create')));
  expect(api.createLocation).toHaveBeenCalledWith({ name: 'Patio', category: 'outdoor' }, { auth: true });
  expect(view.getByText('Patio')).toBeTruthy();
  expect(view.getByTestId('toast').props.children).toBe('Location added');
  fireEvent.press(view.getByText('Patio'));
  fireEvent.press(view.getByText('Edit location'));
  expect(view.getByDisplayValue('Patio')).toBeTruthy();
  fireEvent.changeText(view.getByDisplayValue('Patio'), 'Garden');
  await act(async () => fireEvent.press(view.getByText('Save')));
  expect(api.updateLocation).toHaveBeenCalledWith('2', { name: 'Garden', category: 'outdoor' }, { auth: true });
  expect(view.queryByText('Patio')).toBeNull();
  fireEvent.press(view.getByText('Garden'));
  fireEvent.press(view.getByText('Delete location'));
  await act(async () => fireEvent.press(view.getByText('Delete')));
  expect(api.deleteLocation).toHaveBeenCalledWith('2', { auth: true });
  expect(view.queryByText('Garden')).toBeNull();
  expect(view.getByText('Kitchen')).toBeTruthy();
});

it('canceling creation or deletion leaves the collection unchanged and makes no mutation request', async () => {
  const view = await loaded();
  fireEvent.press(view.getByText('Add location'));
  fireEvent.changeText(view.getByPlaceholderText('e.g. Living room, Kitchen shelf'), 'Unsaved');
  fireEvent.press(view.getByText('Cancel'));
  expect(view.queryByText('Unsaved')).toBeNull();
  fireEvent.press(view.getByText('Kitchen')); fireEvent.press(view.getByText('Delete location'));
  fireEvent.press(view.getByText('Cancel'));
  expect(view.getByText('Kitchen')).toBeTruthy();
  expect(api.createLocation).not.toHaveBeenCalled(); expect(api.deleteLocation).not.toHaveBeenCalled();
});

it('reports a denied create without adding a phantom location', async () => {
  jest.mocked(api.createLocation).mockRejectedValueOnce(new ApiError(403, {}, 'Permission denied'));
  const view = await loaded(); fireEvent.press(view.getByText('Add location'));
  fireEvent.changeText(view.getByPlaceholderText('e.g. Living room, Kitchen shelf'), 'Denied room');
  await act(async () => fireEvent.press(view.getByText('Create')));
  expect(view.queryByText('Denied room')).toBeNull(); expect(view.getByText('Kitchen')).toBeTruthy();
  expect(view.getByTestId('toast').props.children).toBe('Permission denied');
});

it('preserves a location after a permission failure on update or deletion', async () => {
  jest.mocked(api.updateLocation).mockRejectedValueOnce(new ApiError(403, {}, 'Permission denied'));
  jest.mocked(api.deleteLocation).mockRejectedValueOnce(new ApiError(404, {}, 'Not found'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  try {
    const view = await loaded();
    fireEvent.press(view.getByText('Kitchen')); fireEvent.press(view.getByText('Edit location'));
    fireEvent.changeText(view.getByDisplayValue('Kitchen'), 'Forbidden edit');
    await act(async () => fireEvent.press(view.getByText('Save')));
    expect(view.getByText('Kitchen')).toBeTruthy();
    expect(view.getByTestId('toast').props.children).toBe('Permission denied');
    fireEvent.press(view.getByText('Kitchen')); fireEvent.press(view.getByText('Delete location'));
    await act(async () => fireEvent.press(view.getByText('Delete')));
    expect(view.getByText('Kitchen')).toBeTruthy();
    expect(alert).toHaveBeenCalledWith('Delete failed', 'Not found');
  } finally { alert.mockRestore(); }
});

it('blocks deleting locations with assigned plants before making an API call', async () => {
  list.mockResolvedValueOnce([{ ...room, plant_count: 2 }]);
  const view = await loaded();
  fireEvent.press(view.getByText('Kitchen')); fireEvent.press(view.getByText('Delete location'));
  expect(view.getByText('Can’t delete this location')).toBeTruthy();
  fireEvent.press(view.getByText('Delete'));
  expect(api.deleteLocation).not.toHaveBeenCalled(); expect(view.getAllByText('Kitchen')).toHaveLength(2);
});

it.each(['resolve', 'reject'] as const)('ignores a stale refresh that later %ss', async outcome => {
  const view = await loaded();
  const old = deferred<any[]>(); const latest = deferred<any[]>();
  list.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
  act(() => refresh(view)); act(() => refresh(view));
  await act(async () => latest.resolve([{ ...room, name: 'Latest room' }]));
  await act(async () => outcome === 'resolve' ? old.resolve([{ ...room, name: 'Stale room' }]) : old.reject(new Error('Stale failure')));
  expect(view.getByText('Latest room')).toBeTruthy(); expect(view.queryByText('Stale room')).toBeNull();
  expect(view.queryByRole('alert')).toBeNull();
});

it('ignores the previous visit response after leaving and returning to the screen', async () => {
  const old = deferred<any[]>(); list.mockReturnValueOnce(old.promise).mockResolvedValueOnce([{ ...room, name: 'Return visit' }]);
  const view = render(<Screen />);
  mockFocused = false; view.rerender(<Screen />);
  mockFocused = true; view.rerender(<Screen />); await act(async () => {});
  await act(async () => old.resolve([{ ...room, name: 'Previous visit' }]));
  expect(view.getByText('Return visit')).toBeTruthy(); expect(view.queryByText('Previous visit')).toBeNull();
});

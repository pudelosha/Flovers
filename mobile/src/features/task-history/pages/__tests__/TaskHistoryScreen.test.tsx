import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Animated, Pressable, Text } from 'react-native';
import TaskHistoryScreen from '../TaskHistoryScreen';
import TaskHistoryTile from '../../components/TaskHistoryTile';
import JournalPhotoTile from '../../components/JournalPhotoTile';
import JournalPhotoModal from '../../components/modals/JournalPhotoModal';
import FilterHistoryTasksModal from '../../components/modals/FilterHistoryTasksModal';
import SendHistoryExportModal from '../../components/modals/SendHistoryExportModal';
import DeleteHistoryTasksModal from '../../components/modals/DeleteHistoryTasksModal';
import ConfirmDeleteJournalPhotoModal from '../../components/modals/ConfirmDeleteJournalPhotoModal';
import ViewJournalPhotoModal from '../../components/modals/ViewJournalPhotoModal';
import FAB from '../../../../shared/ui/FAB';
import CenteredSpinner from '../../../../shared/ui/CenteredSpinner';
import {
  fetchJournalPage,
  sendHistoryExportEmail,
} from '../../../../api/services/history.service';
import { fetchJournalOptions } from '../../../../api/services/history.service';
import { deleteJournalPhoto } from '../../../../api/services/journal-photos.service';

const mockT = (key: string, options: any = {}) => options.defaultValue || key;
const mockNavigate = jest.fn();
let mockRoute: any = {};
let mockPhotoLoading = false;
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT, i18n: { language: 'en' } }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => mockRoute,
  useIsFocused: () => true,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-linear-gradient', () => ({
  __esModule: true,
  default: (props: any) =>
    require('react').createElement(
      require('react-native').View,
      props,
      props.children,
    ),
}));
jest.mock('../../../../api/services/history.service', () => ({
  fetchJournalPage: jest.fn(),
  fetchJournalOptions: jest.fn(),
  deleteHistoryEntry: jest.fn(),
  bulkDeleteHistoryEntries: jest.fn(),
  sendHistoryExportEmail: jest.fn(),
}));
jest.mock('../../../../api/services/journal-photos.service', () => ({
  deleteJournalPhoto: jest.fn(),
}));
jest.mock('../../../../shared/hooks/usePlantPhotoPreload', () => ({
  usePlantPhotoPreload: () => ({
    loading: mockPhotoLoading,
    ready: !mockPhotoLoading,
  }),
}));
jest.mock('../../../../shared/ui/TopSnackbar', () => jest.fn(() => null));
jest.mock('../../components/TaskHistoryTile', () => jest.fn(() => null));
jest.mock('../../components/JournalPhotoTile', () => jest.fn(() => null));
jest.mock('../../components/modals/JournalPhotoModal', () =>
  jest.fn(() => null),
);
jest.mock('../../components/modals/ViewJournalPhotoModal', () =>
  jest.fn(() => null),
);
jest.mock('../../components/modals/SortHistoryTasksModal', () =>
  jest.fn(() => null),
);
jest.mock('../../components/modals/FilterHistoryTasksModal', () =>
  jest.fn(() => null),
);
jest.mock('../../components/modals/DeleteHistoryTasksModal', () =>
  jest.fn(() => null),
);
jest.mock('../../components/modals/SendHistoryExportModal', () =>
  jest.fn(() => null),
);

const owner = {
  is_owner: true,
  is_shared: false,
  can_edit: true,
  can_complete_tasks: true,
  owner: { id: '1', name: 'Owner' },
  expires_at: null,
};
const viewer = { ...owner, is_owner: false, is_shared: true, can_edit: false };
const task = {
  id: '5',
  plantId: '9',
  plant: 'Bird',
  location: 'Kitchen',
  type: 'watering',
  completedAt: '2026-10-30T10:00:00Z',
  access: owner,
};
const photo = {
  id: '5',
  entryKind: 'photo',
  plantId: '9',
  plant: 'Bird',
  location: 'Kitchen',
  type: 'photo',
  completedAt: '2026-10-31T10:00:00Z',
  createdAt: '2026-10-31T10:00:00Z',
  recordedDate: '',
  revision: 1,
  photo: { id: 'private-photo' },
  access: owner,
};

async function renderScreen() {
  const view = render(<TaskHistoryScreen />);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return view;
}
function actions(view: ReturnType<typeof render>) {
  return view.UNSAFE_getByType(FAB).props.actions;
}

beforeEach(() => {
  jest.clearAllMocks();
  (JournalPhotoModal as jest.Mock).mockImplementation(() => null);
  mockRoute = {};
  mockPhotoLoading = false;
  (fetchJournalPage as jest.Mock).mockImplementation(async (query: any) => ({
    items:
      query?.types?.length === 1 && query.types[0] === 'photo'
        ? [photo]
        : [task, photo],
    nextCursor: null,
    canManageTasks:
      !query?.types?.length || query.types.some((t: string) => t !== 'photo'),
  }));
  (fetchJournalOptions as jest.Mock).mockResolvedValue({
    plants: [{ id: '9', name: 'Bird' }],
    locations: ['Kitchen'],
    ownedPlants: [{ id: '9', name: 'Bird', location: 'Kitchen' }],
    deletePlants: [{ id: '9', name: 'Bird' }],
    deleteLocations: ['Kitchen'],
  });
  (deleteJournalPhoto as jest.Mock).mockResolvedValue(undefined);
});

it('renders both entry kinds even when their numeric identifiers match and filters photos without task actions', async () => {
  const view = await renderScreen();
  expect(view.UNSAFE_getAllByType(TaskHistoryTile)).toHaveLength(1);
  expect(view.UNSAFE_getAllByType(JournalPhotoTile)).toHaveLength(1);
  expect(actions(view)[0].key).toBe('addPhoto');
  await act(async () =>
    view
      .UNSAFE_getByType(FilterHistoryTasksModal)
      .props.onApply({ types: ['photo'] }),
  );
  expect(view.UNSAFE_queryByType(TaskHistoryTile)).toBeNull();
  expect(view.UNSAFE_getByType(JournalPhotoTile)).toBeTruthy();
  expect(actions(view).map((action: any) => action.key)).not.toEqual(
    expect.arrayContaining(['sendExport', 'delete']),
  );
});

it('strips Photo from task exports when both kinds are selected', async () => {
  const view = await renderScreen();
  await act(async () =>
    view
      .UNSAFE_getByType(FilterHistoryTasksModal)
      .props.onApply({ types: ['photo', 'watering'] }),
  );
  act(() =>
    actions(view)
      .find((action: any) => action.key === 'sendExport')
      .onPress(),
  );
  const modal = view.UNSAFE_getByType(SendHistoryExportModal);
  expect(modal.props.effectiveFilters.types).toEqual(['watering']);
  await act(async () => {
    await modal.props.onSend(false);
  });
  expect(sendHistoryExportEmail).toHaveBeenCalledWith(
    expect.objectContaining({ types: ['watering'], includePending: false }),
  );
});

it('does not offer photo-only plants or locations in bulk task deletion', async () => {
  (fetchJournalPage as jest.Mock).mockResolvedValue({
    items: [
      task,
      { ...photo, plantId: '10', plant: 'Fern', location: 'Bedroom' },
    ],
    nextCursor: null,
    canManageTasks: true,
  });
  const view = await renderScreen();
  const modal = view.UNSAFE_getByType(DeleteHistoryTasksModal);
  expect(modal.props.plantOptions).toEqual([{ id: '9', name: 'Bird' }]);
  expect(modal.props.locationOptions).toEqual(['Kitchen']);
});

it('lets an owned plant with no previous tasks or photos receive its first journal photo', async () => {
  mockRoute = { params: { plantId: '9' } };
  (fetchJournalPage as jest.Mock).mockResolvedValue({
    items: [],
    nextCursor: null,
    canManageTasks: false,
  });
  const view = await renderScreen();
  act(() => actions(view)[0].onPress());
  const modal = view.UNSAFE_getByType(JournalPhotoModal);
  expect(modal.props.visible).toBe(true);
  expect(modal.props.entry).toBeNull();
  expect(modal.props.preferredPlantId).toBe('9');
  expect(modal.props.plantOptions).toEqual([
    expect.objectContaining({ id: '9', name: 'Bird' }),
  ]);
  expect(view.UNSAFE_queryByType(FAB)).toBeNull();
});

it('keeps the journal hidden until its private photo bytes are ready', async () => {
  mockPhotoLoading = true;
  const view = await renderScreen();
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  expect(view.UNSAFE_queryByType(JournalPhotoTile)).toBeNull();
  expect(view.UNSAFE_queryByType(FAB)).toBeNull();
  mockPhotoLoading = false;
  view.rerender(<TaskHistoryScreen />);
  expect(view.UNSAFE_getByType(JournalPhotoTile)).toBeTruthy();
});

it('preserves the camera selection when foreground photo revalidation shows the list spinner', async () => {
  (JournalPhotoModal as jest.Mock).mockImplementation(function Editor({
    visible,
  }: any) {
    const [preview, setPreview] = React.useState('existing photo');
    return visible ? (
      <Pressable onPress={() => setPreview('new camera photo')}>
        <Text>{preview}</Text>
      </Pressable>
    ) : null;
  });
  const view = await renderScreen();
  act(() => view.UNSAFE_getByType(JournalPhotoTile).props.onEdit());
  fireEvent.press(view.getByText('existing photo'));
  mockPhotoLoading = true;
  view.rerender(<TaskHistoryScreen />);
  expect(view.getByText('new camera photo')).toBeTruthy();
  expect(view.UNSAFE_queryByType(JournalPhotoTile)).toBeNull();
  mockPhotoLoading = false;
  view.rerender(<TaskHistoryScreen />);
  expect(view.getByText('new camera photo')).toBeTruthy();
});

it('keeps shared photos viewable while denying add, edit and delete', async () => {
  (fetchJournalPage as jest.Mock).mockResolvedValue({
    items: [{ ...photo, access: viewer }],
    nextCursor: null,
    canManageTasks: false,
  });
  (fetchJournalOptions as jest.Mock).mockResolvedValue({
    plants: [{ id: '9', name: 'Bird' }],
    locations: ['Kitchen'],
    ownedPlants: [],
    deletePlants: [],
    deleteLocations: [],
  });
  const view = await renderScreen();
  expect(actions(view).some((action: any) => action.key === 'addPhoto')).toBe(
    false,
  );
  const tile = view.UNSAFE_getByType(JournalPhotoTile);
  act(() => {
    tile.props.onEdit();
    tile.props.onDelete();
  });
  expect(view.UNSAFE_getByType(JournalPhotoModal).props.visible).toBe(false);
  expect(
    view.UNSAFE_getByType(ConfirmDeleteJournalPhotoModal).props.visible,
  ).toBe(false);
  act(() => tile.props.onPlantDetails());
  expect(mockNavigate).toHaveBeenCalledWith('PlantDetails', { id: '9' });
});

it.each([owner, viewer])(
  'opens the full photo viewer for owners and shared viewers',
  async access => {
    (fetchJournalPage as jest.Mock).mockResolvedValue({
      items: [{ ...photo, access }],
      nextCursor: null,
      canManageTasks: access.can_edit,
    });
    const view = await renderScreen();
    act(() => view.UNSAFE_getByType(JournalPhotoTile).props.onViewPhoto());
    const modal = view.UNSAFE_getByType(ViewJournalPhotoModal);
    expect(modal.props.visible).toBe(true);
    expect(modal.props.entry.id).toBe(photo.id);
    expect(view.UNSAFE_queryByType(FAB)).toBeNull();
    act(() => modal.props.onClose());
    expect(view.UNSAFE_getByType(ViewJournalPhotoModal).props.visible).toBe(
      false,
    );
    expect(view.UNSAFE_getByType(FAB)).toBeTruthy();
  },
);

it.each(['route', 'filter'])(
  'hides Add photo for an incoming shared plant selected by %s even when another plant is owned',
  async mode => {
    if (mode === 'route') mockRoute = { params: { plantId: '9' } };
    (fetchJournalPage as jest.Mock).mockResolvedValue({
      items: [{ ...photo, access: viewer }],
      nextCursor: null,
      canManageTasks: false,
    });
    (fetchJournalOptions as jest.Mock).mockResolvedValue({
      plants: [
        { id: '9', name: 'Bird' },
        { id: '10', name: 'Fern' },
      ],
      locations: ['Kitchen'],
      ownedPlants: [{ id: '10', name: 'Fern', location: 'Kitchen' }],
      deletePlants: [],
      deleteLocations: [],
    });
    const view = await renderScreen();
    if (mode === 'filter') {
      expect(
        actions(view).some((action: any) => action.key === 'addPhoto'),
      ).toBe(true);
      await act(async () =>
        view
          .UNSAFE_getByType(FilterHistoryTasksModal)
          .props.onApply({ plantId: '9' }),
      );
    }
    expect(actions(view).some((action: any) => action.key === 'addPhoto')).toBe(
      false,
    );
  },
);

it('asks before deleting a photo and sends its revision-bearing item to the dedicated API', async () => {
  const view = await renderScreen();
  act(() => view.UNSAFE_getByType(JournalPhotoTile).props.onDelete());
  expect(deleteJournalPhoto).not.toHaveBeenCalled();
  const confirm = view.UNSAFE_getByType(ConfirmDeleteJournalPhotoModal);
  expect(confirm.props.visible).toBe(true);
  await act(async () => {
    await confirm.props.onConfirm();
  });
  expect(deleteJournalPhoto).toHaveBeenCalledWith(photo);
  expect(
    view.UNSAFE_getByType(ConfirmDeleteJournalPhotoModal).props.visible,
  ).toBe(false);
});

function journalList(view: ReturnType<typeof render>) {
  return view.UNSAFE_getByType(Animated.FlatList);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

it('appends pages once, preserving both kinds of matching identifiers and metadata', async () => {
  (fetchJournalPage as jest.Mock).mockResolvedValueOnce({
    items: [task],
    nextCursor: 'next',
    canManageTasks: true,
  });
  const next = deferred<any>();
  (fetchJournalPage as jest.Mock).mockImplementationOnce(() => next.promise);
  const view = await renderScreen();
  act(() => {
    journalList(view).props.onEndReached();
    journalList(view).props.onEndReached();
  });
  expect(fetchJournalPage).toHaveBeenCalledTimes(2);
  expect(fetchJournalPage).toHaveBeenLastCalledWith(expect.any(Object), 'next');
  expect(view.UNSAFE_getByType(TaskHistoryTile)).toBeTruthy();
  await act(async () =>
    next.resolve({
      items: [task, photo],
      nextCursor: null,
      canManageTasks: true,
    }),
  );
  expect(view.UNSAFE_getAllByType(TaskHistoryTile)).toHaveLength(1);
  expect(view.UNSAFE_getAllByType(JournalPhotoTile)).toHaveLength(1);
  expect(fetchJournalOptions).toHaveBeenCalledTimes(1);
  act(() => journalList(view).props.onEndReached());
  expect(fetchJournalPage).toHaveBeenCalledTimes(2);
});

it('keeps existing tiles on a failed older page and retries the same cursor', async () => {
  (fetchJournalPage as jest.Mock)
    .mockResolvedValueOnce({
      items: [task],
      nextCursor: 'retry-me',
      canManageTasks: true,
    })
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce({
      items: [photo],
      nextCursor: null,
      canManageTasks: true,
    });
  const view = await renderScreen();
  await act(async () => journalList(view).props.onEndReached());
  expect(view.UNSAFE_getByType(TaskHistoryTile)).toBeTruthy();
  fireEvent.press(view.getByText('Try again'));
  await act(async () => {
    await Promise.resolve();
  });
  expect(fetchJournalPage).toHaveBeenLastCalledWith(
    expect.any(Object),
    'retry-me',
  );
  expect(view.UNSAFE_getByType(JournalPhotoTile)).toBeTruthy();
});

it('discards a stale page after criteria change and filters on the server without refetching plant options', async () => {
  const next = deferred<any>();
  (fetchJournalPage as jest.Mock)
    .mockResolvedValueOnce({
      items: [task],
      nextCursor: 'old',
      canManageTasks: true,
    })
    .mockImplementationOnce(() => next.promise)
    .mockResolvedValueOnce({
      items: [photo],
      nextCursor: null,
      canManageTasks: false,
    });
  const view = await renderScreen();
  act(() => journalList(view).props.onEndReached());
  await act(async () =>
    view
      .UNSAFE_getByType(FilterHistoryTasksModal)
      .props.onApply({ types: ['photo'], plantId: '9', location: 'Kitchen' }),
  );
  expect(fetchJournalPage).toHaveBeenLastCalledWith(
    expect.objectContaining({
      types: ['photo'],
      plantId: '9',
      location: 'Kitchen',
    }),
  );
  await act(async () =>
    next.resolve({ items: [task], nextCursor: 'stale', canManageTasks: true }),
  );
  expect(view.UNSAFE_queryByType(TaskHistoryTile)).toBeNull();
  expect(view.UNSAFE_getByType(JournalPhotoTile)).toBeTruthy();
  expect(fetchJournalOptions).toHaveBeenCalledTimes(1);
});

it('uses whole-journal filter and delete choices even when their plants are not on the first page', async () => {
  (fetchJournalPage as jest.Mock).mockResolvedValue({
    items: [photo],
    nextCursor: 'more',
    canManageTasks: true,
  });
  (fetchJournalOptions as jest.Mock).mockResolvedValue({
    plants: [{ id: '20', name: 'Older plant' }],
    locations: ['Bedroom'],
    ownedPlants: [],
    deletePlants: [{ id: '20', name: 'Older plant' }],
    deleteLocations: ['Bedroom'],
  });
  const view = await renderScreen();
  expect(view.UNSAFE_getByType(FilterHistoryTasksModal).props.plants).toEqual([
    { id: '20', name: 'Older plant' },
  ]);
  expect(
    view.UNSAFE_getByType(DeleteHistoryTasksModal).props.plantOptions,
  ).toEqual([{ id: '20', name: 'Older plant' }]);
  expect(actions(view).some((action: any) => action.key === 'delete')).toBe(
    true,
  );
});

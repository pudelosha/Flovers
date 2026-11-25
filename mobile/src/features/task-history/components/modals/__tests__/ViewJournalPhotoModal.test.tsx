import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  Image,
  PanResponder,
  StyleSheet,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import ViewJournalPhotoModal from '../ViewJournalPhotoModal';
import CenteredSpinner from '../../../../../shared/ui/CenteredSpinner';
import {
  fetchJournalPhotoPreview,
  fetchJournalPhotos,
} from '../../../../../api/services/journal-photos.service';
import { usePlantPhoto } from '../../../../../shared/hooks/usePlantPhoto';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 12 }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, values: any) => values?.defaultValue ?? _key,
  }),
}));
jest.mock('../../../../../api/services/journal-photos.service', () => ({
  fetchJournalPhotoPreview: jest.fn(),
  fetchJournalPhotos: jest.fn(),
}));
jest.mock('../../../../../shared/hooks/usePlantPhoto', () => ({
  usePlantPhoto: jest.fn(),
}));
const owner = {
  is_owner: true,
  is_shared: false,
  can_edit: true,
  can_complete_tasks: true,
  owner: { id: '1', name: 'Owner' },
  expires_at: null,
};
const tileEntry: any = {
  id: 'entry',
  plantId: '9',
  createdAt: new Date(2026, 9, 31, 9, 57).toISOString(),
  plant: 'Bird',
  photo: {
    id: 'old-image',
    width: 600,
    height: 800,
    framing: { focal_x: 0.1, focal_y: 0.9, zoom: 4 },
  },
  access: owner,
};
const freshEntry = {
  ...tileEntry,
  photo: { ...tileEntry.photo, id: 'fresh-image' },
};
let mockImageLoading = false;
const fetchPhoto = fetchJournalPhotoPreview as jest.Mock;
const preview = (entry: any) => ({ entry, previousId: null, nextId: null });
const touchEvent = {} as GestureResponderEvent;
const drag = (dx: number, dy = 0, numberActiveTouches = 1) =>
  ({ dx, dy, numberActiveTouches } as PanResponderGestureState);
afterEach(() => jest.restoreAllMocks());
beforeEach(() => {
  jest.clearAllMocks();
  mockImageLoading = false;
  (fetchJournalPhotos as jest.Mock).mockResolvedValue([freshEntry]);
  fetchPhoto.mockResolvedValue(preview(freshEntry));
  (usePlantPhoto as jest.Mock).mockImplementation((photo: any) => ({
    uri:
      photo && !mockImageLoading ? `data:image/jpeg;base64,${photo.id}` : null,
    loading: !!photo && mockImageLoading,
    error: null,
    refresh: jest.fn(),
  }));
});
async function open(entry: any = tileEntry) {
  const onClose = jest.fn();
  const view = render(
    <ViewJournalPhotoModal visible entry={entry} onClose={onClose} />,
  );
  await act(async () => {});
  return { view, onClose };
}
it('fetches the latest private image and displays its full uncropped image', async () => {
  const { view } = await open();
  expect(fetchPhoto).toHaveBeenCalledWith(tileEntry.id);
  const image = view.getByTestId('journal-full-photo', {
    includeHiddenElements: true,
  });
  expect(image.props.source.uri).toContain('fresh-image');
  expect(image.props.resizeMode).toBe('contain');
  expect(view.UNSAFE_getAllByType(Image)).toHaveLength(1);
  expect(view.UNSAFE_getAllByType(CenteredSpinner)).toHaveLength(1);
  fireEvent(image, 'load');
  expect(
    StyleSheet.flatten(
      view.getByTestId('journal-full-photo', { includeHiddenElements: true })
        .props.style,
    ).opacity,
  ).toBe(1);
  expect(view.UNSAFE_queryByType(CenteredSpinner)).toBeNull();
});
it('waits for metadata and private bytes instead of showing an old crop', async () => {
  let finish: any;
  fetchPhoto.mockReturnValueOnce(
    new Promise(resolve => {
      finish = resolve;
    }),
  );
  const view = render(
    <ViewJournalPhotoModal visible entry={tileEntry} onClose={jest.fn()} />,
  );
  expect(view.queryByTestId('journal-full-photo')).toBeNull();
  mockImageLoading = true;
  await act(async () => finish(preview(freshEntry)));
  expect(view.queryByTestId('journal-full-photo')).toBeNull();
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  mockImageLoading = false;
  view.rerender(
    <ViewJournalPhotoModal visible entry={tileEntry} onClose={jest.fn()} />,
  );
  expect(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true })
      .props.source.uri,
  ).toContain('fresh-image');
});
it('lets a shared viewer see the photo without offering edits or deletion', async () => {
  const shared = {
    ...freshEntry,
    access: { ...owner, is_owner: false, is_shared: true, can_edit: false },
  };
  fetchPhoto.mockResolvedValue(preview(shared));
  const { view, onClose } = await open(shared);
  expect(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true }),
  ).toBeTruthy();
  expect(view.queryByText('Edit photo')).toBeNull();
  expect(view.queryByText('Delete photo')).toBeNull();
  fireEvent(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true }),
    'load',
  );
  fireEvent.press(view.getByText('Close'));
  expect(onClose).toHaveBeenCalledTimes(1);
});
it('re-fetches metadata after a failed authorized read', async () => {
  fetchPhoto.mockRejectedValueOnce(new Error('Revoked'));
  const { view } = await open();
  expect(view.queryByTestId('journal-full-photo')).toBeNull();
  expect(
    view.getByText('Could not load the photo details. Please try again.'),
  ).toBeTruthy();
  fireEvent.press(view.getByText('Try again'));
  await waitFor(() =>
    expect(
      view.getByTestId('journal-full-photo', { includeHiddenElements: true }),
    ).toBeTruthy(),
  );
  expect(fetchPhoto).toHaveBeenCalledTimes(2);
});
it('does not retain a previous photo or failure when the modal is reopened', async () => {
  const { view } = await open();
  view.rerender(
    <ViewJournalPhotoModal
      visible={false}
      entry={tileEntry}
      onClose={jest.fn()}
    />,
  );
  let finish: any;
  fetchPhoto.mockReturnValueOnce(
    new Promise(resolve => {
      finish = resolve;
    }),
  );
  view.rerender(
    <ViewJournalPhotoModal visible entry={tileEntry} onClose={jest.fn()} />,
  );
  expect(view.queryByTestId('journal-full-photo')).toBeNull();
  await act(async () =>
    finish(
      preview({
        ...freshEntry,
        photo: { ...freshEntry.photo, id: 'newer-image' },
      }),
    ),
  );
  expect(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true })
      .props.source.uri,
  ).toContain('newer-image');
});
it('hides bytes after sharing access expires', async () => {
  fetchPhoto.mockResolvedValue(
    preview({
      ...freshEntry,
      access: {
        ...owner,
        is_owner: false,
        is_shared: true,
        can_edit: false,
        expires_at: '2000-01-01T00:00:00Z',
      },
    }),
  );
  const { view } = await open();
  expect(view.queryByTestId('journal-full-photo')).toBeNull();
  expect(
    view.getByText('Could not load the photo details. Please try again.'),
  ).toBeTruthy();
});

it('shows upload date and time below the full image using the profile date format', async () => {
  const { view } = await open();
  fireEvent(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true }),
    'load',
  );
  expect(view.getByTestId('journal-photo-added-at')).toHaveTextContent(
    'Added: 31.10.2026 09:57',
  );
  expect(view.queryByText('Next')).toBeNull();
  expect(view.queryByText('Previous')).toBeNull();
});

it('navigates older and newer photos while waiting for each authorized image and disables the end button', async () => {
  const older = {
    ...freshEntry,
    id: 'older',
    createdAt: new Date(2026, 9, 24, 10, 15).toISOString(),
    photo: { ...freshEntry.photo, id: 'older-image' },
  };
  (fetchJournalPhotos as jest.Mock).mockResolvedValue([
    freshEntry,
    { ...freshEntry, id: 'older', createdAt: '2026-10-24T08:15:00Z' },
  ]);
  fetchPhoto
    .mockResolvedValueOnce({
      entry: freshEntry,
      previousId: 'older',
      nextId: null,
    })
    .mockResolvedValueOnce({ entry: older, previousId: null, nextId: 'entry' })
    .mockResolvedValueOnce({
      entry: freshEntry,
      previousId: 'older',
      nextId: null,
    });
  const { view } = await open();
  fireEvent(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true }),
    'load',
  );
  expect(
    view.getByRole('button', { name: 'Next' }).props.accessibilityState
      .disabled,
  ).toBe(true);
  await act(async () => fireEvent.press(view.getByText('Previous')));
  expect(fetchPhoto).toHaveBeenLastCalledWith('older');
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  const image = view.getByTestId('journal-full-photo', {
    includeHiddenElements: true,
  });
  expect(image.props.source.uri).toContain('older-image');
  fireEvent(image, 'load');
  expect(view.getByTestId('journal-photo-added-at')).toHaveTextContent(
    'Added: 24.10.2026 10:15',
  );
  expect(
    view.getByRole('button', { name: 'Previous' }).props.accessibilityState
      .disabled,
  ).toBe(true);
  await act(async () => fireEvent.press(view.getByText('Next')));
  expect(fetchPhoto).toHaveBeenLastCalledWith('entry');
  fireEvent(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true }),
    'load',
  );
  expect(view.getByTestId('journal-photo-added-at')).toHaveTextContent(
    'Added: 31.10.2026 09:57',
  );
});

it.each(['button', 'swipe'])(
  'keeps the modal and controls in place during %s navigation',
  async method => {
    const responder = jest.spyOn(PanResponder, 'create');
    let finish: (result: any) => void = () => {};
    (fetchJournalPhotos as jest.Mock).mockResolvedValue([
      freshEntry,
      { ...freshEntry, id: 'older', createdAt: '2026-10-24T08:15:00Z' },
    ]);
    fetchPhoto
      .mockResolvedValueOnce({
        entry: freshEntry,
        previousId: 'older',
        nextId: null,
      })
      .mockReturnValueOnce(
        new Promise(resolve => {
          finish = resolve;
        }),
      );
    const { view } = await open();
    fireEvent(
      view.getByTestId('journal-full-photo', { includeHiddenElements: true }),
      'load',
    );
    const title = view.getByText('Gallery');
    const pane = view.getByTestId('journal-photo-swipe-area');
    const previous = view.getByRole('button', { name: 'Previous' });
    const next = view.getByRole('button', { name: 'Next' });
    const close = view.getByTestId('app-modal-close');
    const date = view.getByTestId('journal-photo-added-at');
    if (method === 'button') {
      fireEvent.press(previous);
    } else {
      const swipe = responder.mock.calls[0][0];
      swipe.onPanResponderGrant!(touchEvent, drag(0));
      act(() => swipe.onPanResponderRelease!(touchEvent, drag(80, 0, 0)));
    }
    expect(fetchPhoto).toHaveBeenLastCalledWith('older');
    expect(view.getByText('Gallery')).toBe(title);
    expect(title).toBeVisible();
    expect(view.getByTestId('app-modal-close')).toBe(close);
    expect(view.getByRole('button', { name: 'Previous' })).toBe(previous);
    expect(view.getByRole('button', { name: 'Next' })).toBe(next);
    expect(previous).toBeVisible();
    expect(previous).toBeDisabled();
    expect(next).toBeDisabled();
    expect(view.getByTestId('journal-photo-added-at')).toBe(date);
    expect(date).toBeVisible();
    expect(view.queryByTestId('app-modal-loading')).toBeNull();
    expect(view.queryByTestId('journal-full-photo')).toBeNull();
    expect(pane.findByProps({ testID: 'journal-photo-loading' })).toBeTruthy();
    const older = {
      ...freshEntry,
      id: 'older',
      createdAt: new Date(2026, 9, 24, 10, 15).toISOString(),
      photo: { ...freshEntry.photo, id: 'older-image' },
    };
    await act(async () =>
      finish({ entry: older, previousId: null, nextId: 'entry' }),
    );
    expect(view.queryByTestId('app-modal-loading')).toBeNull();
    expect(view.getByTestId('journal-photo-loading')).toBeVisible();
    const image = view.getByTestId('journal-full-photo');
    expect(image.props.source.uri).toContain('older-image');
    expect(StyleSheet.flatten(image.props.style).opacity).toBe(0);
    fireEvent(image, 'load');
    expect(view.queryByTestId('journal-photo-loading')).toBeNull();
    expect(view.getByText('Gallery')).toBe(title);
    expect(view.getByRole('button', { name: 'Next' })).toBe(next);
    expect(next).toBeEnabled();
    expect(date).toHaveTextContent('Added: 24.10.2026 10:15');
  },
);

it('keeps navigation errors inside the photo pane without restoring stale bytes', async () => {
  (fetchJournalPhotos as jest.Mock).mockResolvedValue([
    freshEntry,
    { ...freshEntry, id: 'older', createdAt: '2026-10-24T08:15:00Z' },
  ]);
  fetchPhoto
    .mockResolvedValueOnce({
      entry: freshEntry,
      previousId: 'older',
      nextId: null,
    })
    .mockRejectedValueOnce(new Error('Access revoked'));
  const { view, onClose } = await open();
  fireEvent(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true }),
    'load',
  );
  const title = view.getByText('Gallery');
  await act(async () => fireEvent.press(view.getByText('Previous')));
  expect(view.getByText('Gallery')).toBe(title);
  expect(view.queryByTestId('app-modal-loading')).toBeNull();
  expect(view.queryByTestId('journal-full-photo')).toBeNull();
  expect(
    view.getByText('Could not load the photo details. Please try again.'),
  ).toBeVisible();
  expect(view.getByRole('button', { name: 'Previous' })).toBeDisabled();
  expect(view.getByRole('button', { name: 'Next' })).toBeDisabled();
  fireEvent.press(view.getByText('Close'));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('reopens on the originally selected photo and ignores a late navigation response', async () => {
  let finish: any;
  (fetchJournalPhotos as jest.Mock).mockResolvedValue([
    freshEntry,
    { ...freshEntry, id: 'older', createdAt: '2026-10-24T08:15:00Z' },
  ]);
  fetchPhoto
    .mockResolvedValueOnce({
      entry: freshEntry,
      previousId: 'older',
      nextId: null,
    })
    .mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      }),
    );
  const { view } = await open();
  fireEvent(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true }),
    'load',
  );
  await act(async () => fireEvent.press(view.getByText('Previous')));
  view.rerender(
    <ViewJournalPhotoModal
      visible={false}
      entry={tileEntry}
      onClose={jest.fn()}
    />,
  );
  fetchPhoto.mockResolvedValueOnce(preview(freshEntry));
  view.rerender(
    <ViewJournalPhotoModal visible entry={tileEntry} onClose={jest.fn()} />,
  );
  await act(async () => {});
  expect(fetchPhoto).toHaveBeenLastCalledWith('entry');
  await act(async () =>
    finish(
      preview({
        ...freshEntry,
        id: 'older',
        photo: { ...freshEntry.photo, id: 'late-image' },
      }),
    ),
  );
  expect(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true })
      .props.source.uri,
  ).toContain('fresh-image');
});

it('swipes right to older photos and left to newer photos while retaining both buttons', async () => {
  const responder = jest.spyOn(PanResponder, 'create');
  const newer = {
    ...freshEntry,
    id: 'older',
    photo: { ...freshEntry.photo, id: 'older-image' },
  };
  (fetchJournalPhotos as jest.Mock).mockResolvedValue([
    freshEntry,
    { ...freshEntry, id: 'older', createdAt: '2026-10-24T08:15:00Z' },
  ]);
  fetchPhoto
    .mockResolvedValueOnce({
      entry: freshEntry,
      previousId: 'older',
      nextId: 'newer',
    })
    .mockResolvedValueOnce({ entry: newer, previousId: 'entry', nextId: null })
    .mockResolvedValueOnce({
      entry: freshEntry,
      previousId: 'older',
      nextId: 'newer',
    });
  const { view, onClose } = await open();
  const swipe = responder.mock.calls[0][0];
  expect(
    view.getByTestId('journal-photo-swipe-area', {
      includeHiddenElements: true,
    }),
  ).toBeTruthy();
  expect(swipe.onMoveShouldSetPanResponder!(touchEvent, drag(80))).toBe(false);
  fireEvent(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true }),
    'load',
  );
  expect(view.getByRole('button', { name: 'Previous' })).toBeVisible();
  expect(view.getByRole('button', { name: 'Next' })).toBeVisible();
  expect(swipe.onMoveShouldSetPanResponder!(touchEvent, drag(80, 4))).toBe(
    true,
  );
  swipe.onPanResponderGrant!(touchEvent, drag(0));
  await act(async () =>
    swipe.onPanResponderRelease!(touchEvent, drag(80, 4, 0)),
  );
  expect(fetchPhoto).toHaveBeenLastCalledWith('older');
  expect(swipe.onMoveShouldSetPanResponder!(touchEvent, drag(-80))).toBe(false);
  fireEvent(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true }),
    'load',
  );
  expect(swipe.onMoveShouldSetPanResponder!(touchEvent, drag(80))).toBe(false);
  expect(swipe.onMoveShouldSetPanResponder!(touchEvent, drag(-80))).toBe(true);
  swipe.onPanResponderGrant!(touchEvent, drag(0));
  await act(async () =>
    swipe.onPanResponderRelease!(touchEvent, drag(-80, 0, 0)),
  );
  expect(fetchPhoto).toHaveBeenLastCalledWith('entry');
  expect(onClose).not.toHaveBeenCalled();
});

it('leaves vertical scrolling, taps, short drags and multi-touch gestures alone', async () => {
  const responder = jest.spyOn(PanResponder, 'create');
  fetchPhoto.mockResolvedValue({
    entry: freshEntry,
    previousId: 'older',
    nextId: 'newer',
  });
  const { view, onClose } = await open();
  fireEvent(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true }),
    'load',
  );
  const swipe = responder.mock.calls[0][0];
  expect(swipe.onStartShouldSetPanResponder!(touchEvent, drag(0))).toBe(false);
  for (const gesture of [drag(5, 90), drag(35, 40), drag(8), drag(-80, 0, 2)]) {
    expect(swipe.onMoveShouldSetPanResponder!(touchEvent, gesture)).toBe(false);
  }
  for (const gesture of [drag(25), drag(50, 50)]) {
    swipe.onPanResponderGrant!(touchEvent, drag(0));
    await act(async () => swipe.onPanResponderRelease!(touchEvent, gesture));
  }
  swipe.onPanResponderGrant!(touchEvent, drag(0));
  swipe.onPanResponderStart!(touchEvent, drag(0, 0, 2));
  await act(async () =>
    swipe.onPanResponderRelease!(touchEvent, drag(80, 0, 0)),
  );
  swipe.onPanResponderGrant!(touchEvent, drag(0));
  swipe.onPanResponderMove!(touchEvent, drag(50, 0, 2));
  await act(async () =>
    swipe.onPanResponderRelease!(touchEvent, drag(80, 0, 0)),
  );
  swipe.onPanResponderGrant!(touchEvent, drag(0));
  swipe.onPanResponderTerminate!(touchEvent, drag(0));
  await act(async () =>
    swipe.onPanResponderRelease!(touchEvent, drag(80, 0, 0)),
  );
  expect(fetchPhoto).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
});

it('does not swipe past either end or navigate a single-photo journal', async () => {
  const responder = jest.spyOn(PanResponder, 'create');
  const { view } = await open();
  fireEvent(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true }),
    'load',
  );
  const swipe = responder.mock.calls[0][0];
  expect(swipe.onMoveShouldSetPanResponder!(touchEvent, drag(-80))).toBe(false);
  expect(swipe.onMoveShouldSetPanResponder!(touchEvent, drag(80))).toBe(false);
  swipe.onPanResponderGrant!(touchEvent, drag(0));
  await act(async () =>
    swipe.onPanResponderRelease!(touchEvent, drag(80, 0, 0)),
  );
  expect(fetchPhoto).toHaveBeenCalledTimes(1);
});

it('does not complete an old swipe after the modal is closed and reopened', async () => {
  const responder = jest.spyOn(PanResponder, 'create');
  fetchPhoto.mockResolvedValue({
    entry: freshEntry,
    previousId: 'older',
    nextId: 'newer',
  });
  const { view } = await open();
  fireEvent(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true }),
    'load',
  );
  const swipe = responder.mock.calls[0][0];
  swipe.onPanResponderGrant!(touchEvent, drag(0));
  view.rerender(
    <ViewJournalPhotoModal
      visible={false}
      entry={tileEntry}
      onClose={jest.fn()}
    />,
  );
  view.rerender(
    <ViewJournalPhotoModal visible entry={tileEntry} onClose={jest.fn()} />,
  );
  await act(async () => {});
  fireEvent(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true }),
    'load',
  );
  await act(async () =>
    swipe.onPanResponderRelease!(touchEvent, drag(80, 0, 0)),
  );
  expect(fetchPhoto).toHaveBeenCalledTimes(2);
  expect(fetchPhoto).toHaveBeenLastCalledWith('entry');
});

it('blocks swipes when a private image fails to load', async () => {
  const responder = jest.spyOn(PanResponder, 'create');
  fetchPhoto.mockResolvedValue({
    entry: freshEntry,
    previousId: 'older',
    nextId: 'newer',
  });
  const { view } = await open();
  fireEvent(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true }),
    'error',
  );
  const swipe = responder.mock.calls[0][0];
  expect(swipe.onMoveShouldSetPanResponder!(touchEvent, drag(80))).toBe(false);
  expect(fetchPhoto).toHaveBeenCalledTimes(1);
});

it('opens Gallery on the newest photo across plants and filters to the newest for the selected plant', async () => {
  const older = {
    ...freshEntry,
    id: 'older',
    createdAt: '2026-10-20T10:00:00Z',
  };
  const newest = {
    ...freshEntry,
    id: 'pilea',
    plantId: '10',
    plant: 'Pilea',
    createdAt: '2026-11-01T10:00:00Z',
  };
  (fetchJournalPhotos as jest.Mock).mockResolvedValue([
    older,
    newest,
    freshEntry,
  ]);
  fetchPhoto.mockImplementation(async (id: string) =>
    preview([older, newest, freshEntry].find(item => item.id === id)),
  );
  const { view } = await open(null);
  expect(fetchPhoto).toHaveBeenLastCalledWith('pilea');
  fireEvent(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true }),
    'load',
  );
  fireEvent.press(view.getByText('All plants'));
  fireEvent.press(view.getByRole('button', { name: 'Bird' }));
  await act(async () => {});
  expect(fetchPhoto).toHaveBeenLastCalledWith('entry');
  fireEvent(view.getByTestId('journal-full-photo'), 'load');
  fireEvent.press(view.getByText('Previous'));
  await act(async () => {});
  expect(fetchPhoto).toHaveBeenLastCalledWith('older');
});
it('preselects the tile plant and restricts navigation to that plant', async () => {
  const unrelated = {
    ...freshEntry,
    id: 'pilea',
    plantId: '10',
    plant: 'Pilea',
    createdAt: '2026-11-01T10:00:00Z',
  };
  (fetchJournalPhotos as jest.Mock).mockResolvedValue([unrelated, freshEntry]);
  const { view } = await open();
  expect(fetchPhoto).toHaveBeenLastCalledWith('entry');
  fireEvent(
    view.getByTestId('journal-full-photo', { includeHiddenElements: true }),
    'load',
  );
  expect(view.queryByText('Previous')).toBeNull();
  expect(view.queryByText('Next')).toBeNull();
  expect(view.queryByText('All plants')).toBeNull();
});
it('shows an empty Gallery without a stuck spinner', async () => {
  (fetchJournalPhotos as jest.Mock).mockResolvedValue([]);
  const { view } = await open(null);
  expect(view.getByText('No journal photos for this selection.')).toBeVisible();
  expect(view.queryByTestId('app-modal-loading')).toBeNull();
  expect(fetchPhoto).not.toHaveBeenCalled();
});

it('refreshes the selected plant context without reloading on an equivalent parent render', async () => {
  const { view, onClose } = await open();
  fireEvent(view.getByTestId('journal-full-photo', { includeHiddenElements: true }), 'load');
  view.rerender(<ViewJournalPhotoModal visible entry={{ ...tileEntry }} onClose={onClose} />);
  expect(fetchJournalPhotos).toHaveBeenCalledTimes(1);
  expect(fetchPhoto).toHaveBeenCalledTimes(1);

  const updated = { ...freshEntry, plantId: '10', plant: 'Pilea', photo: { ...freshEntry.photo, id: 'pilea-image' } };
  let finish: (items: any[]) => void = () => {};
  (fetchJournalPhotos as jest.Mock).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  fetchPhoto.mockResolvedValueOnce(preview(updated));
  view.rerender(<ViewJournalPhotoModal visible entry={updated} onClose={onClose} />);
  expect(view.queryByTestId('journal-full-photo')).toBeNull();
  await act(async () => finish([updated]));
  const image = view.getByTestId('journal-full-photo', { includeHiddenElements: true });
  expect(image.props.source.uri).toContain('pilea-image');
  fireEvent(image, 'load');
  fireEvent.press(view.getAllByText('Pilea')[0]);
  expect(view.getByRole('button', { name: 'Pilea' })).toBeVisible();
  expect(fetchJournalPhotos).toHaveBeenCalledTimes(2);
  expect(fetchPhoto).toHaveBeenCalledTimes(2);
});

it("preserves the selected photo when an equivalent entry object is rendered", async () => {
  (fetchJournalPhotos as jest.Mock).mockResolvedValue([
    freshEntry,{...freshEntry,id:'older',createdAt:'2026-10-24T08:15:00Z'},
  ]);
  fetchPhoto
    .mockResolvedValueOnce({ entry: freshEntry, previousId: "older", nextId: null })
    .mockResolvedValueOnce({
      entry: { ...freshEntry, id: "older", photo: { ...freshEntry.photo, id: "older-image" } },
      previousId: null,
      nextId: "entry",
    });
  const { view } = await open();
  fireEvent(view.getByTestId("journal-full-photo", { includeHiddenElements: true }), "load");
  await act(async () => fireEvent.press(view.getByText("Previous")));
  fireEvent(view.getByTestId("journal-full-photo", { includeHiddenElements: true }), "load");
  const calls = fetchPhoto.mock.calls.length;
  view.rerender(<ViewJournalPhotoModal visible entry={{ ...tileEntry }} onClose={jest.fn()} />);
  await act(async () => {});
  expect(fetchPhoto).toHaveBeenCalledTimes(calls);
  expect(view.getByTestId("journal-full-photo").props.source.uri).toContain("older-image");
  expect(view.UNSAFE_queryByType(CenteredSpinner)).toBeNull();
});

it("discards stale private metadata when the same entry changes plant context", async () => {
  const { view } = await open();
  fireEvent(view.getByTestId("journal-full-photo", { includeHiddenElements: true }), "load");
  let finish: any;
  fetchPhoto.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  (fetchJournalPhotos as jest.Mock).mockResolvedValueOnce([{...freshEntry,plantId:'10'}]);
  view.rerender(
    <ViewJournalPhotoModal visible entry={{ ...tileEntry, plantId: "10" }} onClose={jest.fn()} />
  );
  expect(view.queryByTestId("journal-full-photo")).toBeNull();
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  await waitFor(() => expect(fetchPhoto).toHaveBeenCalledTimes(2));
  await act(async () => finish(preview({
    ...freshEntry,
    plantId: "10",
    photo: { ...freshEntry.photo, id: "new-context-image" },
  })));
  expect(
    view.getByTestId("journal-full-photo", { includeHiddenElements: true }).props.source.uri
  ).toContain("new-context-image");
});

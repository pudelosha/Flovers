import { act, renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { usePlantEditor } from '../usePlantEditor';
import {
  fetchPlantInstanceForEdit,
  updatePlantInstanceFromForm,
} from '../../../../api/services/plant-instances.service';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(callback, [callback]),
}));
jest.mock('../../../../api/services/plant-instances.service', () => ({
  fetchPlantInstanceForEdit: jest.fn(),
  updatePlantInstanceFromForm: jest.fn(),
}));
const fetchPlant = jest.mocked(fetchPlantInstanceForEdit);
const updatePlant = jest.mocked(updatePlantInstanceFromForm);
const detail: Awaited<ReturnType<typeof fetchPlant>> = {
  id: 7,
  display_name: 'Bird',
  notes: 'Sunny window',
  purchase_date: '2026-04-01',
  light_level: 'medium',
  orientation: 'S',
  distance_cm: 20,
  pot_material: 'plastic',
  soil_mix: 'all-purpose',
  plant_definition: { id: 1, name: 'Strelitzia alba' },
  location: { id: 2, name: 'Living room', category: 'indoor' },
};
const onSaved = jest.fn();
const beforeOpen = jest.fn();
let alert: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  fetchPlant.mockResolvedValue(
    detail as Awaited<ReturnType<typeof fetchPlant>>,
  );
  updatePlant.mockResolvedValue({
    id: 7,
    display_name: 'Edited bird',
  } as Awaited<ReturnType<typeof updatePlant>>);
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => alert.mockRestore());

it('loads the complete editor before displaying it and maps all existing fields', async () => {
  const { result } = renderHook(() =>
    usePlantEditor({ onSaved, onBeforeOpen: beforeOpen }),
  );
  await act(async () => {
    await result.current.open('7');
  });
  expect(beforeOpen).toHaveBeenCalledTimes(1);
  expect(fetchPlant).toHaveBeenCalledWith(7, { auth: true });
  expect(result.current.modalProps).toMatchObject({
    visible: true,
    fName: 'Bird',
    fLatinQuery: 'Strelitzia alba',
    fLocation: 'Living room',
    fNotes: 'Sunny window',
    fPurchaseDateISO: '2026-04-01',
    fLightLevel: 'medium',
    fOrientation: 'S',
    fDistanceCm: 20,
    fPotMaterial: 'plastic',
    fSoilMix: 'all-purpose',
  });
});

it('saves one mutation with the normalized form and notifies the owning screen', async () => {
  const { result } = renderHook(() => usePlantEditor({ onSaved }));
  await act(async () => {
    await result.current.open('7');
  });
  act(() => {
    result.current.modalProps.setFName(' Edited bird ');
    result.current.modalProps.setFNotes('New note');
  });
  await act(async () => {
    await Promise.all([
      result.current.modalProps.onSave(),
      result.current.modalProps.onSave(),
    ]);
  });
  expect(updatePlant).toHaveBeenCalledTimes(1);
  expect(updatePlant).toHaveBeenCalledWith(
    7,
    expect.objectContaining({
      display_name: 'Edited bird',
      notes: 'New note',
      purchase_date: '2026-04-01',
      light_level: 'medium',
      orientation: 'S',
      distance_cm: 20,
    }),
    { auth: true },
  );
  expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  expect(result.current.visible).toBe(false);
  expect(result.current.saving).toBe(false);
});

it('does not reopen a closed editor when its request arrives late', async () => {
  let finish!: (value: typeof detail) => void;
  fetchPlant.mockReturnValueOnce(
    new Promise(resolve => {
      finish = resolve;
    }),
  );
  const { result } = renderHook(() => usePlantEditor({ onSaved }));
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.open('7');
  });
  act(() => result.current.close());
  await act(async () => {
    finish(detail);
    await pending;
  });
  expect(result.current.visible).toBe(false);
  expect(result.current.loading).toBe(false);
});

it('ignores an older editor response after selecting a different plant', async () => {
  let finish!: (value: typeof detail) => void;
  fetchPlant.mockReturnValueOnce(
    new Promise(resolve => {
      finish = resolve;
    }),
  );
  fetchPlant.mockResolvedValueOnce({
    ...detail,
    id: 8,
    display_name: 'Aloe',
  } as Awaited<ReturnType<typeof fetchPlant>>);
  const { result } = renderHook(() => usePlantEditor({ onSaved }));
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.open('7');
  });
  await act(async () => {
    await result.current.open('8');
  });
  await act(async () => {
    finish(detail);
    await pending;
  });
  expect(result.current.modalProps.fName).toBe('Aloe');
});

it('keeps an editor open after a failed save so the user can retry', async () => {
  updatePlant.mockRejectedValueOnce(new Error('Offline'));
  const { result } = renderHook(() => usePlantEditor({ onSaved }));
  await act(async () => {
    await result.current.open('7');
  });
  await act(async () => {
    await result.current.modalProps.onSave();
  });
  expect(result.current.visible).toBe(true);
  expect(result.current.modalProps.fNotes).toBe('Sunny window');
  expect(result.current.saving).toBe(false);
  expect(onSaved).not.toHaveBeenCalled();
  expect(alert).toHaveBeenCalledWith('Update failed', 'Offline');
});

it('does not expose an editor when server access metadata denies editing', async () => {
  fetchPlant.mockResolvedValueOnce({
    ...detail,
    access: null,
  } as unknown as Awaited<ReturnType<typeof fetchPlant>>);
  const { result } = renderHook(() => usePlantEditor({ onSaved }));
  await act(async () => {
    await result.current.open('7');
  });
  expect(result.current.visible).toBe(false);
  await act(async () => {
    await result.current.modalProps.onSave();
  });
  expect(updatePlant).not.toHaveBeenCalled();
});

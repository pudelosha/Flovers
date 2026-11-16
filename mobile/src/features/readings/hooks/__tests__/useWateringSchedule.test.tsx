import { act, renderHook } from '@testing-library/react-native';
import { useWateringSchedule } from '../useWateringSchedule';
import {
  fetchPumpStatus,
  schedulePumpWatering,
  recallPumpWatering,
} from '../../../../api/services/readings.service';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(callback, [callback]),
}));
jest.mock('../../../../api/services/readings.service', () => ({
  fetchPumpStatus: jest.fn(),
  schedulePumpWatering: jest.fn(),
  recallPumpWatering: jest.fn(),
}));
const fetchStatus = jest.mocked(fetchPumpStatus);
const schedule = jest.mocked(schedulePumpWatering);
const recall = jest.mocked(recallPumpWatering);
const onStatusChanged = jest.fn(),
  onNotify = jest.fn();
const status = {
  pump_included: true,
  supports_manual_duration: true,
  last_pump_run_at: '2026-11-01T10:00:00Z',
  last_pump_run_source: 'automatic' as const,
  pending_pump_task: null,
};
const pending = {
  id: 3,
  status: 'pending',
  source: 'manual',
  requested_at: '2026-11-16T10:00:00Z',
};
const options = {
  translationScope: 'readings' as const,
  onStatusChanged,
  onNotify,
};
beforeEach(() => {
  jest.clearAllMocks();
  fetchStatus.mockResolvedValue(status);
  schedule.mockResolvedValue({ pending_pump_task: pending } as Awaited<
    ReturnType<typeof schedule>
  >);
  recall.mockResolvedValue({ pending_pump_task: null });
});

it.each(['readings', 'plantDetails'] as const)(
  'loads the same modal contract for %s',
  async translationScope => {
    const { result } = renderHook(() =>
      useWateringSchedule({ ...options, translationScope }),
    );
    await act(async () => {
      await result.current.open('9');
    });
    expect(result.current.modalProps).toMatchObject({
      visible: true,
      deviceId: '9',
      pumpIncluded: true,
      durationSupported: true,
    });
    expect(onStatusChanged).toHaveBeenCalledWith('9', status);
  },
);

it('schedules the selected duration once, preserving the last-run metadata', async () => {
  const { result } = renderHook(() => useWateringSchedule(options));
  await act(async () => {
    await result.current.open('9');
  });
  await act(async () => {
    await Promise.all([
      result.current.modalProps.onScheduleWatering(20),
      result.current.modalProps.onScheduleWatering(20),
    ]);
  });
  expect(schedule).toHaveBeenCalledTimes(1);
  expect(schedule).toHaveBeenCalledWith(9, { durationSeconds: 20 });
  expect(onStatusChanged).toHaveBeenLastCalledWith('9', {
    ...status,
    pending_pump_task: pending,
  });
  expect(result.current.modalProps.pendingPumpTask).toEqual(pending);
  expect(result.current.working).toBe(false);
});

it('recalls a scheduled request and updates both the dialog and owning screen', async () => {
  const { result } = renderHook(() => useWateringSchedule(options));
  await act(async () => {
    await result.current.open('9');
  });
  await act(async () => {
    await result.current.modalProps.onScheduleWatering(20);
  });
  await act(async () => {
    await result.current.modalProps.onRecallWatering();
  });
  expect(recall).toHaveBeenCalledWith(9);
  expect(result.current.modalProps.pendingPumpTask).toBeNull();
  expect(onStatusChanged).toHaveBeenLastCalledWith('9', status);
});

it('does not show a stale response after closing or replacing a target', async () => {
  let finish!: (value: typeof status) => void;
  fetchStatus.mockReturnValueOnce(
    new Promise(resolve => {
      finish = resolve;
    }),
  );
  const { result } = renderHook(() => useWateringSchedule(options));
  let old!: Promise<void>;
  act(() => {
    old = result.current.open('9');
  });
  act(() => result.current.close());
  await act(async () => {
    await result.current.open('10');
  });
  await act(async () => {
    finish(status);
    await old;
  });
  expect(result.current.modalProps.deviceId).toBe('10');
  expect(onStatusChanged).toHaveBeenCalledTimes(1);
  expect(onStatusChanged).toHaveBeenCalledWith('10', status);
});

it('keeps failed loading distinct from an empty schedule and allows retry', async () => {
  fetchStatus.mockRejectedValueOnce(new Error('Offline'));
  const { result } = renderHook(() => useWateringSchedule(options));
  await act(async () => {
    await result.current.open('9');
  });
  expect(result.current.visible).toBe(false);
  expect(result.current.loading).toBe(false);
  expect(onNotify).toHaveBeenCalledWith(
    'Failed to load watering schedule',
    'error',
  );
  await act(async () => {
    await result.current.open('9');
  });
  expect(result.current.visible).toBe(true);
});

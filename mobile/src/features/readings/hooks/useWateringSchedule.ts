import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  fetchPumpStatus,
  recallPumpWatering,
  schedulePumpWatering,
  type ApiPumpStatusResponse,
} from '../../../api/services/readings.service';
import { useRequestGuard } from '../../../shared/hooks/useRequestGuard';

type Options = {
  translationScope: 'readings' | 'plantDetails';
  onBeforeOpen?: () => void;
  onStatusChanged: (deviceId: string, status: ApiPumpStatusResponse) => void;
  onNotify: (message: string, variant: 'success' | 'error') => void;
};

/** One status/schedule/recall workflow for the device list and plant details. */
export function useWateringSchedule(options: Options) {
  const { t } = useTranslation();
  const callbacks = useRef(options);
  callbacks.current = options;
  const guard = useRequestGuard();
  const busy = useRef(false);
  const currentStatus = useRef<ApiPumpStatusResponse | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [status, setStatus] = useState<ApiPumpStatusResponse | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);

  const notify = useCallback(
    (key: string, fallback: string, variant: 'success' | 'error') => {
      callbacks.current.onNotify(
        String(
          t(`${callbacks.current.translationScope}.toasts.${key}`, {
            defaultValue: fallback,
          }),
        ),
        variant,
      );
    },
    [t],
  );

  const close = useCallback(() => {
    guard.cancelPending();
    busy.current = false;
    currentStatus.current = null;
    setDeviceId(null);
    setStatus(null);
    setVisible(false);
    setLoading(false);
    setWorking(false);
  }, [guard]);

  useFocusEffect(
    useCallback(() => {
      guard.activate();
      return () => {
        guard.invalidate();
        close();
      };
    }, [close, guard]),
  );

  const publish = useCallback((id: string, next: ApiPumpStatusResponse) => {
    currentStatus.current = next;
    setStatus(next);
    callbacks.current.onStatusChanged(id, next);
  }, []);

  const open = useCallback(
    async (id?: string | number | null) => {
      if (!id) {
        notify('missingDeviceId', 'Missing device ID', 'error');
        return;
      }
      const isCurrent = guard.begin();
      const key = String(id);
      callbacks.current.onBeforeOpen?.();
      busy.current = false;
      currentStatus.current = null;
      setDeviceId(key);
      setStatus(null);
      setVisible(false);
      setWorking(false);
      setLoading(true);
      try {
        const result = await fetchPumpStatus(Number(id));
        if (!isCurrent()) return;
        publish(key, result);
        setVisible(true);
      } catch {
        if (isCurrent())
          notify(
            'pumpStatusLoadFailed',
            'Failed to load watering schedule',
            'error',
          );
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [guard, notify, publish],
  );

  const mutate = useCallback(
    async (action: 'schedule' | 'recall', durationSeconds?: number) => {
      if (!deviceId || !currentStatus.current || !visible || busy.current)
        return;
      const isCurrent = guard.begin();
      const previous = currentStatus.current;
      busy.current = true;
      setWorking(true);
      try {
        const result =
          action === 'schedule'
            ? await schedulePumpWatering(Number(deviceId), { durationSeconds })
            : await recallPumpWatering(Number(deviceId));
        if (!isCurrent()) return;
        publish(deviceId, {
          ...previous,
          pending_pump_task: result.pending_pump_task ?? null,
        });
        notify(
          action === 'schedule' ? 'wateringScheduled' : 'wateringRecalled',
          action === 'schedule'
            ? 'Watering scheduled'
            : 'Scheduled watering recalled',
          'success',
        );
      } catch {
        if (isCurrent())
          notify(
            action === 'schedule'
              ? 'wateringScheduleFailed'
              : 'wateringRecallFailed',
            action === 'schedule'
              ? 'Failed to schedule watering'
              : 'Failed to recall watering',
            'error',
          );
      } finally {
        if (isCurrent()) {
          busy.current = false;
          setWorking(false);
        }
      }
    },
    [deviceId, visible, guard, publish, notify],
  );

  const schedule = useCallback(
    (durationSeconds?: number) => mutate('schedule', durationSeconds),
    [mutate],
  );
  const recall = useCallback(() => mutate('recall'), [mutate]);
  return {
    open,
    close,
    visible,
    loading,
    working,
    modalProps: {
      visible,
      loading,
      working,
      deviceId,
      pumpIncluded: status?.pump_included ?? false,
      durationSupported: !!status?.supports_manual_duration,
      pendingPumpTask: status?.pending_pump_task ?? null,
      scheduledJobExists: !!status?.pending_pump_task,
      scheduledJobCreatedAt: status?.pending_pump_task?.requested_at ?? null,
      onClose: close,
      onScheduleWatering: schedule,
      onRecallWatering: recall,
    },
  };
}

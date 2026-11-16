import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  fetchPlantInstanceForEdit,
  updatePlantInstanceFromForm,
  type ApiPlantInstanceListItem,
} from '../../../api/services/plant-instances.service';
import type {
  LightLevel,
  Orientation,
} from '../../create-plant/types/create-plant.types';
import { useRequestGuard } from '../../../shared/hooks/useRequestGuard';
import { plantAccess } from '../../../shared/utils/plantAccess';

type Options = {
  onBeforeOpen?: () => void;
  onSaved: (plant: ApiPlantInstanceListItem) => void | Promise<void>;
};

/** Shared edit lifecycle; each screen decides how to apply the saved plant. */
export function usePlantEditor(options: Options) {
  const { t } = useTranslation();
  const callbacks = useRef(options);
  callbacks.current = options;
  const guard = useRequestGuard();
  const savingRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fName, setFName] = useState('');
  const [fLatinQuery, setFLatinQuery] = useState('');
  const [fLatinSelected, setFLatinSelected] = useState<string>();
  const [fLocation, setFLocation] = useState<string>();
  const [fNotes, setFNotes] = useState('');
  const [fPurchaseDateISO, setFPurchaseDateISO] = useState<string | null>(null);
  const [fLightLevel, setFLightLevel] = useState<LightLevel>('medium');
  const [fOrientation, setFOrientation] = useState<Orientation>('S');
  const [fDistanceCm, setFDistanceCm] = useState(0);
  const [fPotMaterial, setFPotMaterial] = useState<string>();
  const [fSoilMix, setFSoilMix] = useState<string>();

  const close = useCallback(() => {
    guard.cancelPending();
    savingRef.current = false;
    setVisible(false);
    setEditingId(null);
    setLoading(false);
    setSaving(false);
  }, [guard]);

  useFocusEffect(
    useCallback(() => {
      guard.activate();
      return () => {
        guard.invalidate();
        close();
      };
    }, [guard, close]),
  );

  const open = useCallback(
    async (id: string) => {
      const isCurrent = guard.begin();
      callbacks.current.onBeforeOpen?.();
      savingRef.current = false;
      setEditingId(id);
      setVisible(false);
      setSaving(false);
      setLoading(true);
      try {
        const detail = await fetchPlantInstanceForEdit(Number(id), {
          auth: true,
        });
        if (!isCurrent() || !plantAccess(detail.access).canEdit) return;
        setFName(
          detail.display_name?.trim() ||
            detail.plant_definition?.name?.trim() ||
            t('plants.list.unnamed', { defaultValue: 'Unnamed plant' }),
        );
        setFLatinQuery(detail.plant_definition?.name || '');
        setFLatinSelected(detail.plant_definition?.name || undefined);
        setFLocation(detail.location?.name || undefined);
        setFNotes(detail.notes || '');
        setFPurchaseDateISO(detail.purchase_date ?? null);
        setFLightLevel(detail.light_level || 'medium');
        setFOrientation(detail.orientation || 'S');
        setFDistanceCm(detail.distance_cm ?? 0);
        setFPotMaterial(detail.pot_material ?? undefined);
        setFSoilMix(detail.soil_mix ?? undefined);
        setVisible(true);
      } catch (error) {
        if (!isCurrent()) return;
        Alert.alert(
          t('plants.alert.loadFailedTitle', { defaultValue: 'Load failed' }),
          error instanceof Error
            ? error.message
            : t('plants.alert.loadFailedMsg', {
                defaultValue: 'Could not load plant details.',
              }),
        );
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [guard, t],
  );

  const save = useCallback(async () => {
    if (!editingId || !visible || !fName.trim() || savingRef.current) return;
    const isCurrent = guard.begin();
    savingRef.current = true;
    setSaving(true);
    try {
      const updated = await updatePlantInstanceFromForm(
        Number(editingId),
        {
          display_name: fName.trim(),
          notes: fNotes,
          purchase_date: fPurchaseDateISO,
          light_level: fLightLevel,
          orientation: fOrientation,
          distance_cm: fDistanceCm,
          pot_material: fPotMaterial ?? '',
          soil_mix: fSoilMix ?? '',
        },
        { auth: true },
      );
      if (!isCurrent()) return;
      setVisible(false);
      setEditingId(null);
      await callbacks.current.onSaved(updated);
    } catch (error) {
      if (!isCurrent()) return;
      Alert.alert(
        t('plants.alert.updateFailedTitle', { defaultValue: 'Update failed' }),
        error instanceof Error
          ? error.message
          : t('plants.alert.updateFailedMsg', {
              defaultValue: 'Could not update this plant.',
            }),
      );
    } finally {
      if (isCurrent()) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }, [
    editingId,
    visible,
    fName,
    fNotes,
    fPurchaseDateISO,
    fLightLevel,
    fOrientation,
    fDistanceCm,
    fPotMaterial,
    fSoilMix,
    guard,
    t,
  ]);

  return {
    open,
    close,
    visible,
    loading,
    saving,
    modalProps: {
      visible,
      fName,
      setFName,
      fLatinQuery,
      setFLatinQuery,
      fLatinSelected,
      setFLatinSelected,
      fLocation,
      setFLocation,
      fNotes,
      setFNotes,
      fPurchaseDateISO,
      setFPurchaseDateISO,
      fLightLevel,
      setFLightLevel,
      fOrientation,
      setFOrientation,
      fDistanceCm,
      setFDistanceCm,
      fPotMaterial,
      setFPotMaterial,
      fSoilMix,
      setFSoilMix,
      onCancel: close,
      onSave: save,
    },
  };
}

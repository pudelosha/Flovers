import React, { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { launchCamera, launchImageLibrary, type CameraOptions } from "react-native-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import ContactModalFrame from "../../../sharing/components/ContactModalFrame";
import CenteredSpinner from "../../../../shared/ui/CenteredSpinner";
import PlantPhotoFramingEditor from "../../../../shared/ui/PlantPhotoFramingEditor";
import { usePlantPhoto } from "../../../../shared/hooks/usePlantPhoto";
import { DEFAULT_PHOTO_FRAMING, normalizePhotoFraming, type PhotoFraming } from "../../../../shared/utils/photoFraming";
import { plantAccess } from "../../../../shared/utils/plantAccess";
import { ApiError } from "../../../../api/client";
import { createJournalPhoto, fetchJournalPhoto, fetchJournalPhotoAvailability, newJournalUploadKey, updateJournalPhoto,
  type JournalPhotoAvailability, type JournalPhotoValues, type JournalPlantOption } from "../../../../api/services/journal-photos.service";
import type { JournalPhotoItem } from "../../types/task-history.types";

type Props = { visible: boolean; onClose: (refresh?: boolean) => void; onSaved: () => void;
  plantOptions: JournalPlantOption[]; preferredPlantId?: string; entry?: JournalPhotoItem | null };
type Selection = { uri: string; width?: number; height?: number; uploadKey: string };
const dayString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function JournalPhotoModal({ visible, onClose, onSaved, plantOptions, preferredPlantId, entry }: Props) {
  const { t } = useTranslation();
  // This screen extends behind the tab bar, unlike the modal content area.
  const insets = useSafeAreaInsets();
  const tr = (key: string, values?: Record<string, unknown>) => String(t(`taskHistory.photo.${key}`, values));
  const contextKey = `${visible}:${entry?.id ?? "new"}:${preferredPlantId ?? ""}`;
  const generation = useRef({ context: contextKey, value: 0 });
  if (generation.current.context !== contextKey) generation.current = { context: contextKey, value: generation.current.value + 1 };
  const context = `${contextKey}:${generation.current.value}`;
  const [readyContext, setReadyContext] = useState("");
  const [retry, setRetry] = useState(0);
  const [availability, setAvailability] = useState<JournalPhotoAvailability[]>([]);
  const [plantId, setPlantId] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [framing, setFraming] = useState<PhotoFraming>(DEFAULT_PHOTO_FRAMING);
  const [notes, setNotes] = useState("");
  const [takenOn, setTakenOn] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [loadedEntry, setLoadedEntry] = useState<JournalPhotoItem | null>(null);
  const activeEntry = entry && loadedEntry?.id === entry.id ? loadedEntry : null;
  const [retryPending, setRetryPending] = useState(false);
  const [conflicted, setConflicted] = useState(false);
  const pendingSave = useRef<{ entry: JournalPhotoItem | null; plantId: string; selection: Selection | null; values: JournalPhotoValues } | null>(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const ownedPlants = plantOptions.filter(plant => plantAccess(plant.access).canEdit);
  const privatePhoto = usePlantPhoto(visible ? activeEntry?.photo ?? null : null, { variant: "display", expiresAt: activeEntry?.access?.expires_at });
  const close = useCallback(() => { if (!busyRef.current) { Keyboard.dismiss(); onClose(retryPending); } }, [onClose, retryPending]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    busyRef.current = false; setBusy(false);
    setLoadedEntry(null); pendingSave.current = null; setRetryPending(false); setConflicted(false);
    setReadyContext(""); setError(""); setLoadError(false); setSelection(null);
    setFraming(normalizePhotoFraming(entry?.photo.framing)); setNotes(entry?.note ?? "");
    setTakenOn(entry?.recordedDate ?? ""); setDateOpen(false); setInteracting(false);
    setPlantId(entry?.plantId ?? (plantOptions.some(plant => plant.id === preferredPlantId && plantAccess(plant.access).canEdit)
      ? preferredPlantId! : plantOptions.filter(plant => plantAccess(plant.access).canEdit)[0]?.id ?? ""));
    Promise.all([fetchJournalPhotoAvailability(), entry ? fetchJournalPhoto(entry.id) : Promise.resolve(null)]).then(([result, fresh]) => {
      if (!cancelled) {
        setAvailability(result); setLoadedEntry(fresh);
        if (fresh) { setFraming(normalizePhotoFraming(fresh.photo.framing)); setNotes(fresh.note ?? "");
          setTakenOn(fresh.recordedDate ?? ""); setPlantId(fresh.plantId); }
        setReadyContext(context);
      }
    }).catch(() => { if (!cancelled) { setLoadError(true); setReadyContext(context); } });
    return () => { cancelled = true; };
  }, [visible, entry?.id, preferredPlantId, retry]);

  const choose = async (camera: boolean) => {
    if (busyRef.current || retryPending) return;
    const version = generation.current.value;
    try {
      if (camera && Platform.OS === "android") {
        const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
        if (await PermissionsAndroid.request(permission) !== PermissionsAndroid.RESULTS.GRANTED) {
          if (version === generation.current.value) setError(tr("cameraDenied"));
          return;
        }
      }
      const options: CameraOptions = { mediaType: "photo", maxWidth: 1280, maxHeight: 1280, quality: 0.8,
        includeBase64: false, saveToPhotos: false, assetRepresentationMode: "compatible" };
      const result = camera ? await launchCamera(options) : await launchImageLibrary({ ...options, selectionLimit: 1 });
      if (version !== generation.current.value || result.didCancel) return;
      const asset = result.assets?.[0];
      if (result.errorCode || !asset?.uri) throw new Error("No photo");
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) { setError(tr("tooLarge")); return; }
      setSelection({ uri: asset.uri, width: asset.width, height: asset.height, uploadKey: newJournalUploadKey() });
      setFraming(DEFAULT_PHOTO_FRAMING); setError("");
    } catch { if (version === generation.current.value) setError(tr("invalidPhoto")); }
  };

  const next = availability.find(value => value.plant_id === plantId)?.next_photo_at;
  const cooldown = !entry && !!next && Date.parse(next) > Date.now();
  const save = async () => {
    if (busyRef.current || cooldown || conflicted) return;
    if (!plantId) { setError(tr("noPlant")); return; }
    if (!entry && !selection) { setError(tr("noPhoto")); return; }
    if (entry && (!activeEntry || !plantAccess(activeEntry.access).canEdit)) { setError(tr("permission")); return; }
    if (takenOn && takenOn > dayString(new Date())) { setError(tr("futureDate")); return; }
    const version = generation.current.value;
    busyRef.current = true; setBusy(true); setError(""); Keyboard.dismiss();
    const submission = pendingSave.current ?? { entry: activeEntry, plantId, selection,
      values: { notes, taken_on: takenOn || null, framing } };
    pendingSave.current = submission;
    try {
      if (submission.entry) await updateJournalPhoto(submission.entry, submission.values, submission.selection ?? undefined);
      else await createJournalPhoto(submission.plantId, submission.selection!.uri, submission.selection!.uploadKey, submission.values);
      if (version === generation.current.value) { pendingSave.current = null; onSaved(); }
    } catch (failure) {
      if (version !== generation.current.value) return;
      const code = failure instanceof ApiError ? failure.body?.code : "";
      const uncertain = !(failure instanceof ApiError) || failure.status === 0 || failure.status === 408 || failure.status >= 500;
      setRetryPending(uncertain);
      if (!uncertain) pendingSave.current = null;
      if (code === "photo_conflict") setConflicted(true);
      if (code === "journal_photo_cooldown") {
        const nextAt = failure instanceof ApiError ? failure.body?.next_photo_at : null;
        if (nextAt) setAvailability(values => [...values.filter(value => value.plant_id !== plantId), { plant_id: plantId, next_photo_at: nextAt }]);
        setError(nextAt ? tr("cooldown", { date: new Date(nextAt).toLocaleString() }) : tr("saveFailed"));
      } else setError(tr(uncertain ? "retryPending" : code === "photo_conflict" ? "conflict" : code === "upload_too_large" ? "tooLarge"
        : code === "photo_quota_exceeded" || code === "photo_storage_full" ? "storageFull"
        : failure instanceof ApiError && failure.status === 403 ? "permission" : "saveFailed"));
    } finally {
      if (version === generation.current.value) { busyRef.current = false; setBusy(false); }
    }
  };

  if (!visible) return null;
  const loading = readyContext !== context || (!loadError && !!entry && (!activeEntry || (!selection && !privatePhoto.uri && !privatePhoto.error)));
  const uri = selection?.uri ?? privatePhoto.uri;
  const editingForbidden = !!entry && (!activeEntry || !plantAccess(activeEntry.access).canEdit);
  const fieldsDisabled = busy || retryPending || conflicted || editingForbidden;
  const button = (label: string, onPress: () => void, icon?: string, primary = false, disabled = false) =>
    <Pressable accessibilityRole="button" style={[styles.button, primary && styles.primary, disabled && styles.disabled]}
      disabled={disabled} onPress={onPress}>
      {icon && <MaterialCommunityIcons name={icon} color="#FFFFFF" size={20} />}
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>;
  return <View style={[StyleSheet.absoluteFill, { bottom: 64 + Math.max(insets.bottom, 10), zIndex: 6000, elevation: 6000 }]}>
    <ContactModalFrame visible title={tr(entry ? "titleEdit" : "titleAdd")} onClose={close} sharingLayout scrollEnabled={!interacting}>
      {loading ? <View style={styles.loading}><CenteredSpinner size={42} /></View>
        : loadError || (entry && !selection && !!privatePhoto.error) ? <View style={styles.form}>
          <Text style={styles.error}>{tr("loadFailed")}</Text>
          {button(tr("retry"), () => { privatePhoto.refresh(); setRetry(value => value + 1); })}
        </View> : <View style={styles.form}>
          <Text style={styles.description}>{tr("description")}</Text>
          <Text style={styles.label}>{tr("plant")}</Text>
          {entry ? <View style={styles.locked}><MaterialCommunityIcons name="lock-outline" size={17} color="#FFFFFF" /><Text style={styles.text}>{activeEntry?.plant ?? entry.plant}</Text></View>
            : ownedPlants.length ? ownedPlants.map(plant => <Pressable key={plant.id} disabled={fieldsDisabled} style={styles.plant}
              accessibilityRole="radio" accessibilityState={{ checked: plant.id === plantId }}
              onPress={() => { setPlantId(plant.id); setError(""); }}>
              <MaterialCommunityIcons name={plant.id === plantId ? "radiobox-marked" : "radiobox-blank"} color="#FFFFFF" size={22} />
              <View style={{ flex: 1 }}><Text style={styles.text}>{plant.name}</Text>{!!plant.location && <Text style={styles.description}>{plant.location}</Text>}</View>
            </Pressable>) : <Text style={styles.description}>{tr("noPlants")}</Text>}
          {cooldown && <Text style={styles.description}>{tr("cooldown", { date: new Date(next!).toLocaleString() })}</Text>}
          {!!uri && <PlantPhotoFramingEditor uri={uri} width={selection ? selection.width : activeEntry?.photo.width}
            height={selection ? selection.height : activeEntry?.photo.height} value={framing} onChange={setFraming}
            disabled={fieldsDisabled} onInteractionChange={setInteracting} journalLabel={tr("journalGuide")} />}
          {button(tr("takePhoto"), () => { void choose(true); }, "camera", true, fieldsDisabled)}
          {button(tr("chooseGallery"), () => { void choose(false); }, "image-multiple-outline", false, fieldsDisabled)}
          <Text style={styles.label}>{tr("photoDate")}</Text>
          {button(takenOn || tr("chooseDate"), () => setDateOpen(true), "calendar-outline", false, fieldsDisabled)}
          {!!takenOn && <Pressable disabled={fieldsDisabled} onPress={() => setTakenOn("")}><Text style={styles.description}>{tr("clearDate")}</Text></Pressable>}
          {dateOpen && !fieldsDisabled && <DateTimePicker value={takenOn ? new Date(takenOn + "T12:00:00") : new Date()} maximumDate={new Date()} mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"} onChange={(_event, date) => {
              if (Platform.OS !== "ios") setDateOpen(false);
              if (date) setTakenOn(dayString(date));
            }} />}
          {dateOpen && Platform.OS === "ios" && button(String(t("taskHistoryModals.common.done", { defaultValue: "Done" })), () => setDateOpen(false))}
          <Text style={styles.label}>{tr("notes")}</Text>
          <TextInput accessibilityLabel={tr("notes")} placeholder={tr("notesPlaceholder")} placeholderTextColor="rgba(255,255,255,0.55)"
            multiline maxLength={4000} value={notes} onChangeText={setNotes} editable={!fieldsDisabled} style={styles.input} />
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {conflicted && button(tr("retry"), () => setRetry(value => value + 1))}
          <View style={styles.actions}>
            {button(tr("cancel"), close, undefined, false, busy)}
            {button(tr(busy ? "saving" : "save"), () => { void save(); }, undefined, true,
              busy || cooldown || conflicted || editingForbidden || !plantId || (!entry && !selection))}
          </View>
        </View>}
    </ContactModalFrame>
  </View>;
}
const styles = StyleSheet.create({
  form: { marginHorizontal: 16, gap: 12 }, loading: { minHeight: 220, justifyContent: "center" },
  description: { color: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 20 },
  label: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", marginTop: 5 },
  text: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  plant: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)" },
  locked: { flexDirection: "row", gap: 8, alignItems: "center", paddingVertical: 8 },
  button: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, minHeight: 44,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.17)" },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", textAlign: "center" },
  primary: { backgroundColor: "#0B7285" }, disabled: { opacity: 0.5 },
  input: { minHeight: 100, textAlignVertical: "top", borderRadius: 18, backgroundColor: "rgba(255,255,255,0.14)",
    color: "#FFFFFF", fontSize: 14, padding: 14 },
  error: { color: "#FFAAAA", fontSize: 13, lineHeight: 20 },
  actions: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 8 },
});

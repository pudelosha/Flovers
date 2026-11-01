import React from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import LinearGradient from "react-native-linear-gradient";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../../app/providers/SettingsProvider";
import { usePlantPhoto } from "../../../shared/hooks/usePlantPhoto";
import FramedPlantImage from "../../../shared/ui/FramedPlantImage";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import SharedPlantBadge from "../../../shared/ui/SharedPlantBadge";
import { plantAccess, SHARED_PLANT_TINT } from "../../../shared/utils/plantAccess";
import { PHOTO_JOURNAL_ASPECT_RATIO } from "../../../shared/utils/photoFraming";
import type { JournalPhotoItem } from "../types/task-history.types";
import { s } from "../styles/task-history.styles";

export default function JournalPhotoTile({ item, isMenuOpen, onToggleMenu, onViewPhoto, onEdit, onPlantDetails, onDelete }: {
  item: JournalPhotoItem; isMenuOpen: boolean; onToggleMenu: () => void;
  onViewPhoto: () => void; onEdit: () => void; onPlantDetails: () => void; onDelete: () => void;
}) {
  const { t } = useTranslation();
  const window = useWindowDimensions();
  const { settings } = useSettings();
  const photo = usePlantPhoto(item.photo, { variant: "display", expiresAt: item.access?.expires_at });
  const access = plantAccess(item.access);
  const date = (value: string) => {
    const dt = new Date(value.length === 10 ? value + "T12:00:00" : value);
    return (settings.dateFormat || "DD.MM.YYYY").replace("YYYY", String(dt.getFullYear()))
      .replace("MM", String(dt.getMonth() + 1).padStart(2, "0")).replace("DD", String(dt.getDate()).padStart(2, "0"));
  };
  const addedDate = date(item.createdAt);
  const action = (callback: () => void) => { onToggleMenu(); callback(); };
  return <View style={[s.cardWrap, isMenuOpen && s.cardWrapRaised]}>
    <View style={styles.glass}>
      <LinearGradient start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        colors={["rgba(16,80,63,0.9)", "rgba(5,31,24,0.9)"]} style={StyleSheet.absoluteFill} />
      <LinearGradient pointerEvents="none" start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)", "rgba(255,255,255,0.08)"]}
        locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.14)" }]} pointerEvents="none" />
      {access.isShared && <View style={[StyleSheet.absoluteFill, { backgroundColor: SHARED_PLANT_TINT }]} />}
      <Pressable onPress={onToggleMenu} accessibilityRole="button" accessibilityLabel={item.plant}>
        <View style={[styles.hero, { minHeight: Math.max(0, window.width - 32) / PHOTO_JOURNAL_ASPECT_RATIO }]}>
          <View pointerEvents="none" style={styles.photoSurface}>
            {photo.uri ? <MaskedView style={StyleSheet.absoluteFill} maskElement={
            <LinearGradient colors={["rgba(0,0,0,1)", "rgba(0,0,0,0.92)", "rgba(0,0,0,0.75)", "rgba(0,0,0,0.50)", "rgba(0,0,0,0.22)", "rgba(0,0,0,0)"]}
              locations={[0, 0.1, 0.45, 0.68, 0.88, 1]} style={StyleSheet.absoluteFill} />
          }>
            <FramedPlantImage uri={photo.uri} photo={item.photo} style={StyleSheet.absoluteFill} onError={photo.refresh} />
          </MaskedView>
            : photo.loading ? <CenteredSpinner size={30} />
            : <MaterialCommunityIcons name="image-off-outline" size={32} color="rgba(255,255,255,0.65)" />}
          </View>
          <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0.22)", "rgba(0,0,0,0)"]}
            style={styles.topScrim} />
          <View style={styles.heroContent}>
            <View style={styles.identity}>
              <Text style={s.plantName}>{item.plant}</Text>
              {!!item.location && <View style={s.locationRow}>
                <MaterialCommunityIcons name="map-marker" size={12} color="#FFFFFF" style={s.locationIcon} />
                <Text style={s.location}>{item.location}</Text>
              </View>}
              {access.isShared && <SharedPlantBadge access={item.access} compact />}
            </View>
            <View style={styles.added}>
              <Text style={s.completedLabel}>{t("taskHistory.photo.added", { defaultValue: "Added" })}</Text>
              <Text style={s.completedDateText}>{addedDate}</Text>
            </View>
          </View>
        </View>
        {(!!item.recordedDate || !!item.note?.trim()) && <View style={styles.notes}>
          {!!item.recordedDate && <Text style={s.metaCompact}>{t("taskHistory.photo.photoTaken", { defaultValue: "Photo date" })}: {date(item.recordedDate)}</Text>}
          {!!item.note?.trim() && <View style={s.noteBox}>
            <Text style={s.noteLabel}>{t("taskHistory.tile.noteLabel", { defaultValue: "Note" })}</Text>
            <Text style={s.noteText}>{item.note}</Text>
          </View>}
        </View>}
      </Pressable>
      <Pressable accessibilityRole="button"
        accessibilityLabel={t("taskHistory.photo.view", { defaultValue: "View photo" })}
        style={styles.photoShortcut}
        onPress={(event) => {
          event.stopPropagation();
          if (isMenuOpen) onToggleMenu();
          onViewPhoto();
        }}>
        <MaterialCommunityIcons name="image-search-outline" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
    {isMenuOpen && <View style={s.menuSheet}>
      <Pressable style={s.menuItem} onPress={() => action(onViewPhoto)}>
        <MaterialCommunityIcons name="image-search-outline" size={18} color="#FFFFFF" style={{ marginRight: 10 }} />
        <Text style={s.menuItemText}>{t("taskHistory.photo.view", { defaultValue: "View photo" })}</Text>
      </Pressable>
      {access.canEdit && <Pressable style={s.menuItem} onPress={() => action(onEdit)}>
        <MaterialCommunityIcons name="image-edit-outline" size={18} color="#FFFFFF" style={{ marginRight: 10 }} />
        <Text style={s.menuItemText}>{t("taskHistory.photo.edit", { defaultValue: "Edit photo" })}</Text>
      </Pressable>}
      <Pressable style={s.menuItem} onPress={() => action(onPlantDetails)}>
        <MaterialCommunityIcons name="flower-tulip-outline" size={18} color="#FFFFFF" style={{ marginRight: 10 }} />
        <Text style={s.menuItemText}>{t("taskHistory.menu.goToPlant", { defaultValue: "Plant details" })}</Text>
      </Pressable>
      {access.canEdit && <Pressable style={s.menuItem} onPress={() => action(onDelete)}>
        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF6B6B" style={{ marginRight: 10 }} />
        <Text style={[s.menuItemText, { color: "#FF6B6B" }]}>{t("taskHistory.photo.delete", { defaultValue: "Delete photo" })}</Text>
      </Pressable>}
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  glass: { borderRadius: 28, overflow: "hidden" },
  // Half the old 1.6-aspect photo height; text may grow the area when needed.
  hero: { justifyContent: "center" },
  photoSurface: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  heroContent: { flexGrow: 1, flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingVertical: 14, alignItems: "flex-end" },
  topScrim: { position: "absolute", top: 0, left: 0, right: 0, height: 64 },
  added: { flex: 1, minWidth: 0, alignItems: "flex-end", alignSelf: "flex-start" },
  photoShortcut: { position: "absolute", top: 14, left: 12, width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  identity: { flex: 1, minWidth: 0, gap: 4, paddingTop: 40 },
  notes: { paddingHorizontal: 20, paddingBottom: 16 },
});

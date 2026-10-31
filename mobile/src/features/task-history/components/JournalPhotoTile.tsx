import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../../app/providers/SettingsProvider";
import { usePlantPhoto } from "../../../shared/hooks/usePlantPhoto";
import FramedPlantImage from "../../../shared/ui/FramedPlantImage";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import SharedPlantBadge from "../../../shared/ui/SharedPlantBadge";
import { plantAccess, SHARED_PLANT_TINT } from "../../../shared/utils/plantAccess";
import type { JournalPhotoItem } from "../types/task-history.types";
import { s } from "../styles/task-history.styles";

export default function JournalPhotoTile({ item, isMenuOpen, onToggleMenu, onEdit, onPlantDetails, onDelete }: {
  item: JournalPhotoItem; isMenuOpen: boolean; onToggleMenu: () => void;
  onEdit: () => void; onPlantDetails: () => void; onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const photo = usePlantPhoto(item.photo, { variant: "display", expiresAt: item.access?.expires_at });
  const access = plantAccess(item.access);
  const date = (value: string) => {
    const dt = new Date(value.length === 10 ? value + "T12:00:00" : value);
    return (settings.dateFormat || "DD.MM.YYYY").replace("YYYY", String(dt.getFullYear()))
      .replace("MM", String(dt.getMonth() + 1).padStart(2, "0")).replace("DD", String(dt.getDate()).padStart(2, "0"));
  };
  const created = new Date(item.createdAt);
  const timestamp = `${date(item.createdAt)} ${String(created.getHours()).padStart(2, "0")}:${String(created.getMinutes()).padStart(2, "0")}`;
  const action = (callback: () => void) => { onToggleMenu(); callback(); };
  return <View style={[s.cardWrap, isMenuOpen && s.cardWrapRaised]}>
    <View style={styles.glass}>
      <LinearGradient colors={["rgba(63,110,97,0.9)", "rgba(35,65,56,0.94)"]} style={StyleSheet.absoluteFill} />
      {access.isShared && <View style={[StyleSheet.absoluteFill, { backgroundColor: SHARED_PLANT_TINT }]} />}
      <Pressable onPress={onToggleMenu} accessibilityRole="button" accessibilityLabel={item.plant}>
        <View style={styles.hero}>
          {photo.uri ? <FramedPlantImage uri={photo.uri} photo={item.photo} style={StyleSheet.absoluteFill} onError={photo.refresh} />
            : photo.loading ? <CenteredSpinner size={30} />
            : <MaterialCommunityIcons name="image-off-outline" size={32} color="rgba(255,255,255,0.65)" />}
          <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0.15)", "rgba(37,70,59,0.1)", "rgba(42,76,65,1)"]}
            locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.added}>
            <Text style={styles.meta}>{t("taskHistory.photo.added", { defaultValue: "Added" })}</Text>
            <Text style={styles.meta}>{timestamp}</Text>
          </View>
          <View style={styles.identity}>
            <Text style={styles.name}>{item.plant}</Text>
            {!!item.location && <View style={styles.location}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color="#FFFFFF" />
              <Text style={styles.text}>{item.location}</Text>
            </View>}
            {access.isShared && <SharedPlantBadge access={item.access} compact />}
          </View>
        </View>
        {(!!item.recordedDate || !!item.note?.trim()) && <View style={styles.notes}>
          {!!item.recordedDate && <Text style={styles.meta}>{t("taskHistory.photo.photoTaken", { defaultValue: "Photo date" })}: {date(item.recordedDate)}</Text>}
          {!!item.note?.trim() && <Text style={styles.text}>{item.note}</Text>}
        </View>}
      </Pressable>
    </View>
    {isMenuOpen && <View style={s.menuSheet}>
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
  hero: { aspectRatio: 1.6, justifyContent: "center", alignItems: "center" },
  added: { position: "absolute", top: 16, right: 16, alignItems: "flex-end" },
  identity: { position: "absolute", bottom: 14, left: 18, right: 18, gap: 4 },
  name: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  location: { flexDirection: "row", alignItems: "center", gap: 5 },
  text: { color: "#FFFFFF", fontSize: 14, lineHeight: 21 },
  meta: { color: "rgba(255,255,255,0.85)", fontSize: 11, lineHeight: 17 },
  notes: { paddingHorizontal: 18, paddingBottom: 18, gap: 6 },
});

import React, { useCallback } from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function PlantDefinitionModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return (isMissing ? undefined : txt) || fallback || key.split(".").pop() || key;
    },
    [t, currentLanguage]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <MaterialCommunityIcons name="book-open-variant" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.title}>{tr("plantDetailsModals.definition.title", "Plant definition")}</Text>
          </View>

          <Text style={styles.body}>
            {tr(
              "plantDetailsModals.definition.body",
              "This is a placeholder modal. Plant definition details will be implemented later."
            )}
          </Text>

          <Pressable onPress={onClose} style={styles.btn} android_ripple={{ color: "rgba(255,255,255,0.12)" }}>
            <Text style={styles.btnText}>{tr("plantDetailsModals.common.close", "Close")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    backgroundColor: "rgba(30,30,30,0.92)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
    padding: 16,
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  title: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  body: { color: "rgba(255,255,255,0.92)", fontWeight: "600", lineHeight: 20 },
  btn: {
    marginTop: 14,
    alignSelf: "flex-end",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  btnText: { color: "#FFFFFF", fontWeight: "800" },
});

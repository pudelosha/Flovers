import React, { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import AppModalHost from "../../../../shared/ui/AppModalHost";
import { useTranslation } from "react-i18next";
import ContactModalFrame from "../../../sharing/components/ContactModalFrame";
import CenteredSpinner from "../../../../shared/ui/CenteredSpinner";
import { usePlantPhoto } from "../../../../shared/hooks/usePlantPhoto";
import { fetchJournalPhoto } from "../../../../api/services/journal-photos.service";
import type { JournalPhotoItem } from "../../types/task-history.types";

/** The authorized full photo, without the tile's crop or decorative gradient. */
export default function ViewJournalPhotoModal({ visible, entry, onClose }: {
  visible: boolean; entry: JournalPhotoItem | null; onClose: () => void;
}) {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState<{ context: string; entry: JournalPhotoItem } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [readyUri, setReadyUri] = useState<string | null>(null);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  // A new opening must not reveal metadata or bytes retained by a previous one.
  const opening = useRef({ visible, id: entry?.id, sequence: 0 });
  if (opening.current.visible !== visible || opening.current.id !== entry?.id) {
    opening.current = { visible, id: entry?.id, sequence: opening.current.sequence + 1 };
  }
  const context = `${opening.current.sequence}:${entry?.id ?? "none"}:${retry}`;
  const current = loaded?.context === context ? loaded.entry : null;
  const photo = usePlantPhoto(visible ? current?.photo : null, { variant: "display", expiresAt: current?.access?.expires_at });

  useEffect(() => {
    if (!visible || !entry) return;
    let active = true;
    setLoadError(null); setReadyUri(null); setFailedUri(null);
    fetchJournalPhoto(entry.id).then(fresh => {
      if (active) setLoaded({ context, entry: fresh });
    }).catch(() => { if (active) setLoadError(context); });
    return () => { active = false; };
  }, [visible, entry?.id, context]);

  if (!visible || !entry) return null;
  const expired = !!current?.access?.expires_at && Date.parse(current.access.expires_at) <= Date.now();
  const error = loadError === context || expired || !!photo.error || (!!photo.uri && failedUri === photo.uri);
  return <AppModalHost>
    <ContactModalFrame visible title={String(t("taskHistory.photo.viewTitle", { defaultValue: "Photo" }))}
      onClose={onClose} fullScreen>
      <View style={styles.content}>
        {current && <Text style={styles.name}>{current.plant}</Text>}
        <View style={styles.imagePane}>
          {error ? <View style={styles.error}>
            <Text style={styles.errorText}>{t("taskHistory.photo.loadFailed", { defaultValue: "Could not load the photo details. Please try again." })}</Text>
            <Pressable style={styles.button} onPress={() => { photo.refresh(); setRetry(value => value + 1); }}>
              <Text style={styles.buttonText}>{t("taskHistory.photo.retry", { defaultValue: "Try again" })}</Text>
            </Pressable>
          </View> : <>
            {!!photo.uri && <Image testID="journal-full-photo" accessibilityLabel={current?.plant ?? entry.plant}
              source={{ uri: photo.uri }} resizeMode="contain"
              style={[StyleSheet.absoluteFill, { opacity: readyUri === photo.uri ? 1 : 0 }]}
              onLoad={() => setReadyUri(photo.uri)} onError={() => setFailedUri(photo.uri)} />}
            {(!photo.uri || readyUri !== photo.uri) && <CenteredSpinner size={42} />}
          </>}
        </View>
        <Pressable accessibilityRole="button" style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>{t("taskHistory.photo.close", { defaultValue: "Close" })}</Text>
        </Pressable>
      </View>
    </ContactModalFrame>
  </AppModalHost>;
}
const styles = StyleSheet.create({
  content: { flex: 1, marginHorizontal: 16, gap: 14 },
  name: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  imagePane: { flex: 1, minHeight: 160, width: "100%", alignItems: "stretch", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.16)", borderRadius: 16, overflow: "hidden" },
  error: { padding: 18, gap: 16 }, errorText: { color: "#FFAAAA", fontSize: 14, lineHeight: 21 },
  button: { minHeight: 44, justifyContent: "center", alignItems: "center", padding: 12, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.17)" },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "@react-native-community/blur";
import { useAuth } from "../../auth/useAuth";

// Try to use react-native-linear-gradient if installed; otherwise fall back to a plain View
let LinearGradientView: any = View;
try {
  LinearGradientView = require("react-native-linear-gradient").default;
} catch {}

type TabKey = "account" | "notifications" | "settings";
type PromptKey = "email" | "password" | "delete" | null;

// Header gradient (same vibe as Home)
const HEADER_GRADIENT_TINT = ["rgba(5,31,24,0.70)", "rgba(16,80,63,0.70)"];
const HEADER_SOLID_FALLBACK = "rgba(10,51,40,0.70)";

function formatDate(d?: string | Date | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>("account");
  const [prompt, setPrompt] = useState<PromptKey>(null);

  const tabs = useMemo(
    () => [
      { key: "account" as const, label: "account", icon: "account-circle-outline" },
      { key: "notifications" as const, label: "notifications", icon: "bell-outline" },
      { key: "settings" as const, label: "settings", icon: "cog-outline" },
    ],
    []
  );

  return (
    <View style={{ flex: 1 }}>
      {/* HEADER */}
      <LinearGradientView
        colors={HEADER_GRADIENT_TINT}
        locations={[0, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[s.headerBar, { paddingTop: insets.top + 10, backgroundColor: HEADER_SOLID_FALLBACK }]}
      >
        <View style={s.headerTopRow}>
          <Text style={s.headerTitle}>Profile</Text>
          {/* no QR button on Profile */}
          <View style={{ width: 36, height: 36 }} />
        </View>
        <View style={s.separator} />

        {/* Submenu */}
        <View style={s.subRow}>
          <View style={s.subColLeft}>
            <Pressable style={s.subBtn} onPress={() => setTab("account")} hitSlop={8}>
              <View style={s.subBtnInner}>
                <Text style={[s.subBtnText, tab === "account" && s.subActive]}>account</Text>
                <MaterialCommunityIcons name="account-circle-outline" size={14} color="#FFFFFF" style={s.subIcon} />
              </View>
            </Pressable>
          </View>

          <View style={s.subColCenter}>
            <Pressable style={s.subBtn} onPress={() => setTab("notifications")} hitSlop={8}>
              <View style={s.subBtnInner}>
                <Text style={[s.subBtnText, tab === "notifications" && s.subActive]}>notifications</Text>
                <MaterialCommunityIcons name="bell-outline" size={14} color="#FFFFFF" style={s.subIcon} />
              </View>
            </Pressable>
          </View>

          <View style={s.subColRight}>
            <Pressable style={s.subBtn} onPress={() => setTab("settings")} hitSlop={8}>
              <View style={s.subBtnInner}>
                <Text style={[s.subBtnText, tab === "settings" && s.subActive]}>settings</Text>
                <MaterialCommunityIcons name="cog-outline" size={14} color="#FFFFFF" style={s.subIcon} />
              </View>
            </Pressable>
          </View>
        </View>
      </LinearGradientView>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={s.content}>
        {tab === "account" && (
          <View style={s.cardWrap}>
            <View style={s.cardGlass}>
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="light"
                blurAmount={10}
                reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
              />
              {/* Match Login input glass: 12% white */}
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.12)" }]} />
            </View>

            <View style={s.cardInner}>
              <Text style={s.cardTitle}>Account</Text>

              <View style={s.row}>
                <Text style={s.rowLabel}>Email</Text>
                <Text style={s.rowValue}>{user?.email || "—"}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.rowLabel}>Created</Text>
                <Text style={s.rowValue}>{formatDate((user as any)?.date_joined)}</Text>
              </View>

              <View style={{ height: 12 }} />

              {/* FULL-WIDTH ACTION BUTTONS */}
              <Pressable style={[s.actionBtnFull, s.actionPrimary]} onPress={() => setPrompt("email")}>
                <MaterialCommunityIcons name="email-edit-outline" size={18} color="#FFFFFF" />
                <Text style={[s.actionBtnFullText, { color: "#FFFFFF" }]}>Change email</Text>
              </Pressable>

              <Pressable style={[s.actionBtnFull, s.actionPrimary]} onPress={() => setPrompt("password")}>
                <MaterialCommunityIcons name="key-outline" size={18} color="#FFFFFF" />
                <Text style={[s.actionBtnFullText, { color: "#FFFFFF" }]}>Change password</Text>
              </Pressable>

              <Pressable style={[s.actionBtnFull, s.dangerFull]} onPress={() => setPrompt("delete")}>
                <MaterialCommunityIcons name="account-remove-outline" size={18} color="#FF6B6B" />
                <Text style={[s.actionBtnFullText, { color: "#FF6B6B" }]}>Delete account</Text>
              </Pressable>

              {/* FULL-WIDTH LOG OUT (now 100%) */}
              <Pressable style={[s.actionBtnFull, s.secondaryFull]} onPress={logout}>
                <MaterialCommunityIcons name="logout" size={18} color="#FFFFFF" />
                <Text style={[s.actionBtnFullText, { color: "#FFFFFF" }]}>Log out</Text>
              </Pressable>
            </View>
          </View>
        )}

        {tab === "notifications" && (
          <View style={s.cardWrap}>
            <View style={s.cardGlass}>
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="light"
                blurAmount={10}
                reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
              />
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.12)" }]} />
            </View>

            <View style={s.cardInner}>
              <Text style={s.cardTitle}>Notifications</Text>
              <Text style={s.placeholderText}>Notification settings will live here.</Text>
            </View>
          </View>
        )}

        {tab === "settings" && (
          <View style={s.cardWrap}>
            <View style={s.cardGlass}>
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="light"
                blurAmount={10}
                reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
              />
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.12)" }]} />
            </View>

            <View style={s.cardInner}>
              <Text style={s.cardTitle}>Settings</Text>
              <Text style={s.placeholderText}>General app preferences will be implemented here.</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* PROMPTS (layout only) */}
      {prompt && (
        <>
          <Pressable style={s.backdrop} onPress={() => setPrompt(null)} />
          <View style={s.promptWrap}>
            <View style={s.promptGlass}>
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="light"
                blurAmount={14}
                reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
              />
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.35)" }]} />
            </View>

            {prompt === "email" && (
              <View style={s.promptInner}>
                <Text style={s.promptTitle}>Change email</Text>
                <TextInput style={s.input} placeholder="New email" placeholderTextColor="rgba(255,255,255,0.7)" />
                <TextInput
                  style={s.input}
                  placeholder="Current password"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  secureTextEntry
                />
                <View style={s.promptButtonsRow}>
                  <Pressable style={s.promptBtn} onPress={() => setPrompt(null)}>
                    <Text style={s.promptBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[s.promptBtn, s.promptPrimary]}>
                    <Text style={[s.promptBtnText, s.promptPrimaryText]}>Change</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {prompt === "password" && (
              <View style={s.promptInner}>
                <Text style={s.promptTitle}>Change password</Text>
                <TextInput
                  style={s.input}
                  placeholder="Current password"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  secureTextEntry
                />
                <TextInput
                  style={s.input}
                  placeholder="New password"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  secureTextEntry
                />
                <TextInput
                  style={s.input}
                  placeholder="Confirm new password"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  secureTextEntry
                />
                <View style={s.promptButtonsRow}>
                  <Pressable style={s.promptBtn} onPress={() => setPrompt(null)}>
                    <Text style={s.promptBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[s.promptBtn, s.promptPrimary]}>
                    <Text style={[s.promptBtnText, s.promptPrimaryText]}>Update</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {prompt === "delete" && (
              <View style={s.promptInner}>
                <Text style={s.promptTitle}>Delete account</Text>
                <Text style={s.warningText}>
                  This action is irreversible. If you proceed, your account and data will be permanently deleted.
                </Text>
                <TextInput
                  style={s.input}
                  placeholder="Enter password to confirm"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  secureTextEntry
                />
                <View style={s.promptButtonsRow}>
                  <Pressable style={s.promptBtn} onPress={() => setPrompt(null)}>
                    <Text style={s.promptBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[s.promptBtn, s.promptDanger]}>
                    <Text style={[s.promptBtnText, s.promptDangerText]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  // header
  headerBar: {
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.3 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.7)" },

  // submenu
  subRow: { flexDirection: "row", alignItems: "center", paddingTop: 8 },
  subColLeft: { flex: 1, alignItems: "flex-start" },
  subColCenter: { flex: 1, alignItems: "center" },
  subColRight: { flex: 1, alignItems: "flex-end" },
  subBtn: { paddingVertical: 6, paddingHorizontal: 2 },
  subBtnInner: { flexDirection: "row", alignItems: "center" },
  subBtnText: { color: "#FFFFFF", fontWeight: "700", letterSpacing: 0.2, textTransform: "lowercase" },
  subIcon: { marginLeft: 6 },
  subActive: { textDecorationLine: "underline" },

  // content
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 16 },

  // cards — tuned to match Login (0.12 bg, 0.28 border)
  cardWrap: { minHeight: 140, borderRadius: 18, position: "relative" },
  cardGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  cardInner: { padding: 16 },
  cardTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginBottom: 12 },

  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  rowLabel: { color: "rgba(255,255,255,0.9)", fontWeight: "700" },
  rowValue: { color: "#FFFFFF", fontWeight: "800" },

  // FULL-WIDTH ACTION BUTTONS (match glossy controls)
  actionBtnFull: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  actionBtnFullText: { fontWeight: "800" },
  actionPrimary: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  secondaryFull: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  dangerFull: {
    backgroundColor: "rgba(255,107,107,0.12)",
    borderColor: "rgba(255,107,107,0.35)",
  },

  placeholderText: { color: "rgba(255,255,255,0.92)", fontWeight: "600" },

  // prompts
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 20,
  },
  promptWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 21,
    paddingHorizontal: 24,
  },
  promptGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
  },
  promptInner: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
  },
  promptTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  // Inputs: same transparent white as Login (0.12), same border (0.28)
  input: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  promptButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 6,
  },
  promptBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  promptBtnText: { color: "#FFFFFF", fontWeight: "800" },
  promptPrimary: {
    backgroundColor: "rgba(11,114,133,0.9)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  promptPrimaryText: { color: "#FFFFFF", fontWeight: "800" },
  promptDanger: {
    backgroundColor: "rgba(255,107,107,0.2)",
    borderColor: "rgba(255,107,107,0.45)",
  },
  promptDangerText: { color: "#FF6B6B", fontWeight: "800" },
  warningText: {
    color: "rgba(255,255,255,0.95)",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
});

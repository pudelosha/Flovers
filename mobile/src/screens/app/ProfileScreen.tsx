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

  // --- Notifications state (defaults) ---
  const [emailDaily, setEmailDaily] = useState(true);
  const [emailHour, setEmailHour] = useState(12);
  const [email24h, setEmail24h] = useState(false);

  const [pushDaily, setPushDaily] = useState(true);
  const [pushHour, setPushHour] = useState(12);
  const [push24h, setPush24h] = useState(false);

  // hour helpers (service runs hourly → +/-1 hour, wrap 0–23)
  const formatHour = (h: number) => `${String(h).padStart(2, "0")}:00`;
  const incHour = (h: number) => (h + 1) % 24;
  const decHour = (h: number) => (h + 23) % 24;

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
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 80 }]}>
        {/* ACCOUNT CARD */}
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

        {/* NOTIFICATIONS CARD */}
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

              {/* EMAIL SECTION */}
              <Text style={[s.sectionTitle, s.sectionTitleFirst]}>Email</Text>

              <Pressable
                style={s.toggleRow}
                onPress={() => setEmailDaily(v => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: emailDaily }}
              >
                <MaterialCommunityIcons
                  name={emailDaily ? "checkbox-marked-outline" : "checkbox-blank-outline"}
                  size={20}
                  color="#FFFFFF"
                  style={s.toggleIcon}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>Daily summary for today’s due tasks</Text>
                  <Text style={s.toggleHint}>
                    One email per day summarizing all tasks due today.
                  </Text>
                </View>
              </Pressable>

              {/* Time stepper (visible only if daily email is on) */}
              {emailDaily && (
                <View style={s.stepperRow}>
                  <Text style={s.stepperLabel}>Send at</Text>
                  <View style={s.stepper}>
                    <Pressable
                      onPress={() => setEmailHour(h => decHour(h))}
                      style={s.stepBtn}
                      android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true }}
                    >
                      <MaterialCommunityIcons name="minus" size={16} color="#FFFFFF" />
                    </Pressable>
                    <Text style={s.stepTime}>{formatHour(emailHour)}</Text>
                    <Pressable
                      onPress={() => setEmailHour(h => incHour(h))}
                      style={s.stepBtn}
                      android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true }}
                    >
                      <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </View>
              )}

              <Pressable
                style={s.toggleRow}
                onPress={() => setEmail24h(v => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: email24h }}
              >
                <MaterialCommunityIcons
                  name={email24h ? "checkbox-marked-outline" : "checkbox-blank-outline"}
                  size={20}
                  color="#FFFFFF"
                  style={s.toggleIcon}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>Send a reminder after 24 hours</Text>
                  <Text style={s.toggleHint}>
                    If tasks due today remain incomplete, send a follow-up email tomorrow.
                  </Text>
                </View>
              </Pressable>

              <View style={s.sectionDivider} />

              {/* MOBILE (PUSH/TOASTS) SECTION */}
              <Text style={s.sectionTitle}>Mobile</Text>

              <Pressable
                style={s.toggleRow}
                onPress={() => setPushDaily(v => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: pushDaily }}
              >
                <MaterialCommunityIcons
                  name={pushDaily ? "checkbox-marked-outline" : "checkbox-blank-outline"}
                  size={20}
                  color="#FFFFFF"
                  style={s.toggleIcon}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>Daily phone notification</Text>
                  <Text style={s.toggleHint}>
                    A single system notification summarizing today’s due tasks.
                  </Text>
                </View>
              </Pressable>

              {pushDaily && (
                <View style={s.stepperRow}>
                  <Text style={s.stepperLabel}>Notify at</Text>
                  <View style={s.stepper}>
                    <Pressable
                      onPress={() => setPushHour(h => decHour(h))}
                      style={s.stepBtn}
                      android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true }}
                    >
                      <MaterialCommunityIcons name="minus" size={16} color="#FFFFFF" />
                    </Pressable>
                    <Text style={s.stepTime}>{formatHour(pushHour)}</Text>
                    <Pressable
                      onPress={() => setPushHour(h => incHour(h))}
                      style={s.stepBtn}
                      android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true }}
                    >
                      <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </View>
              )}

              <Pressable
                style={s.toggleRow}
                onPress={() => setPush24h(v => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: push24h }}
              >
                <MaterialCommunityIcons
                  name={push24h ? "checkbox-marked-outline" : "checkbox-blank-outline"}
                  size={20}
                  color="#FFFFFF"
                  style={s.toggleIcon}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>24-hour follow-up notification</Text>
                  <Text style={s.toggleHint}>
                    If tasks stay pending, send a notification the next day.
                  </Text>
                </View>
              </Pressable>

              {/* SAVE BUTTON (frame bottom) */}
              <Pressable
                style={[s.saveBtn]}
                onPress={() => {/* TODO: wire up save later */}}
              >
                <MaterialCommunityIcons name="content-save" size={18} color="#FFFFFF" />
                <Text style={s.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* SETTINGS CARD */}
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

  // --- Notifications styles ---
  sectionTitleFirst: { marginTop: 0 },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 6,
    marginBottom: 8,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginVertical: 10,
  },

  toggleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
  },
  toggleIcon: { marginTop: 2 },
  toggleLabel: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  toggleHint: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "200",
    marginTop: 2,
    lineHeight: 18,
  },

  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  stepperLabel: { color: "#FFFFFF", fontWeight: "700" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  stepTime: {
    minWidth: 64,
    textAlign: "center",
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },

  // Save button (full-width within the notifications frame)
  saveBtn: {
    marginTop: 12,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(11,114,133,0.9)",
    borderWidth: 0,
    borderColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});

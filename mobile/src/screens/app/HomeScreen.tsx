import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ListRenderItemInfo,
  FlatList as RNFlatList,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { BlurView } from "@react-native-community/blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Try to use react-native-linear-gradient if installed; otherwise fall back to a plain View
let LinearGradientView: any = View;
try {
  LinearGradientView = require("react-native-linear-gradient").default;
} catch {}

type TaskType = "watering" | "moisture" | "fertilising" | "care";

type Task = {
  id: string;
  type: TaskType;
  plant: string;
  location: string;
  due: string;       // e.g. "Today"
  dueDate: Date;     // exact date
};

const accent: Record<TaskType, string> = {
  watering: "#4dabf7",
  moisture: "#20c997",
  fertilising: "#ffd43b",
  care: "#e599f7",
};

const iconByType: Record<TaskType, string> = {
  watering: "water",
  moisture: "water-percent",
  fertilising: "leaf",
  care: "flower",
};

const TILE_BLUR = 8;

// Header: semi-transparent horizontal dark-green gradient (header ONLY)
const HEADER_GRADIENT_TINT = ["rgba(5,31,24,0.70)", "rgba(16,80,63,0.70)"];
const HEADER_SOLID_FALLBACK = "rgba(10,51,40,0.70)";

export default function HomeScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const tasks: Task[] = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => {
        const types: TaskType[] = ["watering", "moisture", "fertilising", "care"];
        const t = types[i % types.length];
        return {
          id: String(i + 1),
          type: t,
          plant: ["Big Awesome Monstera", "Ficus", "Aloe Vera", "Orchid"][i % 4],
          location: ["Living Room", "Bedroom", "Kitchen", "Office"][i % 4],
          due: ["Today", "Tomorrow", "3 days", "Next week"][i % 4],
          dueDate: addDays(new Date(2025, 9, 6), i % 4),
        };
      }),
    []
  );

  const onToggleMenu = (id: string) => {
    setMenuOpenId((curr) => (curr === id ? null : id));
  };

  const renderTask = ({ item }: ListRenderItemInfo<Task>) => {
    const a = accent[item.type as TaskType];
    const icon = iconByType[item.type as TaskType];
    const isMenuOpen = menuOpenId === item.id;

    return (
      <View style={s.cardWrap}>
        {/* Inner glass container clips blur & tint to rounded corners */}
        <View style={s.cardGlass}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={TILE_BLUR}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(a, 0.10) }]} pointerEvents="none" />
        </View>

        {/* Content row sits above the glass */}
        <View style={s.cardRow}>
          {/* Left: action icon + caption */}
          <View style={s.leftCol}>
            <View style={[s.leftIconBubble, { backgroundColor: hexToRgba("#000", 0.15) }]}>
              <MaterialCommunityIcons name={icon} size={20} color={a} />
            </View>
            <Text style={[s.leftCaption, { color: a }]}>{item.type.toUpperCase()}</Text>
          </View>

          {/* Center: title, location, due line */}
          <View style={s.centerCol}>
            <Text style={s.plantName} numberOfLines={1}>{item.plant}</Text>
            <Text style={s.location} numberOfLines={1}>{item.location}</Text>
            <View style={s.dueRow}>
              <Text style={s.dueWhen}>{item.due}</Text>
              <Text style={s.dueDateText}>{formatDate(item.dueDate)}</Text>
            </View>
          </View>

          {/* Right: menu button */}
          <View style={s.rightCol}>
            <Pressable
              onPress={() => onToggleMenu(item.id)}
              style={s.menuBtn}
              android_ripple={{ color: "rgba(255,255,255,0.16)", borderless: true }}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="dots-horizontal" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Floating menu (above the tile) */}
        {isMenuOpen && (
          <View style={s.menuSheet}>
            <MenuItem label="Mark as complete" icon="check-circle-outline" />
            <MenuItem label="Edit reminder" icon="calendar-edit" />
            <MenuItem label="Go to plant" icon="leaf" />
            <MenuItem label="Delete" icon="trash-can-outline" danger />
          </View>
        )}
      </View>
    );
  };

  // Header bar ONLY: gradient background
  const HeaderStatic: React.FC = () => (
    <LinearGradientView
      colors={HEADER_GRADIENT_TINT}
      locations={[0, 1]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[s.headerBar, { paddingTop: insets.top + 10, backgroundColor: HEADER_SOLID_FALLBACK }]}
    >
      <View style={s.headerTopRow}>
        <Text style={s.headerTitle}>Home</Text>
        <Pressable
          onPress={() => nav.navigate("Scanner" as never)}
          style={s.scanBtn}
          android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true }}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={s.separator} />

      <View style={s.subRow}>
        <View style={s.subColLeft}>
          <Pressable style={s.subBtn} hitSlop={8}>
            <View style={s.subBtnInner}>
              <Text style={s.subBtnText}>sort</Text>
              <MaterialCommunityIcons name="sort" size={14} color="#FFFFFF" style={s.subIcon} />
            </View>
          </Pressable>
        </View>
        <View style={s.subColCenter}>
          <Pressable style={s.subBtn} hitSlop={8}>
            <View style={s.subBtnInner}>
              <Text style={s.subBtnText}>filter</Text>
              <MaterialCommunityIcons name="filter-variant" size={14} color="#FFFFFF" style={s.subIcon} />
            </View>
          </Pressable>
        </View>
        <View style={s.subColRight}>
          <Pressable style={s.subBtn} hitSlop={8}>
            <View style={s.subBtnInner}>
              <Text style={s.subBtnText}>history</Text>
              <MaterialCommunityIcons name="history" size={14} color="#FFFFFF" style={s.subIcon} />
            </View>
          </Pressable>
        </View>
      </View>
    </LinearGradientView>
  );

  return (
    <View style={{ flex: 1 }}>
      <HeaderStatic />

      {/* Invisible backdrop to close menu when tapping outside */}
      {menuOpenId && (
        <Pressable
          onPress={() => setMenuOpenId(null)}
          style={s.backdrop}
          pointerEvents="auto"
        />
      )}

      <RNFlatList<Task>
        data={tasks}
        keyExtractor={(t) => t.id}
        renderItem={renderTask}
        ListHeaderComponent={() => <View style={{ height: 5 }} />}
        contentContainerStyle={s.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setMenuOpenId(null)}
      />
    </View>
  );
}

/* helpers */
function hexToRgba(hex: string, alpha = 1) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
function formatDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function MenuItem({
  label,
  icon,
  danger,
}: {
  label: string;
  icon: string;
  danger?: boolean;
}) {
  return (
    <Pressable style={s.menuItem}>
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={danger ? "#FF6B6B" : "#FFFFFF"}
        style={{ marginRight: 8 }}
      />
      <Text style={[s.menuItemText, danger && { color: "#FF6B6B" }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // HEADER
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  scanBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.7)",
  },

  // Submenu layout
  subRow: { flexDirection: "row", alignItems: "center", paddingTop: 8 },
  subColLeft: { flex: 1, alignItems: "flex-start" },
  subColCenter: { flex: 1, alignItems: "center" },
  subColRight: { flex: 1, alignItems: "flex-end" },
  subBtn: { paddingVertical: 6, paddingHorizontal: 2 },
  subBtnInner: { flexDirection: "row", alignItems: "center" },
  subBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "lowercase",
  },
  subIcon: { marginLeft: 6 },

  // Backdrop to dismiss menus
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    elevation: 5,
    backgroundColor: "transparent",
  },

  // TASK TILES
  cardWrap: {
    height: 100,
    borderRadius: 18,
    overflow: "visible", // allow floating menu
    position: "relative",
    marginBottom: 0,
  },
  // This inner container clips the blur/tint to the rounded shape
  cardGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  cardRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  // Left column
  leftCol: { width: 64, alignItems: "center", justifyContent: "center" },
  leftIconBubble: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    marginBottom: 6,
  },
  leftCaption: {
    fontSize: 9, letterSpacing: 0.7, fontWeight: "800",
  },

  // Center column
  centerCol: { flex: 1, paddingHorizontal: 6 },
  plantName: { color: "#FFFFFF", fontWeight: "800", fontSize: 17 },
  location: { color: "rgba(255,255,255,0.9)", fontWeight: "600", fontSize: 12, marginTop: 2 },
  dueRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 6 },
  dueWhen: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  dueDateText: { color: "rgba(255,255,255,0.95)", fontWeight: "700", fontSize: 12 },

  // Right column
  rightCol: { width: 56, alignItems: "flex-end", justifyContent: "center" },
  menuBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "transparent", borderWidth: 0,
  },

  // Floating menu (above the tile)
  menuSheet: {
    position: "absolute",
    right: 6,
    top: -6,
    zIndex: 10,
    elevation: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    gap: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  menuItemText: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.2,
    fontSize: 12,
  },
});

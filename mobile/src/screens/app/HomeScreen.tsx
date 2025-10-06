import React, { useMemo } from "react";
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
  due: string;
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

const TILE_BLUR = 8; // 50% of tab/header feel

// Header: semi-transparent horizontal dark-green gradient (header ONLY)
const HEADER_GRADIENT_TINT = ["rgba(5,31,24,0.70)", "rgba(16,80,63,0.70)"];
const HEADER_SOLID_FALLBACK = "rgba(10,51,40,0.70)";

export default function HomeScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  const tasks: Task[] = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => {
        const types: TaskType[] = ["watering", "moisture", "fertilising", "care"];
        const t = types[i % types.length];
        return {
          id: String(i + 1),
          type: t,
          plant: ["Monstera", "Ficus", "Aloe Vera", "Orchid"][i % 4],
          due: ["Today", "Tomorrow", "3 days", "Next week"][i % 4],
        };
      }),
    []
  );

  const renderTask = ({ item }: ListRenderItemInfo<Task>) => {
    const a = accent[item.type as TaskType];
    const icon = iconByType[item.type as TaskType];

    return (
      <View style={s.cardWrap}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={TILE_BLUR}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
        />
        <View style={s.cardContent}>
          <View style={[s.iconBubble, { backgroundColor: hexToRgba("#000", 0.15) }]}>
            <MaterialCommunityIcons name={icon} size={26} color={a} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.plantName}>{item.plant}</Text>
            <Text style={s.taskType}>{capitalize(item.type)}</Text>
          </View>

          <Text style={s.dueText}>{item.due}</Text>
        </View>
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(a, 0.10) }]}
          pointerEvents="none"
        />
      </View>
    );
  };

  // Header bar ONLY: gradient background; no absolute overlays affecting the page
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

      {/* Submenu: left/center/right alignment with small right-side icons */}
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
      <RNFlatList<Task>
        data={tasks}
        keyExtractor={(t) => t.id}
        renderItem={renderTask}
        ListHeaderComponent={() => <View style={{ height: 5 }} />}
        contentContainerStyle={s.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
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

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const s = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // HEADER (only this area gets the gradient)
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

  // Submenu layout: 3 equal columns (left, center, right)
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
  },
  subColLeft: { flex: 1, alignItems: "flex-start" },
  subColCenter: { flex: 1, alignItems: "center" },
  subColRight: { flex: 1, alignItems: "flex-end" },

  // Submenu button styling
  subBtn: { paddingVertical: 6, paddingHorizontal: 2 },
  subBtnInner: { flexDirection: "row", alignItems: "center" },
  subBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "lowercase",
  },
  subIcon: { marginLeft: 6 },

  // TASK TILES
  cardWrap: {
    height: 84,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.15)", // Task tiles colored fog overlay
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 12,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },
  plantName: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 17,
    marginBottom: 2,
  },
  taskType: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  dueText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});

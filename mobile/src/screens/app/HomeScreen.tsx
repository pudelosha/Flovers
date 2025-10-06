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

// Header now uses BlurView with same amount as bottom menu (16).
// Tiles have extra BlurView at 50% of that (8).

type TaskType = "watering" | "moisture" | "fertilising" | "care";

type Task = {
  id: string;
  type: TaskType;
  plant: string;
  due: string;
};

const accent: Record<TaskType, string> = {
  watering: "#4dabf7", // blue
  moisture: "#20c997", // teal
  fertilising: "#ffd43b", // yellow
  care: "#e599f7", // purple
};

const iconByType: Record<TaskType, string> = {
  watering: "water",
  moisture: "water-percent",
  fertilising: "leaf",
  care: "flower",
};

const HEADER_BLUR = 16;
const TILE_BLUR = 8;

export default function HomeScreen() {
  const nav = useNavigation();

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
        {/* Blur layer for tiles (50% of bar/header blur) */}
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
        {/* subtle colored fog on top for depth */}
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(a, 0.12) }]}
          pointerEvents="none"
        />
      </View>
    );
  };

  // Static header (not inside the list, so it won't hide on scroll)
  const HeaderStatic: React.FC = () => (
    <View style={s.headerOuter}>
      <View style={s.headerContainer}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={HEADER_BLUR}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
        />
        <View style={s.headerTopRow}>
          <Text style={s.headerTitle}>Home</Text>
          <Pressable
            onPress={() => nav.navigate("Scanner" as never)}
            style={s.scanBtn}
            android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: true }}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={20} color="#0B7285" />
          </Pressable>
        </View>
        <View style={s.separator} />
        <View style={s.subRow}>
          {["sort", "filter", "history"].map((label) => (
            <Pressable key={label} style={s.subBtn}>
              <Text style={s.subBtnText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <HeaderStatic />
      <RNFlatList<Task>
        data={tasks}
        keyExtractor={(t) => t.id}
        renderItem={renderTask}
        // header is now static; give the list a top spacer to breathe under it
        ListHeaderComponent={() => <View style={{ height: 14 }} />}
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
  headerOuter: {
    marginHorizontal: -16, // full width header to match screen padding
  },
  headerContainer: {
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
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
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingTop: 8,
  },
  subBtn: { paddingVertical: 6 },
  subBtnText: {
    color: "#D97706",
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // task tiles
  cardWrap: {
    height: 84,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.15)",
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

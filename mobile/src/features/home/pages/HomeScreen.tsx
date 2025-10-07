import React, { useMemo, useState } from "react";
import { View, Pressable, FlatList, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import GlassHeader from "../../../shared/ui/GlassHeader";
import { s } from "../styles/home.styles";
import TaskTile from "../components/TaskTile";
import type { Task, TaskType } from "../types/home.types";
import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
} from "../constants/home.constants";

export default function HomeScreen() {
  const nav = useNavigation();
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

  return (
    <View style={{ flex: 1 }}>
      {/* Header (shared) */}
      <GlassHeader
        title="Home"
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        rightIconName="qrcode-scan"
        onPressRight={() => nav.navigate("Scanner" as never)}
      >
        {/* Submenu (3 columns) */}
        <View style={s.subRow3}>
          <View style={s.subColLeft}>
            <Pressable style={s.subBtn} hitSlop={8}>
              <View style={s.subBtnInner}>
                <Text style={s.subBtnText}>sort</Text>
                <MaterialCommunityIcons
                  name="sort"
                  size={14}
                  color="#FFFFFF"
                  style={s.subIcon}
                />
              </View>
            </Pressable>
          </View>

          <View style={s.subColCenter}>
            <Pressable style={s.subBtn} hitSlop={8}>
              <View style={s.subBtnInner}>
                <Text style={s.subBtnText}>filter</Text>
                <MaterialCommunityIcons
                  name="filter-variant"
                  size={14}
                  color="#FFFFFF"
                  style={s.subIcon}
                />
              </View>
            </Pressable>
          </View>

          <View style={s.subColRight}>
            <Pressable style={s.subBtn} hitSlop={8}>
              <View style={s.subBtnInner}>
                <Text style={s.subBtnText}>history</Text>
                <MaterialCommunityIcons
                  name="history"
                  size={14}
                  color="#FFFFFF"
                  style={s.subIcon}
                />
              </View>
            </Pressable>
          </View>
        </View>
      </GlassHeader>

      {/* Invisible backdrop to close menu when tapping outside */}
      {menuOpenId && (
        <Pressable
          onPress={() => setMenuOpenId(null)}
          style={s.backdrop}
          pointerEvents="auto"
        />
      )}

      <FlatList<Task>
        data={tasks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TaskTile
            task={item}
            isMenuOpen={menuOpenId === item.id}
            onToggleMenu={() => onToggleMenu(item.id)}
            onMarkComplete={() => {
              /* TODO: wire service */
            }}
            onEdit={() => {
              /* TODO: wire edit UI */
            }}
            onGoToPlant={() => {
              /* TODO: navigate to plant when ready */
            }}
            onDelete={() => {
              /* TODO: wire service */
            }}
          />
        )}
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
function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

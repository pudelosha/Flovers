// src/features/home/pages/HomeScreen.tsx
import React, { useMemo, useState } from "react";
import { View, Pressable, FlatList, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

import GlassHeader from "../../../shared/ui/GlassHeader";
import FAB from "../../../shared/ui/FAB";
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
      <GlassHeader
        title="Home"
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
        rightIconName="qrcode-scan"
        onPressRight={() => nav.navigate("Scanner" as never)}
      />

      {menuOpenId && (
        <Pressable
          onPress={() => setMenuOpenId(null)}
          style={s.backdrop}
          pointerEvents="auto"
        />
      )}

      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }: { item: Task }) => (
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
        ListFooterComponent={() => <View style={{ height: 140 }} />}  // keeps last tile visible
        contentContainerStyle={[s.listContent, { paddingBottom: 80 }]}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setMenuOpenId(null)}
      />

      <FAB
        icon="plus"
        actions={[
          { key: "sort", label: "sort", icon: "sort", onPress: () => {/* open sort */} },
          { key: "filter", label: "filter", icon: "filter-variant", onPress: () => {/* open filter */} },
          { key: "history", label: "history", icon: "history", onPress: () => {/* open history */} },
        ]}
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

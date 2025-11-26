import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { s } from "../styles/task-history.styles";

type Props = {
  plantIdFilter?: string;
};

export default function TaskHistoryEmptyState({ plantIdFilter }: Props) {
  return (
    <View
      style={{
        borderRadius: 28,
        overflow: "hidden",
        minHeight: 140,
      }}
    >
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="light"
        blurAmount={20}
        overlayColor="transparent"
        reducedTransparencyFallbackColor="transparent"
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(255,255,255,0.20)" },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: 28,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.20)",
          },
        ]}
      />
      <View style={s.emptyInner}>
        <MaterialCommunityIcons
          name="history"
          size={26}
          color="#FFFFFF"
          style={{ marginBottom: 10 }}
        />
        <Text style={s.emptyTitle}>No completed tasks yet</Text>
        <View style={s.emptyDescBox}>
          <Text style={s.emptyText}>
            This screen shows{" "}
            <Text style={s.inlineBold}>closed reminder tasks</Text> from
            your Home page (pending tasks are not shown).
            {"\n\n"}
            {plantIdFilter
              ? `Currently filtered to plant id ${plantIdFilter}.`
              : "Open it from a specific task to see history just for that plant."}
          </Text>
        </View>
      </View>
    </View>
  );
}

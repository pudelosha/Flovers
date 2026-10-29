import React from "react";
import { StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";
import { s } from "../../home/styles/home.styles";

export default function SharedPlantsEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View testID="shared-plants-empty" style={s.emptyWrap}>
      <View style={s.emptyGlass}>
        <LinearGradient pointerEvents="none" start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          colors={["rgba(16, 80, 63, 0.9)", "rgba(5, 31, 24, 0.9)"]} locations={[0, 1]} style={StyleSheet.absoluteFill} />
        <LinearGradient pointerEvents="none" start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          colors={["rgba(255, 255, 255, 0.06)", "rgba(255, 255, 255, 0.02)", "rgba(255, 255, 255, 0.08)"]}
          locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={s.emptyTint} />
        <View pointerEvents="none" style={s.emptyBorder} />
        <View style={s.emptyInner}>
          <MaterialCommunityIcons name="share-variant-outline" size={26} color="#FFFFFF" style={{ marginBottom: 10 }} />
          <Text style={s.emptyTitle}>{title}</Text>
          <View style={s.emptyDescBox}><Text style={s.emptyText}>{body}</Text></View>
        </View>
      </View>
    </View>
  );
}

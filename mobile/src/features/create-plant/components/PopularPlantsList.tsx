// src/features/create-plant/components/PopularPlantsList.tsx
import React from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import GlassCard from "../../profile/components/GlassCard";
import { TRAIT_ICON_BY_KEY } from "../constants/create-plant.constants";
import type { PlantOption } from "../types/create-plant.types";

export default function PopularPlantsList({
  items,
  selectedId,
  onSelect,
}: {
  items: PlantOption[];
  selectedId?: string;
  onSelect: (p: PlantOption) => void;
}) {
  return (
    <FlatList
      data={items}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => (
        <PlantRow
          plant={item}
          active={selectedId === item.id}
          onPress={() => onSelect(item)}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    />
  );
}

function PlantRow({
  plant,
  active,
  onPress,
}: {
  plant: PlantOption;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <GlassCard>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Image
            source={{ uri: plant.imageUrl || "https://picsum.photos/seed/plant/120/120" }}
            style={{ width: 56, height: 56, borderRadius: 12 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 16 }} numberOfLines={1}>
              {plant.name}
            </Text>
            {!!plant.latin && (
              <Text
                style={{
                  color: "rgba(255,255,255,0.92)",
                  fontWeight: "700",
                  fontSize: 12,
                  fontStyle: "italic",
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {plant.latin}
              </Text>
            )}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              {(plant.traits ?? []).slice(0, 4).map((t) => {
                const icon = TRAIT_ICON_BY_KEY[t] || "leaf";
                return <MaterialCommunityIcons key={t} name={icon} size={16} color="#FFFFFF" />;
              })}
            </View>
          </View>

          {active && <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />}
        </View>
      </GlassCard>
    </Pressable>
  );
}

import React from "react";
import { View, Text } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/task-history.styles";
import type { TaskHistoryItem } from "../types/task-history.types";
import { ACCENT_BY_TYPE, ICON_BY_TYPE } from "../../home/constants/home.constants";
import type { TaskType } from "../../home/types/home.types";

type Props = {
  item: TaskHistoryItem;
};

export default function TaskHistoryTile({ item }: Props) {
  const type = item.type as TaskType;
  const accent = ACCENT_BY_TYPE[type];
  const icon = ICON_BY_TYPE[type];

  return (
    <View style={s.cardWrap}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={accent}
          style={{ marginRight: 8 }}
        />
        <Text style={s.plantName} numberOfLines={1}>
          {item.plant}
        </Text>
      </View>

      {item.location ? (
        <Text style={s.line} numberOfLines={1}>
          {item.location}
        </Text>
      ) : null}

      <Text style={s.tag}>
        {String(item.type).toUpperCase()} • Completed {item.completedAt}
      </Text>
    </View>
  );
}

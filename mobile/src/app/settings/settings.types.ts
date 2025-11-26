import type {
  LangCode,
  FabPosition,
  BackgroundKey,
  TileMotive,
} from "../../features/profile/types/profile.types";

export type AppSettings = {
  language: LangCode;
  dateFormat: string;

  temperatureUnit: "C" | "F" | "K";
  measureUnit: "metric" | "imperial";

  tileTransparency: number; // 0..0.6 in UI
  tileMotive: TileMotive;   // "light" | "dark"

  background: BackgroundKey; // "bg1" | "bg2" | "bg3" | "bg4"
  fabPosition: FabPosition;  // "left" | "right"
};

import type {
  LangCode,
  FabPosition,
  BackgroundKey,
  ThemeMode,
  TileMotive,
} from "../../features/profile/types/profile.types";

export type AppSettings = {
  language: LangCode;
  dateFormat: string;

  temperatureUnit: "C" | "F" | "K";
  measureUnit: "metric" | "imperial";

  tileTransparency: number; // 0..0.6 in UI
  tileMotive: TileMotive;   // "light" | "dark"

  theme: ThemeMode;
  background: BackgroundKey; // compatibility: signed-in Dark always uses bg5
  fabPosition: FabPosition;  // "left" | "right"
};

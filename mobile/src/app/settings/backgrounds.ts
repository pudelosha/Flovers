export type BackgroundKey = "bg1" | "bg2" | "bg3" | "bg4" | "bg5";

export const BACKGROUNDS: Record<BackgroundKey, any> = {
  bg1: require("../../../assets/bg-leaves1.jpg"),
  bg2: require("../../../assets/bg-leaves2.jpg"),
  bg3: require("../../../assets/bg-leaves3.jpg"),
  bg4: require("../../../assets/bg-leaves4.jpg"),
  bg5: require("../../../assets/bg-leaves5.jpg"),
};

export function resolveBackground(key: unknown) {
  if (key === "bg2") return BACKGROUNDS.bg2;
  if (key === "bg3") return BACKGROUNDS.bg3;
  if (key === "bg4") return BACKGROUNDS.bg4;
  if (key === "bg5") return BACKGROUNDS.bg5;
  return BACKGROUNDS.bg1;
}

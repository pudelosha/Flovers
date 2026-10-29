export type TemperatureUnit = "C" | "F" | "K";

export function temperatureUnit(settings?: any): TemperatureUnit {
  const raw = typeof settings === "string" ? settings
    : settings?.temperatureUnit ?? settings?.tempUnit ?? settings?.units?.temperature ?? "C";
  const value = String(raw).trim().toLowerCase();
  if (["f", "°f", "fahrenheit"].includes(value)) return "F";
  if (["k", "°k", "kelvin"].includes(value)) return "K";
  return "C";
}

export function getDisplayTemperature(value: number | null | undefined, settings?: any) {
  const preference = temperatureUnit(settings);
  const unit = preference === "K" ? "K" : `°${preference}`;
  if (typeof value !== "number" || !Number.isFinite(value)) return { value: null, unit, decimals: 1 };
  const converted = preference === "F" ? value * 9 / 5 + 32 : preference === "K" ? value + 273.15 : value;
  return { value: converted, unit, decimals: 1 };
}

export type HistoryRange = "day" | "week" | "month";
export type MetricKey = "temperature" | "humidity" | "light" | "moisture";

export type HistoryPoint = {
  label: string;   // x-axis label (hour/day number/weekday)
  value: number;   // numeric value
};

export type HistorySeries = {
  metric: MetricKey;
  unit: string;
  color: string;
  points: HistoryPoint[];
};

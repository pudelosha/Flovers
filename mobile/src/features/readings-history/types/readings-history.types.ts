export type HistoryRange = "day" | "week" | "month";
export type MetricKey = "temperature" | "humidity" | "light" | "moisture";

export type HistoryPoint = {
  label: string;   // x-axis label
  value: number;   // numeric value
};

export type HistorySeries = {
  metric: MetricKey;
  unit: string;
  color: string;
  points: HistoryPoint[];
};

export type DateSpan = {
  from: Date;
  to: Date;
};

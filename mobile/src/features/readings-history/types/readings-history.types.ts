export type HistoryRange = "day" | "week" | "month";
export type MetricKey = "temperature" | "humidity" | "light" | "moisture";
export type HistoryStat = "avg" | "max" | "min";

export type HistoryPoint = {
  at: string;      // bucket start ISO datetime
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

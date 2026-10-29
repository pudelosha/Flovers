import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { readingDeadlineMs } from "../utils/readingStaleness";
import type { ReadingTileModel } from "../types/readings.types";

export function useReadingOverdue(data: ReadingTileModel): boolean {
  const deadline = readingDeadlineMs(data);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      if (timer) clearTimeout(timer);
      const current = Date.now();
      setNow(current);
      if (deadline !== null && deadline > current) {
        // Limit very distant dates to a safe timer duration.
        timer = setTimeout(update, Math.min(deadline - current, 86_400_000));
      }
    };
    update();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") update();
    });
    return () => {
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [deadline]);

  return deadline !== null && now >= deadline;
}

// Placeholder service for Home feature.
// Later replace with real `request` calls (like you do in AuthContext).

import type { Task, TaskType } from "../../features/home/types/home.types";

export async function fetchTasksDemo(): Promise<Task[]> {
  const base = new Date(2025, 9, 6); // 2025-10-06
  const types: TaskType[] = ["watering", "moisture", "fertilising", "care"];
  const tasks: Task[] = Array.from({ length: 12 }).map((_, i) => ({
    id: String(i + 1),
    type: types[i % types.length],
    plant: ["Big Awesome Monstera", "Ficus", "Aloe Vera", "Orchid"][i % 4],
    location: ["Living Room", "Bedroom", "Kitchen", "Office"][i % 4],
    due: ["Today", "Tomorrow", "3 days", "Next week"][i % 4],
    dueDate: addDays(base, i % 4),
  }));
  return Promise.resolve(tasks);
}

export async function markTaskCompleteDemo(id: string): Promise<void> {
  // TODO: POST/PATCH to backend
  return Promise.resolve();
}

export async function deleteTaskDemo(id: string): Promise<void> {
  // TODO: DELETE to backend
  return Promise.resolve();
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

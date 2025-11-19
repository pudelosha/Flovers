// C:\Projekty\Python\Flovers\mobile\src\api\services\plant-details.service.ts

import {
  fetchPlantInstanceDetail,
  fetchPlantByQr,
} from "./plant-instances.service";

import type {
  PlantDetailsComposite,
  LatestReadings,
  PlantReminderSummary,
} from "../../features/plant-details/types/plant-details.types";

/**
 * For now we keep readings + reminders as dummy data,
 * but the structure is ready to be wired into real APIs later.
 */

function createDummyLatestReadings(): LatestReadings {
  return {
    temperature: 23,
    humidity: 57,
    light: 640,
    moisture: 42,
    tsISO: new Date().toISOString(),
  };
}

function createDummyReminders(): PlantReminderSummary[] {
  return [
    {
      id: "r1",
      title: "Watering",
      when: "in 2 days",
      icon: "watering-can-outline",
    },
    {
      id: "r2",
      title: "Fertilize",
      when: "next week",
      icon: "sprout-outline",
    },
    {
      id: "r3",
      title: "Repot check",
      when: "in 2 months",
      icon: "pot-outline",
    },
  ];
}

/**
 * Fetch details by numeric plant ID and compose them into a single object
 * for the screen to consume.
 */
export async function fetchPlantDetailsById(
  id: number
): Promise<PlantDetailsComposite> {
  const plant = await fetchPlantInstanceDetail(id);

  // When you add real endpoints:
  // - replace createDummyLatestReadings with fetchLatestReadingsForPlant(id)
  // - replace createDummyReminders with fetchRemindersForPlant(id)
  const latestReadings = createDummyLatestReadings();
  const reminders = createDummyReminders();

  return { plant, latestReadings, reminders };
}

/**
 * Fetch details by QR code and compose them into a single object.
 */
export async function fetchPlantDetailsByQr(
  qrCode: string
): Promise<PlantDetailsComposite> {
  const plant = await fetchPlantByQr(qrCode);

  const latestReadings = createDummyLatestReadings();
  const reminders = createDummyReminders();

  return { plant, latestReadings, reminders };
}

// C:\Projekty\Python\Flovers\mobile\src\api\services\plant-details.service.ts

import {
  fetchPlantInstanceDetail,
  fetchPlantByQr,
} from "./plant-instances.service";

import type {
  PlantDetailsComposite,
  LatestReadings,
  PlantReminderSummary,
  PlantSensorsConfig,
} from "../../features/plant-details/types/plant-details.types";

/**
 * For now we keep readings + reminders + device metadata as dummy data,
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

// Dummy sensor config – in real code you’d derive this from the linked device
function createDummySensors(): PlantSensorsConfig {
  return {
    temperature: true,
    humidity: true,
    light: true,
    moisture: true,
  };
}

/**
 * Fetch details by numeric plant ID and compose them into a single object
 * for the screen to consume.
 */
export async function fetchPlantDetailsById(
  id: number
): Promise<PlantDetailsComposite> {
  const plant = await fetchPlantInstanceDetail(id);

  const latestReadings = createDummyLatestReadings();
  const reminders = createDummyReminders();
  const sensors = createDummySensors();

  // For now, pretend every plant has a linked device.
  // Later you can set deviceLinked based on real API.
  const deviceLinked = true;
  const deviceName = "Demo sensor";

  return { plant, latestReadings, reminders, deviceLinked, deviceName, sensors };
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
  const sensors = createDummySensors();

  const deviceLinked = true;
  const deviceName = "Demo sensor";

  return { plant, latestReadings, reminders, deviceLinked, deviceName, sensors };
}

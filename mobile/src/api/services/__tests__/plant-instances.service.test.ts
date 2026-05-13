import { request } from "../../client";
import {
  buildUpdatePayloadFromForm,
  createPlantInstance,
  deletePlantInstance,
  fetchPlantByQr,
  fetchPlantInstanceDetail,
  fetchPlantInstanceForEdit,
  fetchPlantInstances,
  updatePlantInstance,
  updatePlantInstanceFromForm,
} from "../plant-instances.service";
import type { WizardState } from "../../../features/create-plant/types/create-plant.types";

jest.mock("../../client", () => ({
  request: jest.fn(),
}));

const mockedRequest = request as jest.Mock;

describe("plant-instances.service", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue({ id: 99 });
  });

  it("builds a create payload from the wizard state without uploading local photos", async () => {
    const state: WizardState = {
      step: "creating",
      plantQuery: "fern",
      selectedPlant: { id: "12", name: "Boston fern" },
      locations: [{ id: "4", name: "Living room", category: "indoor" }],
      selectedLocationId: "4",
      lightLevel: "bright-indirect",
      orientation: "E",
      distanceCm: 23.7,
      potMaterial: "terracotta",
      soilMix: "cactus-succulent",
      createAutoTasks: true,
      waterTaskEnabled: true,
      repotTaskEnabled: true,
      moistureRequired: true,
      fertilizeRequired: false,
      careRequired: true,
      lastWatered: "yesterday",
      lastRepotted: "one-month-ago",
      moistureIntervalDays: 3,
      fertilizeIntervalDays: undefined,
      careIntervalDays: 14,
      repotIntervalMonths: 12,
      photoUri: "file:///phone/local/plant.jpg",
      displayName: "  Fern by the window  ",
      notes: "  Likes misting  ",
      purchaseDateISO: "2026-05-12",
    };

    await createPlantInstance(state, { auth: false });

    expect(mockedRequest).toHaveBeenCalledWith(
      "/api/plant-instances/",
      "POST",
      expect.objectContaining({
        location_id: 4,
        plant_definition_id: 12,
        display_name: "Fern by the window",
        notes: "Likes misting",
        purchase_date: "2026-05-12",
        distance_cm: 24,
        pot_material: "terracotta",
        soil_mix: "cactus-succulent",
        create_auto_tasks: true,
        water_task_enabled: true,
        moisture_required: true,
        care_required: true,
        moisture_interval_days: 3,
        care_interval_days: 14,
        repot_interval_months: 12,
      }),
      { auth: false }
    );

    const payload = mockedRequest.mock.calls[0][2];
    expect(payload.photo_uri).toBeUndefined();
  });

  it("builds a conservative update payload from edit form values", () => {
    expect(
      buildUpdatePayloadFromForm({
        plant_definition_id: "17",
        location_id: "8",
        display_name: "Kitchen pothos",
        notes: "",
        purchase_date: null,
        light_level: "low",
        orientation: "N",
        distance_cm: -4.4,
        pot_material: undefined,
        soil_mix: "peat-based",
        moisture_required: true,
        fertilize_interval_days: null,
      })
    ).toEqual({
      plant_definition_id: 17,
      location_id: 8,
      display_name: "Kitchen pothos",
      notes: "",
      purchase_date: null,
      light_level: "low",
      orientation: "N",
      distance_cm: 0,
      pot_material: "",
      soil_mix: "peat-based",
      moisture_required: true,
      fertilize_interval_days: null,
    });
  });

  it("normalizes paginated and plain plant lists", async () => {
    mockedRequest.mockResolvedValueOnce({
      results: [{ id: 1, display_name: "Fern" }],
    });
    await expect(fetchPlantInstances({ auth: false })).resolves.toEqual([
      { id: 1, display_name: "Fern" },
    ]);

    mockedRequest.mockResolvedValueOnce([{ id: 2, display_name: "Pothos" }]);
    await expect(fetchPlantInstances({ auth: true })).resolves.toEqual([
      { id: 2, display_name: "Pothos" },
    ]);
  });

  it("supports plant fetch, update and delete actions", async () => {
    await fetchPlantInstanceForEdit(4, { auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/plant-instances/4/",
      "GET",
      undefined,
      { auth: false }
    );

    await fetchPlantInstanceDetail(4, { auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/plant-instances/4/",
      "GET",
      undefined,
      { auth: false }
    );

    await fetchPlantByQr("qr code/with space", { auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/plant-instances/by-qr/?code=qr%20code%2Fwith%20space",
      "GET",
      undefined,
      { auth: false }
    );

    await updatePlantInstance(
      4,
      { display_name: "Updated fern" },
      { auth: false }
    );
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/plant-instances/4/",
      "PATCH",
      { display_name: "Updated fern" },
      { auth: false }
    );

    await updatePlantInstanceFromForm(
      4,
      { display_name: "From form", distance_cm: 12.6 },
      { auth: false }
    );
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/plant-instances/4/",
      "PATCH",
      { display_name: "From form", distance_cm: 13 },
      { auth: false }
    );

    await deletePlantInstance(4, { auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/plant-instances/4/",
      "DELETE",
      undefined,
      { auth: false }
    );
  });
});

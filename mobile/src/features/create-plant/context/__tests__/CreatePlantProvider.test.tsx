import React from "react";
import { act, render } from "@testing-library/react-native";
import { CreatePlantProvider, useCreatePlantWizard } from "../CreatePlantProvider";
import { createPlantInstance } from "../../../../api/services/plant-instances.service";
import { promoteTempPhotoToPlant } from "../../../../shared/utils/photoStorage";
import { setAuthToken } from "../../../../api/client";

jest.mock("../../../../api/services/plant-instances.service", () => ({ createPlantInstance: jest.fn() }));
jest.mock("../../../../shared/utils/photoStorage", () => ({ promoteTempPhotoToPlant: jest.fn() }));

const mockCreate = createPlantInstance as jest.Mock;
const mockPromote = promoteTempPhotoToPlant as jest.Mock;
let wizard: ReturnType<typeof useCreatePlantWizard>;

function StateProbe() {
  wizard = useCreatePlantWizard();
  return null;
}

describe("wizard creation recovery", () => {
  beforeEach(async () => {
    jest.resetAllMocks();
    mockCreate.mockResolvedValue({ id: 99 });
    mockPromote.mockResolvedValue("file:///documents/Flovers/plants/99.saved.jpg");
    render(<CreatePlantProvider><StateProbe /></CreatePlantProvider>);
    await act(async () => {
      wizard.actions.patch({ selectedLocationId: "4", displayName: "My fern", notes: "Keep these notes" });
    });
  });

  it("preserves wizard inputs after a failed POST and allows retry", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Offline"));
    await act(async () => {
      await expect(wizard.actions.createPlant()).rejects.toThrow("Offline");
    });
    expect(wizard.state).toMatchObject({ selectedLocationId: "4", displayName: "My fern", notes: "Keep these notes" });
    expect(wizard.state.createdPlantId).toBeUndefined();
    await act(async () => { await expect(wizard.actions.createPlant()).resolves.toBe("99"); });
    expect(mockCreate).toHaveBeenCalledTimes(2);
    const key = mockCreate.mock.calls[0][1].creationKey;
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(mockCreate.mock.calls[1][1].creationKey).toBe(key);
  });

  it("reuses the committed result after a response timeout and gives a reset draft a new key", async () => {
    jest.useFakeTimers();
    const previousFetch = globalThis.fetch;
    const committed = new Map<string, { id: number }>();
    const realCreate = jest.requireActual("../../../../api/services/plant-instances.service").createPlantInstance;
    mockCreate.mockImplementation(realCreate);
    setAuthToken("test-access");
    let calls = 0;
    globalThis.fetch = jest.fn(async (_url: unknown, options?: RequestInit) => {
      const body = JSON.parse(options!.body as string);
      if (!committed.has(body.creation_key)) committed.set(body.creation_key, { id: committed.size + 1 });
      if (++calls === 1) return new Promise<Response>(() => {});
      return {
        ok: true, status: 200, headers: { get: () => "application/json" },
        text: async () => JSON.stringify(committed.get(body.creation_key)),
      } as unknown as Response;
    });
    try {
      const failed = expect(wizard.actions.createPlant()).rejects.toMatchObject({ status: 408 });
      await act(async () => { jest.advanceTimersByTime(15000); await failed; });
      await act(async () => { await expect(wizard.actions.createPlant()).resolves.toBe("1"); });
      expect(committed.size).toBe(1);
      const oldKey = mockCreate.mock.calls[0][1].creationKey;
      await act(async () => {
        wizard.actions.reset();
        wizard.actions.patch({ selectedLocationId: "4", displayName: "Another fern" });
      });
      await act(async () => { await expect(wizard.actions.createPlant()).resolves.toBe("2"); });
      expect(committed.size).toBe(2);
      expect(mockCreate.mock.calls[2][1].creationKey).not.toBe(oldKey);
    } finally {
      setAuthToken(null);
      globalThis.fetch = previousFetch;
      jest.useRealTimers();
    }
  });

  it("retries only photo persistence after the backend has created the plant", async () => {
    await act(async () => { wizard.actions.setPhotoUri("file:///documents/Flovers/tmp/photo.jpg"); });
    mockPromote.mockRejectedValueOnce(new Error("Storage full"));
    await act(async () => { await expect(wizard.actions.createPlant()).rejects.toThrow("Storage full"); });
    expect(wizard.state.createdPlantId).toBe("99");
    await act(async () => { await expect(wizard.actions.createPlant()).resolves.toBe("99"); });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockPromote).toHaveBeenCalledTimes(2);
    expect(wizard.state.photoUri).toBe("file:///documents/Flovers/plants/99.saved.jpg");
    await act(async () => { await wizard.actions.createPlant(); });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockPromote).toHaveBeenCalledTimes(2);
  });

  it("shares an in-flight creation request instead of posting twice", async () => {
    let finish!: (plant: { id: number }) => void;
    mockCreate.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const first = wizard.actions.createPlant();
    const second = wizard.actions.createPlant();
    expect(mockCreate).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish({ id: 99 });
      await expect(Promise.all([first, second])).resolves.toEqual(["99", "99"]);
    });
  });
});

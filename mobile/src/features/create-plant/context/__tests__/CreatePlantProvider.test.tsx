import React from "react";
import { act, render } from "@testing-library/react-native";
import { CreatePlantProvider, useCreatePlantWizard } from "../CreatePlantProvider";
import { createPlantInstance } from "../../../../api/services/plant-instances.service";
import { deleteLocalPhoto } from "../../../../shared/utils/photoStorage";
import { uploadPlantPhoto, updatePlantPhotoFraming } from "../../../../api/services/plant-photos.service";
import { ApiError, setAuthToken } from "../../../../api/client";

jest.mock("../../../../api/services/plant-instances.service", () => ({ createPlantInstance: jest.fn() }));
jest.mock("../../../../shared/utils/photoStorage", () => ({ deleteLocalPhoto: jest.fn() }));
jest.mock("../../../../api/services/plant-photos.service", () => ({ uploadPlantPhoto: jest.fn(), updatePlantPhotoFraming: jest.fn() }));

const mockCreate = createPlantInstance as jest.Mock;
const mockUpload = uploadPlantPhoto as jest.Mock;
const mockUpdateFraming = updatePlantPhotoFraming as jest.Mock;
const mockDeleteLocal = deleteLocalPhoto as jest.Mock;
let wizard: ReturnType<typeof useCreatePlantWizard>;

function StateProbe() {
  wizard = useCreatePlantWizard();
  return null;
}

describe("wizard creation recovery", () => {
  beforeEach(async () => {
    jest.resetAllMocks();
    mockCreate.mockResolvedValue({ id: 99 });
    mockUpload.mockResolvedValue({ id: "photo-id" });
    mockDeleteLocal.mockResolvedValue(undefined);
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

  it("retries only the photo upload after creation, retaining the source until confirmed", async () => {
    await act(async () => { wizard.actions.setPhotoUri("file:///documents/Flovers/tmp/photo.jpg"); });
    mockUpload.mockRejectedValueOnce(new Error("Offline"));
    await act(async () => { await expect(wizard.actions.createPlant()).rejects.toThrow("Offline"); });
    expect(wizard.state.createdPlantId).toBe("99");
    expect(wizard.state.photoUri).toBe("file:///documents/Flovers/tmp/photo.jpg");
    expect(mockDeleteLocal).not.toHaveBeenCalled();
    await act(async () => { await expect(wizard.actions.createPlant()).resolves.toBe("99"); });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledTimes(2);
    expect(mockUpload.mock.calls[0]).toEqual(["99", "file:///documents/Flovers/tmp/photo.jpg", {
      expectedPhotoId: null, uploadKey: expect.any(String), framing: { focal_x: 0.5, focal_y: 0.5, zoom: 1 },
    }]);
    expect(mockUpload.mock.calls[1][2].uploadKey).toBe(mockUpload.mock.calls[0][2].uploadKey);
    expect(mockDeleteLocal).toHaveBeenCalledWith("file:///documents/Flovers/tmp/photo.jpg");
    await act(async () => { await wizard.actions.createPlant(); });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledTimes(2);
  });

  it("waits for upload success before resolving creation and survives local cleanup failure", async () => {
    await act(async () => { wizard.actions.setPhotoUri("file:///tmp/new.jpg"); });
    let finish!: () => void;
    mockUpload.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
    mockDeleteLocal.mockRejectedValueOnce(new Error("Cleanup unavailable"));
    const created = wizard.actions.createPlant();
    await act(async () => { await Promise.resolve(); });
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockDeleteLocal).not.toHaveBeenCalled();
    await act(async () => { finish(); await expect(created).resolves.toBe("99"); });
    await act(async () => { await wizard.actions.createPlant(); });
    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  it("does not attach a late creation response to a newly reset draft", async () => {
    let finish!: (value: { id: number }) => void;
    mockCreate.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const previous = wizard.actions.createPlant();
    const rejection = expect(previous).rejects.toThrow("Creation draft changed.");
    await act(async () => { wizard.actions.reset(); wizard.actions.patch({ selectedLocationId: "4", displayName: "New draft" }); });
    await act(async () => { finish({ id: 77 }); await rejection; });
    expect(wizard.state.createdPlantId).toBeUndefined();
    await act(async () => { await expect(wizard.actions.createPlant()).resolves.toBe("99"); });
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate.mock.calls[0][1].creationKey).not.toBe(mockCreate.mock.calls[1][1].creationKey);
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

  it("uploads the selected framing and resets it when a different image is selected", async () => {
    const framing = { focal_x: 0.3, focal_y: 0.65, zoom: 2 };
    await act(async () => {
      wizard.actions.setPhotoUri("file:///tmp/new.jpg");
      wizard.actions.setPhotoFraming(framing);
    });
    mockUpload.mockResolvedValueOnce({ id: "image-id", framing, framing_revision: 0 });
    await act(async () => { await wizard.actions.createPlant(); });
    expect(mockUpload).toHaveBeenCalledWith("99", "file:///tmp/new.jpg", expect.objectContaining({ framing }));
    expect(mockUpdateFraming).not.toHaveBeenCalled();
    await act(async () => { wizard.actions.setPhotoUri("file:///tmp/another.jpg"); });
    expect(wizard.state.photoFraming).toEqual({ focal_x: 0.5, focal_y: 0.5, zoom: 1 });
  });

  it("applies a changed framing after an upload response was lost without creating a second plant", async () => {
    await act(async () => { wizard.actions.setPhotoUri("file:///tmp/new.jpg"); });
    mockUpload.mockRejectedValueOnce(new Error("Response lost"));
    await act(async () => { await expect(wizard.actions.createPlant()).rejects.toThrow("Response lost"); });
    const framing = { focal_x: 0.35, focal_y: 0.6, zoom: 2.5 };
    await act(async () => { wizard.actions.setPhotoFraming(framing); });
    mockUpload.mockResolvedValueOnce({ id: "committed-image", framing_revision: 0 });
    mockUpdateFraming.mockResolvedValueOnce({ id: "committed-image", framing, framing_revision: 1 });
    await act(async () => { await expect(wizard.actions.createPlant()).resolves.toBe("99"); });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockUpload.mock.calls[1][2].uploadKey).toBe(mockUpload.mock.calls[0][2].uploadKey);
    expect(mockUpdateFraming).toHaveBeenCalledWith("99", framing, { expectedPhotoId: "committed-image", expectedFramingRevision: 0 });
  });

  it("preserves another device's framing when a recovered upload has already been edited", async () => {
    await act(async () => { wizard.actions.setPhotoUri("file:///tmp/new.jpg"); });
    mockUpload.mockRejectedValueOnce(new Error("Response lost"));
    await act(async () => { await expect(wizard.actions.createPlant()).rejects.toThrow("Response lost"); });
    const framing = { focal_x: 0.35, focal_y: 0.6, zoom: 2.5 };
    await act(async () => { wizard.actions.setPhotoFraming(framing); });
    mockUpload.mockResolvedValueOnce({ id: "committed-image", framing: { focal_x: 0.6, focal_y: 0.4, zoom: 3 }, framing_revision: 2 });
    mockUpdateFraming.mockRejectedValueOnce(new ApiError(409, { code: "photo_conflict" }));
    await act(async () => { await expect(wizard.actions.createPlant()).rejects.toMatchObject({ status: 409 }); });
    expect(mockUpdateFraming).toHaveBeenCalledWith("99", framing, { expectedPhotoId: "committed-image", expectedFramingRevision: 0 });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockDeleteLocal).not.toHaveBeenCalled();
  });
});

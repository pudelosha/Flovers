import { request, ApiError } from "../../client";
import { recognizePlantFromUri } from "../plant-recognition.service";

jest.mock("../../client", () => {
  class MockApiError extends Error {
    status: number;

    constructor(status: number, body: unknown, message = "API error") {
      super(message);
      this.status = status;
    }
  }

  return {
    request: jest.fn(),
    ApiError: MockApiError,
  };
});

const mockedRequest = request as jest.Mock;

describe("plant-recognition.service", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it("posts multipart image data and returns sorted top-k results", async () => {
    mockedRequest.mockResolvedValueOnce({
      results: [
        { id: null, name: "B", latin: "B", external_id: "b", probability: 0.2 },
        { id: null, name: "A", latin: "A", external_id: "a", probability: 0.9 },
        { id: null, name: "C", latin: "C", external_id: "c", probability: 0.5 },
      ],
    });

    await expect(
      recognizePlantFromUri("file:///plant.jpg", { auth: false, topk: 2 })
    ).resolves.toEqual({
      results: [
        expect.objectContaining({ name: "A" }),
        expect.objectContaining({ name: "C" }),
      ],
    });

    expect(mockedRequest).toHaveBeenCalledWith(
      "/api/plant-recognition/scan/",
      "POST",
      expect.any(FormData),
      { auth: false }
    );
  });

  it("rejects empty recognition responses and rethrows ApiError", async () => {
    mockedRequest.mockResolvedValueOnce({ results: [] });
    await expect(recognizePlantFromUri("file:///plant.jpg")).rejects.toThrow(
      "No recognition results returned."
    );

    mockedRequest.mockRejectedValueOnce(new ApiError(400, {}, "bad image"));
    await expect(recognizePlantFromUri("file:///plant.jpg")).rejects.toThrow(
      "bad image"
    );
  });
});

import { request, ApiError } from "../../client";
import {
  fetchPlantProfile,
  fetchPlantSearchIndex,
  fetchPopularPlants,
} from "../plant-definitions.service";

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

describe("plant-definitions.service", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it("fetches and serializes popular plants with language", async () => {
    mockedRequest.mockResolvedValueOnce([
      {
        id: 7,
        name: "Boston fern",
        latin: "Nephrolepis exaltata",
        image: "fern.jpg",
        sun: "medium",
        water: "high",
        difficulty: "easy",
      },
    ]);

    await expect(fetchPopularPlants({ auth: false, lang: "pl" })).resolves.toEqual([
      expect.objectContaining({
        id: "7",
        name: "Boston fern",
        popular: true,
      }),
    ]);
    expect(mockedRequest).toHaveBeenCalledWith(
      "/api/plant-definitions/popular/?lang=pl",
      "GET",
      undefined,
      { auth: false }
    );
  });

  it("fetches and serializes search index suggestions", async () => {
    mockedRequest.mockResolvedValueOnce([
      { id: 8, display_name: "Snake plant", latin: "Sansevieria_trifasciata" },
    ]);

    await expect(fetchPlantSearchIndex({ auth: false, lang: "en" })).resolves.toEqual([
      { id: "8", name: "Snake plant", latin: "Sansevieria trifasciata" },
    ]);
  });

  it("uses fallback for non-auth failures but rethrows unauthorized errors", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("offline"));
    await expect(
      fetchPopularPlants({ auth: false, useFallbackOnError: true })
    ).resolves.not.toEqual([]);

    mockedRequest.mockRejectedValueOnce(new ApiError(401, {}, "unauthorized"));
    await expect(
      fetchPopularPlants({ auth: false, useFallbackOnError: true })
    ).rejects.toThrow("unauthorized");
  });

  it("fetches profile by id or external key and validates response", async () => {
    mockedRequest.mockResolvedValueOnce({
      id: 4,
      name: "Fern",
      latin: "Nephrolepis exaltata",
    });

    await expect(fetchPlantProfile(4, { auth: false, lang: "en" })).resolves.toMatchObject({
      latin: "Nephrolepis exaltata",
    });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/plant-definitions/4/profile/?lang=en",
      "GET",
      undefined,
      { auth: false }
    );

    mockedRequest.mockResolvedValueOnce({ id: "x" });
    await expect(fetchPlantProfile("boston fern")).rejects.toThrow(
      'Failed to fetch plant profile: Invalid plant profile response, missing "latin" field'
    );
  });
});

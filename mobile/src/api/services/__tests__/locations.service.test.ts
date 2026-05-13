import { request, ApiError } from "../../client";
import {
  createLocation,
  deleteLocation,
  fetchUserLocations,
  updateLocation,
} from "../locations.service";

jest.mock("../../client", () => {
  class MockApiError extends Error {
    status: number;
    body: unknown;

    constructor(status: number, body: unknown, message = "API error") {
      super(message);
      this.status = status;
      this.body = body;
    }
  }

  return {
    request: jest.fn(),
    ApiError: MockApiError,
  };
});

const mockedRequest = request as jest.Mock;

describe("locations.service", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue({ id: "1", name: "Living room", category: "indoor" });
  });

  it("supports location CRUD actions", async () => {
    mockedRequest.mockResolvedValueOnce([{ id: "1", name: "Living room" }]);
    await expect(fetchUserLocations({ auth: false })).resolves.toEqual([
      { id: "1", name: "Living room" },
    ]);
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/locations/",
      "GET",
      undefined,
      { auth: false }
    );

    await createLocation(
      { name: "Bedroom", category: "indoor" },
      { auth: false }
    );
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/locations/",
      "POST",
      { name: "Bedroom", category: "indoor" },
      { auth: false }
    );

    await updateLocation(
      "1",
      { name: "Balcony", category: "outdoor" },
      { auth: false }
    );
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/locations/1/",
      "PATCH",
      { name: "Balcony", category: "outdoor" },
      { auth: false }
    );

    await deleteLocation("1", { auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/locations/1/",
      "DELETE",
      undefined,
      { auth: false }
    );
  });

  it("converts duplicate/protected location API errors into readable errors", async () => {
    mockedRequest.mockRejectedValueOnce(
      new ApiError(409, { detail: "Location already exists." }, "conflict")
    );

    await expect(
      createLocation({ name: "Bedroom", category: "indoor" })
    ).rejects.toThrow("Location already exists.");

    mockedRequest.mockRejectedValueOnce(
      new ApiError(400, { message: "Location is in use." }, "bad")
    );

    await expect(deleteLocation("1")).rejects.toThrow("Location is in use.");
  });
});

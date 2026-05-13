import { request } from "../../client";
import {
  buildQrCodeFileName,
  getQrCodeBase64,
  saveQrCodeToDevice,
  sendQrCodeByEmail,
} from "../qr-code.service";

jest.mock("../../client", () => ({
  request: jest.fn(),
}));

const mockedRequest = request as jest.Mock;

describe("qr-code.service", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue({ detail: "sent" });
  });

  it("sends QR code email with optional language", async () => {
    await sendQrCodeByEmail(7, " pl ", { auth: false });
    expect(mockedRequest).toHaveBeenCalledWith(
      "/api/plant-instances/7/send-qr-email/",
      "POST",
      { lang: "pl" },
      { auth: false }
    );

    await expect(sendQrCodeByEmail(Number.NaN)).rejects.toThrow(
      "plantId is required."
    );
  });

  it("generates QR image base64 and delegates device saving", async () => {
    const qrRef = {
      toDataURL: (cb: (base64: string) => void) => cb("base64-data"),
    };
    await expect(getQrCodeBase64(qrRef)).resolves.toBe("base64-data");

    const saveBase64Image = jest.fn(async () => ({ uri: "file:///qr.png" }));
    await expect(
      saveQrCodeToDevice({
        qrRef,
        fileName: "plant.png",
        saveBase64Image,
      })
    ).resolves.toEqual({
      uri: "file:///qr.png",
      detail: "QR code saved successfully.",
    });
    expect(saveBase64Image).toHaveBeenCalledWith({
      base64: "base64-data",
      fileName: "plant.png",
      mimeType: "image/png",
    });
  });

  it("validates QR save inputs and builds safe file names", async () => {
    await expect(getQrCodeBase64(null)).rejects.toThrow(
      "QR reference is unavailable."
    );

    await expect(
      saveQrCodeToDevice({
        qrRef: { toDataURL: (cb) => cb("abc") },
        fileName: "",
        saveBase64Image: jest.fn(),
      })
    ).rejects.toThrow("fileName is required.");

    expect(buildQrCodeFileName(" Living room Monstera! ")).toBe(
      "living-room-monstera.png"
    );
    expect(buildQrCodeFileName("!!!")).toBe("plant-qr.png");
  });
});

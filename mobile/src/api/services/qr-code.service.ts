import { request } from "../client";

/* ============================== TYPES ============================== */

export type QrCodeSvgRef = {
  toDataURL?: (callback: (base64: string) => void) => void;
};

export type SendQrCodeEmailPayload = {
  plant_id?: number;
  plant_name?: string;
  qr_value: string;
};

export type SendQrCodeEmailResponse = {
  detail?: string;
  success?: boolean;
};

export type SaveQrCodeToDeviceParams = {
  qrRef: QrCodeSvgRef | null | undefined;
  fileName: string;
  saveBase64Image: (params: {
    base64: string;
    fileName: string;
    mimeType: string;
  }) => Promise<{ uri?: string }>;
};

export type SaveQrCodeToDeviceResponse = {
  uri?: string;
  detail?: string;
};

/* ============================== ENDPOINTS ============================== */

const QR_CODES_URL = "/api/qr-codes/";

/* ============================== EMAIL ============================== */

/**
 * Request backend to send QR code image to the authenticated user's email.
 */
export async function sendQrCodeByEmail(
  payload: SendQrCodeEmailPayload,
  opts: { auth?: boolean } = { auth: true }
): Promise<SendQrCodeEmailResponse> {
  if (!payload?.qr_value?.trim()) {
    throw new Error("qr_value is required.");
  }

  return await request<SendQrCodeEmailResponse>(
    `${QR_CODES_URL}send-email/`,
    "POST",
    payload,
    { auth: opts.auth ?? true }
  );
}

/* ============================== QR EXPORT ============================== */

/**
 * Convert rendered react-native-qrcode-svg instance to raw base64 PNG data.
 * Returned string does not include the `data:image/png;base64,` prefix.
 */
export async function getQrCodeBase64(
  qrRef: QrCodeSvgRef | null | undefined
): Promise<string> {
  if (!qrRef || typeof qrRef.toDataURL !== "function") {
    throw new Error("QR reference is unavailable.");
  }

  return await new Promise<string>((resolve, reject) => {
    try {
      qrRef.toDataURL((base64: string) => {
        if (!base64 || !base64.trim()) {
          reject(new Error("Failed to generate QR image."));
          return;
        }

        resolve(base64);
      });
    } catch (error) {
      reject(
        error instanceof Error
          ? error
          : new Error("Unexpected error while generating QR image.")
      );
    }
  });
}

/* ============================== SAVE TO DEVICE ============================== */

/**
 * Convert currently displayed QR into base64 and delegate native save implementation.
 * Actual permission handling / media-library write stays in the caller-provided saver.
 */
export async function saveQrCodeToDevice(
  params: SaveQrCodeToDeviceParams
): Promise<SaveQrCodeToDeviceResponse> {
  const { qrRef, fileName, saveBase64Image } = params;

  if (!fileName?.trim()) {
    throw new Error("fileName is required.");
  }

  if (typeof saveBase64Image !== "function") {
    throw new Error("saveBase64Image handler is required.");
  }

  const base64 = await getQrCodeBase64(qrRef);

  const result = await saveBase64Image({
    base64,
    fileName,
    mimeType: "image/png",
  });

  return {
    uri: result?.uri,
    detail: "QR code saved successfully.",
  };
}

/* ============================== HELPERS ============================== */

export function buildQrCodeFileName(plantName?: string): string {
  const normalized = (plantName || "plant-qr")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  return `${normalized || "plant-qr"}.png`;
}
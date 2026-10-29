import { readingDeadlineMs, readingsAreOverdue } from "../readingStaleness";

const baseline = "2026-10-29T10:00:00Z";
const hourLater = Date.parse("2026-10-29T11:00:00Z");
const device = { status: "enabled" as const, lastReadISO: baseline, intervalMinutes: 60 };

it("becomes overdue exactly at the configured deadline", () => {
  expect(readingsAreOverdue(device, hourLater - 1)).toBe(false);
  expect(readingsAreOverdue(device, hourLater)).toBe(true);
  expect(readingsAreOverdue(device, hourLater + 1)).toBe(true);
});
it("supports minute intervals rather than rounding to hours", () => {
  expect(readingDeadlineMs({ ...device, intervalMinutes: 45 })).toBe(Date.parse(baseline) + 45 * 60_000);
});
it("uses creation for a device that has never reported and uses fresh readings after recovery", () => {
  expect(readingsAreOverdue({ ...device, lastReadISO: null, createdAtISO: baseline }, hourLater)).toBe(true);
  expect(readingsAreOverdue({ ...device, lastReadISO: "2026-10-29T10:59:00Z" }, hourLater)).toBe(false);
});
it("does not warn for disabled devices or unknown/invalid timestamps", () => {
  expect(readingsAreOverdue({ ...device, status: "disabled" }, hourLater)).toBe(false);
  expect(readingsAreOverdue({ status: "enabled" }, hourLater)).toBe(false);
  expect(readingsAreOverdue({ ...device, lastReadISO: "invalid" }, hourLater)).toBe(false);
});

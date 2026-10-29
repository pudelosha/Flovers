import { getDisplayTemperature, temperatureUnit } from "../temperature";

it.each([["C", 20, "°C"], ["F", 68, "°F"], ["K", 293.15, "K"]])(
  "converts Celsius readings consistently for %s", (preference, expected, unit) => {
    const result = getDisplayTemperature(20, { temperatureUnit: preference });
    expect(result.value).toBeCloseTo(expected as number);
    expect(result.unit).toBe(unit);
  }
);
it("does not turn missing readings into freezing/Fahrenheit or Kelvin offset values", () => {
  for (const value of [null, undefined, NaN, Infinity]) {
    expect(getDisplayTemperature(value, "F")).toMatchObject({ value: null, unit: "°F" });
    expect(getDisplayTemperature(value, "K")).toMatchObject({ value: null, unit: "K" });
  }
  expect(getDisplayTemperature(0, "F").value).toBe(32);
  expect(getDisplayTemperature(-40, "F").value).toBe(-40);
});
it("supports saved legacy preference aliases", () => {
  expect(temperatureUnit({ tempUnit: "fahrenheit" })).toBe("F");
  expect(temperatureUnit({ units: { temperature: "kelvin" } })).toBe("K");
});

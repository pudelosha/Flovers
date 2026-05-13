import {
  hasMeaningfulTuningSignals,
  tuneDaysInterval,
  tuneMonthsInterval,
} from "../intervalTuning";

describe("intervalTuning", () => {
  it("treats untouched wizard defaults as no meaningful tuning signals", () => {
    expect(
      hasMeaningfulTuningSignals({
        lightLevel: "bright-indirect",
        orientation: "E",
        distanceCm: 20,
        potMaterial: "unspecified",
        soilMix: "unspecified",
      })
    ).toBe(false);

    expect(tuneDaysInterval(7, {})).toBe(7);
    expect(tuneMonthsInterval(12, {})).toBe(12);
  });

  it("shortens watering intervals for bright, close, fast-drying setups", () => {
    expect(
      tuneDaysInterval(7, {
        lightLevel: "bright-direct",
        orientation: "S",
        distanceCm: 5,
        potMaterial: "terracotta",
        soilMix: "cactus-succulent",
      })
    ).toBe(5);
  });

  it("lengthens watering intervals for dim, distant, moisture-retentive setups", () => {
    expect(
      tuneDaysInterval(7, {
        lightLevel: "very-low",
        orientation: "N",
        distanceCm: 80,
        potMaterial: "self-watering",
        soilMix: "coco-coir",
      })
    ).toBe(9);
  });

  it("respects bounds and max delta options", () => {
    expect(
      tuneDaysInterval(
        2,
        {
          lightLevel: "bright-direct",
          orientation: "S",
          distanceCm: 0,
          potMaterial: "terracotta",
        },
        { minDays: 1, maxDays: 90, maxDelta: 1 }
      )
    ).toBe(1);

    expect(
      tuneDaysInterval(
        89,
        {
          lightLevel: "very-low",
          orientation: "N",
          distanceCm: 100,
          potMaterial: "self-watering",
        },
        { minDays: 1, maxDays: 90 }
      )
    ).toBe(90);
  });

  it("nudges repot intervals only for strong signals", () => {
    expect(
      tuneMonthsInterval(12, {
        lightLevel: "bright-direct",
        orientation: "S",
        distanceCm: 5,
        potMaterial: "terracotta",
      })
    ).toBe(11);

    expect(
      tuneMonthsInterval(12, {
        lightLevel: "very-low",
        orientation: "N",
        distanceCm: 100,
        potMaterial: "self-watering",
      })
    ).toBe(13);
  });
});

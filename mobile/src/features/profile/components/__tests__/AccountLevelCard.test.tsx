import React from "react";
import { render } from "@testing-library/react-native";
import AccountLevelCard from "../AccountLevelCard";
import { accountRankForLevel } from "../../constants/account-level.constants";

describe("account level display", () => {
  it.each([
    [1, 10, "Seedling", "🌱"],
    [11, 20, "Sprout Keeper", "🌱"],
    [21, 30, "Leaf Lover", "🍃"],
    [31, 40, "Budding Gardener", "🌿"],
    [41, 50, "Plant Nurturer", "🪴"],
    [51, 60, "Green Thumb", "🌳"],
    [61, 70, "Garden Guardian", "🌸"],
    [71, 80, "Botanical Expert", "🌺"],
    [81, 90, "Master Grower", "🏵️"],
    [91, 100, "Plant Legend", "🏆"],
  ])("keeps the title and badge for levels %i–%i", (start, end, title, badge) => {
    for (let level = Number(start); level <= Number(end); level++) {
      expect(accountRankForLevel(level)).toMatchObject({ level, title, badge });
    }
  });

  it("shows unavailable progress without inventing earned XP or a starting rank", () => {
    const view = render(<AccountLevelCard />);
    expect(view.queryByText("Seedling")).toBeNull();
    expect(view.queryByText("1")).toBeNull();
    expect(view.getByText("Couldn’t load your level. Open Profile again to retry.")).toBeTruthy();
    expect(view.getByText("— XP")).toBeTruthy();
    expect(view.queryByText("Next rank at level 11")).toBeNull();
    expect(view.getByRole("progressbar").props.accessibilityValue.now).toBeUndefined();
  });

  it("uses an explicit loading state until server progression arrives", () => {
    const view = render(<AccountLevelCard loading />);
    expect(view.getByText("Loading XP…")).toBeTruthy();
    expect(view.queryByText("XP tracking coming soon")).toBeNull();
    expect(view.queryByText("Seedling")).toBeNull();
  });

  it("shows a real zero-XP account from the server", () => {
    const view = render(<AccountLevelCard progress={{ level: 1, xpIntoLevel: 0, xpForNextLevel: 100 }} />);
    expect(view.getByText("Seedling")).toBeTruthy();
    expect(view.getByText("0 / 100 XP")).toBeTruthy();
    expect(view.getByText("To level 2")).toBeTruthy();
  });

  it("renders read-only server progress and the next rank boundary", () => {
    const view = render(<AccountLevelCard progress={{ level: 37, xpIntoLevel: 650, xpForNextLevel: 1000 }} />);
    expect(view.getByText("Budding Gardener")).toBeTruthy();
    expect(view.getByText("To level 38")).toBeTruthy();
    expect(view.getByText("650 / 1000 XP")).toBeTruthy();
    expect(view.getByText("350 XP to next level")).toBeTruthy();
    expect(view.getByText("Next rank at level 41")).toBeTruthy();
    expect(view.getByRole("progressbar").props.accessibilityValue.now).toBe(65);
  });

  it("caps the display at level 100 without a level 101 or another rank", () => {
    const view = render(<AccountLevelCard progress={{ level: 100, xpIntoLevel: 0, xpForNextLevel: 0 }} />);
    expect(view.getByText("Plant Legend")).toBeTruthy();
    expect(view.getByText("Maximum level reached")).toBeTruthy();
    expect(view.getByText("All ranks unlocked")).toBeTruthy();
    expect(view.queryByText("To level 101")).toBeNull();
    expect(view.queryByText(/Next rank at/)).toBeNull();
    expect(view.getByRole("progressbar").props.accessibilityValue.now).toBe(100);
  });
});

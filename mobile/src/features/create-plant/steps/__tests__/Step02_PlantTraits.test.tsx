import React from "react";
import { ImageBackground } from "react-native";
import { act, render, waitFor } from "@testing-library/react-native";
import Step02_PlantTraits from "../Step02_PlantTraits";
import CenteredSpinner from "../../../../shared/ui/CenteredSpinner";
import { request } from "../../../../api/client";
import { useWizardImagePreload } from "../../hooks/useWizardImagePreload";

let mockSelected: any;
let mockImageLoading = true;
const mockPersist = jest.fn();
const mockT = (key: string, options?: any) => options?.defaultValue ?? key;
const mockI18n = { language: "en", changeLanguage: jest.fn(async () => undefined) };
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT, i18n: mockI18n }) }));
jest.mock("../../../../app/providers/LanguageProvider", () => ({ useLanguage: () => ({ currentLanguage: "en" }) }));
jest.mock("../../../../app/providers/SettingsProvider", () => ({ useSettings: () => ({ settings: { language: "en", temperatureUnit: "celsius" } }) }));
jest.mock("../../hooks/useCreatePlantWizard", () => ({
  useCreatePlantWizard: () => ({ state: { selectedPlant: mockSelected }, actions: { setSelectedPlantDefinition: mockPersist } }),
}));
jest.mock("../../../../api/client", () => ({ request: jest.fn() }));
jest.mock("../../hooks/useWizardImagePreload", () => ({
  useWizardImagePreload: jest.fn((uris: unknown[], enabled: boolean) => ({ loading: enabled && uris.some(Boolean) && mockImageLoading })),
}));
jest.mock("@react-native-masked-view/masked-view", () => (props: any) =>
  require("react").createElement(require("react-native").View, props, props.children));

const profile = { id: 1, name: "Bird of paradise", latin: "Strelitzia alba", image: "https://example.test/bird.jpg",
  description: "Loaded plant details", traits: [] };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => {
  jest.clearAllMocks(); mockImageLoading = true;
  mockSelected = { id: "1", name: "Bird", latin: "Strelitzia alba" };
  (request as jest.Mock).mockResolvedValue(profile);
});

it("waits for profile data and its image before revealing the final-height tile", async () => {
  const data = deferred<typeof profile>();
  (request as jest.Mock).mockReturnValueOnce(data.promise);
  const ready = jest.fn();
  const view = render(<Step02_PlantTraits onReadyChange={ready} />);
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  expect(view.queryByText("Bird")).toBeNull();
  expect(ready).toHaveBeenLastCalledWith(false);
  await act(async () => { data.resolve(profile); });
  expect(useWizardImagePreload).toHaveBeenLastCalledWith([profile.image], true);
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  expect(view.queryByText(profile.description)).toBeNull();
  expect(view.UNSAFE_queryAllByType(ImageBackground)).toHaveLength(0);
  mockImageLoading = false;
  view.rerender(<Step02_PlantTraits onReadyChange={ready} />);
  expect(view.UNSAFE_queryAllByType(CenteredSpinner)).toHaveLength(0);
  expect(view.getByText(profile.description)).toBeTruthy();
  expect(view.UNSAFE_getByType(ImageBackground).props.source).toEqual({ uri: profile.image });
  expect(ready).toHaveBeenLastCalledWith(true);
});

it("settles a failed profile request into the existing error tile", async () => {
  (request as jest.Mock).mockRejectedValueOnce(new Error("Offline"));
  const ready = jest.fn(); const view = render(<Step02_PlantTraits onReadyChange={ready} />);
  await view.findByText("Offline");
  expect(view.UNSAFE_queryAllByType(CenteredSpinner)).toHaveLength(0);
  expect(ready).toHaveBeenLastCalledWith(true);
});

it("does not wait for an image when the user has no linked definition", async () => {
  mockSelected = undefined;
  const ready = jest.fn(); const view = render(<Step02_PlantTraits onReadyChange={ready} />);
  await waitFor(() => expect(ready).toHaveBeenLastCalledWith(true));
  expect(request).not.toHaveBeenCalled();
  expect(view.UNSAFE_queryAllByType(CenteredSpinner)).toHaveLength(0);
});

it("conceals a previous profile immediately when the selection changes", async () => {
  mockImageLoading = false;
  const view = render(<Step02_PlantTraits />);
  await view.findByText(profile.description);
  const next = deferred<typeof profile>();
  (request as jest.Mock).mockReturnValueOnce(next.promise);
  mockSelected = { id: "2", name: "Fern", latin: "Asplenium nidus" };
  view.rerender(<Step02_PlantTraits />);
  expect(view.queryByText(profile.description)).toBeNull();
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  await act(async () => { next.resolve({ ...profile, id: 2, description: "Fern details" }); });
  expect(view.getByText("Fern details")).toBeTruthy();
});

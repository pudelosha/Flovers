import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import SharePlantModal from "../SharePlantModal";
import ContactModalFrame from "../ContactModalFrame";
import { fetchPlantInstances } from "../../../../api/services/plant-instances.service";

const mockT = (_key: string, values: any = {}) => String(values.defaultValue ?? _key).replace(/{{(\w+)}}/g, (_, key) => String(values[key] ?? ""));
let mockSharing: any;
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock("../../state/SharingPreviewProvider", () => ({ useSharingPreview: () => mockSharing }));
jest.mock("../../../../api/services/plant-instances.service", () => ({ fetchPlantInstances: jest.fn() }));
jest.mock("@react-native-community/datetimepicker", () => (props: any) =>
  require("react").createElement(require("react-native").View, { ...props, testID: "end-date-picker" }));
jest.mock("../SharingUI", () => {
  const React = require("react");
  const { Text, Pressable } = require("react-native");
  return {
    sharingStyles: {},
    PreviewNotice: () => React.createElement(Text, null, "Preview only"),
    SharingButton: ({ label, onPress, disabled }: any) => React.createElement(Pressable, { onPress, disabled }, React.createElement(Text, null, label)),
  };
});

const contacts = [
  { id: "anna", name: "Anna", email: "anna@example.test", floversId: "FL-ANNA" },
  { id: "bruno", name: "Bruno", email: "bruno@example.test", floversId: "FL-BRUNO" },
];
const bird = { id: "1", name: "Bird", location: "Living room" };
const pilea = { id: "2", name: "Pilea", location: "Living room" };
const apiPlants = [
  { id: 1, display_name: "Bird", location: { id: 1, name: "Living room" } },
  { id: 2, display_name: "Pilea", location: { id: 1, name: "Living room" } },
];
const fetchPlants = fetchPlantInstances as jest.Mock;
const existing = (plant: typeof bird, contactId: string, canCompleteTasks: boolean, endsOn?: string) => ({
  id: plant.id + "-" + contactId, direction: "outgoing", plant, contactId, canCompleteTasks, endsOn,
});
async function loaded(view: ReturnType<typeof render>) {
  await waitFor(() => expect(view.getByLabelText("Select Pilea")).toBeTruthy());
}

describe("SharePlantModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchPlants.mockResolvedValue(apiPlants);
    mockSharing = {
      contacts, shares: [], shareDraft: {},
      closeSharePlant: jest.fn(), savePlantsSharing: jest.fn(),
    };
  });

  it("keeps catalogue photos and Latin names when plants are shared", async () => {
    fetchPlants.mockResolvedValue([
      { ...apiPlants[0], plant_definition: { id: 77, name: "Bird of paradise", latin: "Strelitzia alba", image_thumb: "https://example.test/bird.jpg" } },
      apiPlants[1],
    ]);
    const view = render(<SharePlantModal />);
    await loaded(view);
    fireEvent.press(view.getByLabelText("Select Bird"));
    fireEvent.press(view.getByLabelText("Select Anna"));
    fireEvent.press(view.getByText("Share selected plants"));
    expect(mockSharing.savePlantsSharing).toHaveBeenCalledWith([
      { plant: { ...bird, latin: "Strelitzia alba", imageUrl: "https://example.test/bird.jpg" },
        recipients: [{ contactId: "anna", canCompleteTasks: false, endsOn: undefined }] },
    ]);
  });

  it("preserves a prefilled custom photo instead of replacing it with the catalogue photo", async () => {
    const custom = { ...bird, latin: "Strelitzia alba", imageUrl: "file:///plant-photo.jpg" };
    mockSharing.shareDraft = { plant: custom, contactId: "anna" };
    fetchPlants.mockResolvedValue([
      { ...apiPlants[0], plant_definition: { id: 77, name: "Bird of paradise", latin: "Strelitzia alba", image_thumb: "https://example.test/bird.jpg" } },
      apiPlants[1],
    ]);
    const view = render(<SharePlantModal />);
    await loaded(view);
    fireEvent.press(view.getByText("Share selected plants"));
    expect(mockSharing.savePlantsSharing).toHaveBeenCalledWith([
      { plant: custom, recipients: [{ contactId: "anna", canCompleteTasks: false, endsOn: undefined }] },
    ]);
  });

  it("uses the Profile modal frame and requires plants and accepted recipients", async () => {
    const view = render(<SharePlantModal />);
    expect(view.UNSAFE_getByType(ContactModalFrame)).toBeTruthy();
    expect(view.getByText("Share plants")).toBeTruthy();
    fireEvent.press(view.getByText("Share selected plants"));
    expect(mockSharing.savePlantsSharing).not.toHaveBeenCalled();
    await loaded(view);
    fireEvent.press(view.getByLabelText("Select Bird"));
    fireEvent.press(view.getByLabelText("Select Anna"));
    expect(view.getByLabelText("Anna: View only").props.accessibilityState.checked).toBe(true);
    fireEvent.press(view.getByText("Share selected plants"));
    expect(mockSharing.savePlantsSharing).toHaveBeenCalledWith([
      { plant: bird, recipients: [{ contactId: "anna", canCompleteTasks: false, endsOn: undefined }] },
    ]);
    expect(mockSharing.closeSharePlant).toHaveBeenCalledTimes(1);
    expect(view.getByText("Preview only")).toBeTruthy();
  });

  it("keeps two plants selected and applies explicit permissions to both", async () => {
    const view = render(<SharePlantModal />);
    await loaded(view);
    fireEvent.press(view.getByLabelText("Select Bird"));
    fireEvent.press(view.getByLabelText("Select Pilea"));
    expect(view.getByLabelText("Select Bird").props.accessibilityState.checked).toBe(true);
    expect(view.getByLabelText("Select Pilea").props.accessibilityState.checked).toBe(true);
    expect(view.getByText("Plants selected: 2")).toBeTruthy();
    fireEvent.press(view.getByLabelText("Select Anna"));
    fireEvent.press(view.getByLabelText("Select Bruno"));
    fireEvent.press(view.getByLabelText("Anna: Can complete tasks"));
    fireEvent.press(view.getByText("Share selected plants"));
    const recipients = [
      { contactId: "anna", canCompleteTasks: true, endsOn: undefined },
      { contactId: "bruno", canCompleteTasks: false, endsOn: undefined },
    ];
    expect(mockSharing.savePlantsSharing).toHaveBeenCalledWith([
      { plant: bird, recipients }, { plant: pilea, recipients },
    ]);
  });

  it("excludes unchecked plants from the batch", async () => {
    const view = render(<SharePlantModal />);
    await loaded(view);
    fireEvent.press(view.getByLabelText("Select Bird"));
    fireEvent.press(view.getByLabelText("Select Pilea"));
    fireEvent.press(view.getByLabelText("Select Anna"));
    fireEvent.press(view.getByLabelText("Select Bird"));
    fireEvent.press(view.getByText("Share selected plants"));
    expect(mockSharing.savePlantsSharing).toHaveBeenCalledWith([
      { plant: pilea, recipients: [{ contactId: "anna", canCompleteTasks: false, endsOn: undefined }] },
    ]);
  });

  it("retains unsaved per-plant drafts through deselection and reselection", async () => {
    const view = render(<SharePlantModal />);
    await loaded(view);
    fireEvent.press(view.getByLabelText("Select Bird"));
    fireEvent.press(view.getByLabelText("Select Anna"));
    fireEvent.press(view.getByLabelText("Anna: Can complete tasks"));
    fireEvent.press(view.getByLabelText("Select Bird"));
    fireEvent.press(view.getByLabelText("Select Pilea"));
    fireEvent.press(view.getByLabelText("Select Bruno"));
    fireEvent.press(view.getByLabelText("Select Bird"));
    expect(view.getByLabelText("Select Anna").props.accessibilityState.checked).toBe("mixed");
    fireEvent.press(view.getByText("Share selected plants"));
    expect(mockSharing.savePlantsSharing).toHaveBeenCalledWith([
      { plant: pilea, recipients: [{ contactId: "bruno", canCompleteTasks: false, endsOn: undefined }] },
      { plant: bird, recipients: [{ contactId: "anna", canCompleteTasks: true, endsOn: undefined }] },
    ]);
  });

  it("preserves nonuniform existing recipients, permissions and dates when untouched", async () => {
    mockSharing.shareDraft = { plant: bird };
    mockSharing.shares = [
      existing(bird, "anna", true, "2030-05-01"),
      existing(bird, "bruno", false),
      existing(pilea, "anna", false, "2030-09-12"),
    ];
    const view = render(<SharePlantModal />);
    await loaded(view);
    fireEvent.press(view.getByLabelText("Select Pilea"));
    expect(view.getByText("Permissions differ between the selected plants.")).toBeTruthy();
    expect(view.getByText("End dates differ between the selected plants.")).toBeTruthy();
    expect(view.getByLabelText("Select Bruno").props.accessibilityState.checked).toBe("mixed");
    fireEvent.press(view.getByText("Save sharing"));
    expect(mockSharing.savePlantsSharing).toHaveBeenCalledWith([
      { plant: bird, recipients: [
        { contactId: "anna", canCompleteTasks: true, endsOn: "2030-05-01" },
        { contactId: "bruno", canCompleteTasks: false, endsOn: undefined },
      ] },
      { plant: pilea, recipients: [{ contactId: "anna", canCompleteTasks: false, endsOn: "2030-09-12" }] },
    ]);
  });

  it("adds missing access from a mixed checkbox while preserving existing permission", async () => {
    mockSharing.shareDraft = { plant: bird };
    mockSharing.shares = [existing(bird, "anna", true, "2030-05-01")];
    const view = render(<SharePlantModal />);
    await loaded(view);
    fireEvent.press(view.getByLabelText("Select Pilea"));
    expect(view.getByLabelText("Select Anna").props.accessibilityState.checked).toBe("mixed");
    fireEvent.press(view.getByLabelText("Select Anna"));
    expect(view.getByLabelText("Select Anna").props.accessibilityState.checked).toBe(true);
    expect(view.getByText("Permissions differ between the selected plants.")).toBeTruthy();
    fireEvent.press(view.getByText("Save sharing"));
    expect(mockSharing.savePlantsSharing).toHaveBeenCalledWith([
      { plant: bird, recipients: [{ contactId: "anna", canCompleteTasks: true, endsOn: "2030-05-01" }] },
      { plant: pilea, recipients: [{ contactId: "anna", canCompleteTasks: false, endsOn: "2030-05-01" }] },
    ]);
  });

  it("changes a mixed permission only after an explicit choice", async () => {
    mockSharing.shareDraft = { plant: bird };
    mockSharing.shares = [
      existing(bird, "anna", true, "2030-05-01"), existing(bird, "bruno", true),
      existing(pilea, "anna", false, "2030-09-12"),
    ];
    const view = render(<SharePlantModal />);
    await loaded(view);
    fireEvent.press(view.getByLabelText("Select Pilea"));
    expect(view.getByLabelText("Anna: View only").props.accessibilityState.checked).toBe(false);
    expect(view.getByLabelText("Anna: Can complete tasks").props.accessibilityState.checked).toBe(false);
    fireEvent.press(view.getByLabelText("Anna: View only"));
    fireEvent.press(view.getByText("Save sharing"));
    expect(mockSharing.savePlantsSharing).toHaveBeenCalledWith([
      { plant: bird, recipients: [
        { contactId: "anna", canCompleteTasks: false, endsOn: "2030-05-01" },
        { contactId: "bruno", canCompleteTasks: true, endsOn: undefined },
      ] },
      { plant: pilea, recipients: [{ contactId: "anna", canCompleteTasks: false, endsOn: "2030-09-12" }] },
    ]);
  });

  it("applies an explicitly selected end date across the selected access", async () => {
    mockSharing.shareDraft = { plant: bird };
    mockSharing.shares = [existing(bird, "anna", true, "2030-05-01"), existing(pilea, "anna", false, "2030-09-12")];
    const view = render(<SharePlantModal />);
    await loaded(view);
    fireEvent.press(view.getByLabelText("Select Pilea"));
    fireEvent.press(view.getByText("Choose a date"));
    fireEvent(view.getByTestId("end-date-picker"), "change", { type: "set" }, new Date(2030, 5, 12, 12));
    fireEvent.press(view.getByText("Save sharing"));
    expect(mockSharing.savePlantsSharing).toHaveBeenCalledWith([
      { plant: bird, recipients: [{ contactId: "anna", canCompleteTasks: true, endsOn: "2030-06-12" }] },
      { plant: pilea, recipients: [{ contactId: "anna", canCompleteTasks: false, endsOn: "2030-06-12" }] },
    ]);
  });

  it("can explicitly remove differing end dates without changing permissions", async () => {
    mockSharing.shareDraft = { plant: bird };
    mockSharing.shares = [existing(bird, "anna", true, "2030-05-01"), existing(pilea, "anna", false)];
    const view = render(<SharePlantModal />);
    await loaded(view);
    fireEvent.press(view.getByLabelText("Select Pilea"));
    fireEvent.press(view.getByText("No end date"));
    fireEvent.press(view.getByText("Save sharing"));
    expect(mockSharing.savePlantsSharing).toHaveBeenCalledWith([
      { plant: bird, recipients: [{ contactId: "anna", canCompleteTasks: true, endsOn: undefined }] },
      { plant: pilea, recipients: [{ contactId: "anna", canCompleteTasks: false, endsOn: undefined }] },
    ]);
  });

  it("allows clearing an existing plant but blocks an empty new plant in the same batch", async () => {
    mockSharing.shareDraft = { plant: bird };
    mockSharing.shares = [existing(bird, "anna", true)];
    const view = render(<SharePlantModal />);
    await loaded(view);
    fireEvent.press(view.getByLabelText("Select Anna"));
    fireEvent.press(view.getByLabelText("Select Pilea"));
    fireEvent.press(view.getByText("Save sharing"));
    expect(mockSharing.savePlantsSharing).not.toHaveBeenCalled();
    fireEvent.press(view.getByLabelText("Select Pilea"));
    fireEvent.press(view.getByText("Save sharing"));
    expect(mockSharing.savePlantsSharing).toHaveBeenCalledWith([{ plant: bird, recipients: [] }]);
  });

  it("preselects the draft contact for each newly selected plant", async () => {
    mockSharing.shareDraft = { contactId: "anna" };
    const view = render(<SharePlantModal />);
    await loaded(view);
    fireEvent.press(view.getByLabelText("Select Bird"));
    fireEvent.press(view.getByLabelText("Select Pilea"));
    fireEvent.press(view.getByText("Share selected plants"));
    expect(mockSharing.savePlantsSharing).toHaveBeenCalledWith([
      { plant: bird, recipients: [{ contactId: "anna", canCompleteTasks: false, endsOn: undefined }] },
      { plant: pilea, recipients: [{ contactId: "anna", canCompleteTasks: false, endsOn: undefined }] },
    ]);
  });

  it("shows a load error and allows retry without saving sharing", async () => {
    fetchPlants.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(apiPlants);
    const view = render(<SharePlantModal />);
    await waitFor(() => expect(view.getByText("Could not load your plants.")).toBeTruthy());
    fireEvent.press(view.getByText("Try again"));
    await loaded(view);
    expect(fetchPlants).toHaveBeenCalledTimes(2);
    expect(mockSharing.savePlantsSharing).not.toHaveBeenCalled();
  });

  it("ignores plant responses from a draft that has already closed", async () => {
    let finish!: (value: any) => void;
    fetchPlants.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const view = render(<SharePlantModal />);
    mockSharing.shareDraft = null;
    view.rerender(<SharePlantModal />);
    await act(async () => finish(apiPlants));
    expect(view.queryByText("Bird")).toBeNull();
    expect(mockSharing.savePlantsSharing).not.toHaveBeenCalled();
  });

  it("keeps sharing disabled without accepted contacts and cancels without saving", async () => {
    mockSharing.contacts = [];
    mockSharing.shareDraft = { plant: bird };
    const view = render(<SharePlantModal />);
    await loaded(view);
    expect(view.getByText("Add and accept a contact before sharing a plant.")).toBeTruthy();
    fireEvent.press(view.getByText("Share selected plants"));
    expect(mockSharing.savePlantsSharing).not.toHaveBeenCalled();
    fireEvent.press(view.getByText("Cancel"));
    expect(mockSharing.closeSharePlant).toHaveBeenCalledTimes(1);
  });
});

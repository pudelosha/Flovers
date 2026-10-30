import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import PlantMenu from "../../../features/plants/components/PlantMenu";
import TaskMenu from "../../../features/home/components/TaskMenu";
import PlantInfoMenu from "../../../features/plant-details/components/PlantInfoMenu";
import PlantReminderMenu from "../../../features/plant-details/components/PlantReminderMenu";
import ReadingMenu from "../../../features/readings/components/ReadingMenu";
import ReminderMenu from "../../../features/reminders/components/ReminderMenu";
import ReminderMiniTileMenu from "../../../features/reminders/components/ReminderMiniTileMenu";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

jest.mock("../../../app/providers/LanguageProvider", () => ({ useLanguage: () => ({ currentLanguage: "en" }) }));
const noop = () => {};
it("keeps shared plants navigable while hiding owner actions", () => {
  const details = jest.fn(); const view = render(<PlantMenu canEdit={false} onDetails={details} onEdit={noop} onReminders={noop} onJournal={noop} onDelete={noop} onShowQr={noop} onShare={noop} />);
  expect(view.queryByText("Edit plant")).toBeNull(); expect(view.queryByText("Delete plant")).toBeNull(); expect(view.queryByText("Show QR code")).toBeNull(); expect(view.queryByText("Share plant")).toBeNull();
  expect(view.queryByText("Show reminders")).toBeNull();
  fireEvent.press(view.getByText("Plant details")); expect(details).toHaveBeenCalledTimes(1);
});
it("does not offer completion or editing for view-only tasks", () => {
  const view = render(<TaskMenu canEdit={false} canComplete={false} onEdit={noop} onMarkComplete={noop} onGoToPlant={noop} onDelete={noop} />);
  expect(view.queryByText("home.menu.markAsComplete")).toBeNull(); expect(view.queryByText("home.menu.editReminder")).toBeNull(); expect(view.queryByText("home.menu.delete")).toBeNull(); expect(view.getByText("home.menu.goToPlant")).toBeTruthy();
});
it("permits caregiver task completion without exposing reminder editing", () => {
  const complete = jest.fn(); const view = render(<TaskMenu canEdit={false} canComplete onEdit={noop} onMarkComplete={complete} onGoToPlant={noop} />);
  fireEvent.press(view.getByText("home.menu.markAsComplete")); expect(complete).toHaveBeenCalledTimes(1); expect(view.queryByText("home.menu.editReminder")).toBeNull();
});
it("hides image, edit, and sharing controls in shared plant details", () => {
  const view = render(<PlantInfoMenu canEdit={false} onPlantDefinition={noop} onEditPlant={noop} onChangeImage={noop} onShowReminders={noop} onShare={noop} />);
  expect(view.queryByText("Edit plant")).toBeNull(); expect(view.queryByText("Change image")).toBeNull(); expect(view.queryByText("Share plant")).toBeNull(); expect(view.queryByText("Show reminders")).toBeNull();
});
it("keeps shared reminder history available without completion or edits", () => {
  const view = render(<PlantReminderMenu canEdit={false} canComplete={false} onMarkComplete={noop} onEdit={noop} onShowHistory={noop} />);
  expect(view.queryByText("Mark as complete")).toBeNull(); expect(view.queryByText("Edit reminder")).toBeNull(); expect(view.getByText("Show history")).toBeTruthy();
});
it("does not expose device credentials or mutations for shared readings", () => {
  const view = render(<ReadingMenu canEdit={false} onEdit={noop} onDeviceDetails={noop} onHistory={noop} onPlantDetails={noop} onDelete={noop} />);
  expect(view.queryByText("Device details")).toBeNull(); expect(view.queryByText("Edit device")).toBeNull(); expect(view.queryByText("Delete device")).toBeNull(); expect(view.getByText("Readings history")).toBeTruthy();
});
it("offers shared reminder navigation instead of schedule mutations", () => {
  const details = jest.fn(); const view = render(<ReminderMenu canEdit={false} isActive onEdit={noop} onToggleActive={noop} onDelete={noop} onPlantDetails={details} />);
  expect(view.queryByText("Edit reminder")).toBeNull(); expect(view.queryByText("Pause reminder")).toBeNull(); expect(view.queryByText("Delete reminder")).toBeNull(); fireEvent.press(view.getByText("Plant details")); expect(details).toHaveBeenCalledTimes(1);
});

it.each([
  { name: "list", Menu: ReminderMenu },
  { name: "calendar", Menu: ReminderMiniTileMenu },
])("offers Plant details third in the $name reminder menu with the same icon", ({ Menu }) => {
  const details = jest.fn();
  const view = render(<Menu isActive onEdit={noop} onToggleActive={noop} onDelete={noop} onPlantDetails={details} />);
  expect(view.getAllByText(/^(Edit reminder|Pause reminder|Plant details|Delete reminder)$/)
    .map(item => item.props.children)).toEqual(["Edit reminder", "Pause reminder", "Plant details", "Delete reminder"]);
  expect(view.UNSAFE_getAllByType(MaterialCommunityIcons)[2].props.name).toBe("sprout-outline");
  fireEvent.press(view.getByText("Plant details"));
  expect(details).toHaveBeenCalledTimes(1);
});

it("keeps Plant details third when a reminder is paused", () => {
  const view = render(<ReminderMenu isActive={false} onEdit={noop} onToggleActive={noop} onDelete={noop} onPlantDetails={noop} />);
  expect(view.getAllByText(/^(Edit reminder|Resume reminder|Plant details|Delete reminder)$/)
    .map(item => item.props.children)).toEqual(["Edit reminder", "Resume reminder", "Plant details", "Delete reminder"]);
});

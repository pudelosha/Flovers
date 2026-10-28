import React from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import ContactsScreen from "../ContactsScreen";
import { SharingPreviewProvider } from "../../state/SharingPreviewProvider";
import { ContactsProvider } from "../../state/ContactsProvider";
import * as api from "../../../../api/services/contacts.service";
import GlassCard from "../../../profile/components/GlassCard";
import FAB from "../../../../shared/ui/FAB";

let mockFocused = true;
let mockFabPosition = "right";
jest.mock("@react-navigation/native", () => ({ useIsFocused: () => mockFocused }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("../../../../app/providers/SettingsProvider", () => ({ useSettings: () => ({ settings: { fabPosition: mockFabPosition } }) }));
jest.mock("../../../../api/client", () => ({ getAuthSessionId: () => 1 }));
jest.mock("../../../../app/providers/useAuth", () => ({ useAuth: () => ({ user: { id: 1, email: "owner@example.test" } }) }));
jest.mock("@react-native-clipboard/clipboard", () => ({ __esModule: true, default: { setString: jest.fn() } }));
jest.mock("../../../../api/services/contacts.service", () => ({
  fetchContacts: jest.fn(), sendContactInvitation: jest.fn(), acceptContactInvitation: jest.fn(), dismissContactInvitation: jest.fn(), renameContact: jest.fn(), deleteContact: jest.fn(),
  contactsErrorCode: (error: any) => error.reason || "unavailable", isContactIdentifier: (value: string) => value.includes("@") || value.startsWith("FL-"),
}));
jest.mock("../../components/SharingUI", () => {
  const React = require("react"); const { Pressable, Text, View } = require("react-native");
  return {
    SharingPage: ({ children, showBack = true }: any) => React.createElement(View, null, showBack ? React.createElement(Text, null, "Back") : null, children),
    SharingButton: ({ label, onPress, disabled }: any) => React.createElement(Pressable, { accessibilityRole: "button", onPress, disabled }, React.createElement(Text, null, label)), sharingStyles: {},
  };
});
const person = (id: number, name: string) => ({ id: String(id), name, email: `${id}@example.test`, floversId: `FL-${String(id).padStart(32, "0")}` });
const bob = person(2, "Bob"), marta = person(3, "Marta"), alex = person(4, "Alex");
const snapshot = (contacts = [bob], invitations: any[] = [{ id: "11", contact: marta, direction: "incoming" }, { id: "12", contact: alex, direction: "outgoing" }]) => ({ currentUser: person(1, "Owner"), contacts, invitations, counts: { contacts: contacts.length, incoming: invitations.filter((x) => x.direction === "incoming").length, outgoing: invitations.filter((x) => x.direction === "outgoing").length } });
const tree = () => <SharingPreviewProvider><ContactsProvider><ContactsScreen /></ContactsProvider></SharingPreviewProvider>;
async function setup() { const view = render(tree()); await view.findByText("Your Flovers ID"); return view; }
async function openAdd(view: Awaited<ReturnType<typeof setup>>) { fireEvent.press(view.getByText("plus")); fireEvent.press(view.getByText("Add contact")); return view.findByLabelText("Email or Flovers ID"); }
describe("real Contacts screen", () => {
  beforeEach(() => {
    jest.clearAllMocks(); mockFocused = true; mockFabPosition = "right";
    (api.fetchContacts as jest.Mock).mockResolvedValue(snapshot());
    jest.spyOn(View.prototype, "measureInWindow").mockImplementation(function (this: any, callback: any) { this.props.testID === "contacts-screen" ? callback(0, 0, 360, 780) : callback(280, 500, 34, 34); });
  });
  afterEach(() => jest.restoreAllMocks());
  it("waits for real data behind the shared spinner without displaying demo contacts", async () => {
    let resolve: any; (api.fetchContacts as jest.Mock).mockReturnValue(new Promise((done) => { resolve = done; }));
    const view = render(tree()); expect(view.getByTestId("contacts-loading")).toBeTruthy(); expect(view.queryByText("Your Flovers ID")).toBeNull();
    await act(async () => { resolve(snapshot()); }); expect(view.getByText("Bob")).toBeTruthy(); expect(view.queryByText("Anna Kowalska")).toBeNull(); expect(view.queryByText("UI preview")).toBeNull(); expect(view.queryByText("Back")).toBeNull();
  });
  it("retries an unavailable API without showing fake contacts or a fake ID", async () => {
    (api.fetchContacts as jest.Mock).mockRejectedValueOnce(new Error("offline")); const view = render(tree());
    await view.findByText("Could not load contacts."); expect(view.UNSAFE_queryAllByType(FAB)).toHaveLength(0); fireEvent.press(view.getByText("Try again")); await view.findByText("Your Flovers ID");
  });
  it("accepts and cancels invitations only after server confirmation", async () => {
    (api.acceptContactInvitation as jest.Mock).mockResolvedValue(snapshot([bob, marta], [{ id: "12", contact: alex, direction: "outgoing" }]));
    (api.dismissContactInvitation as jest.Mock).mockResolvedValue(snapshot([bob, marta], [])); const view = await setup();
    fireEvent.press(view.getByRole("button", { name: "Accept" })); await view.findByRole("button", { name: "Actions for Marta" }); expect(api.acceptContactInvitation).toHaveBeenCalledWith("11");
    fireEvent.press(view.getByRole("button", { name: "Cancel invitation" })); await view.findByText("No pending invitations"); expect(api.dismissContactInvitation).toHaveBeenCalledWith("12");
  });
  it("keeps the incoming request when acceptance fails", async () => {
    (api.acceptContactInvitation as jest.Mock).mockRejectedValue(new Error("offline")); const view = await setup(); fireEvent.press(view.getByRole("button", { name: "Accept" }));
    await view.findByText("Could not connect. Please try again."); expect(view.getByRole("button", { name: "Accept" })).toBeTruthy();
  });
  it("validates identifiers, shows API errors, and keeps the invite modal until success", async () => {
    const view = await setup(); const field = await openAdd(view); fireEvent.changeText(field, "invalid"); fireEvent.press(view.getByRole("button", { name: "Send invitation" }));
    await view.findByText("Enter a valid email address or Flovers ID."); expect(api.sendContactInvitation).not.toHaveBeenCalled();
    (api.sendContactInvitation as jest.Mock).mockRejectedValueOnce({ reason: "notFound" }).mockResolvedValueOnce(snapshot());
    fireEvent.changeText(field, "friend@example.test"); fireEvent.press(view.getByRole("button", { name: "Send invitation" })); await view.findByText("No active Flovers account matches this email address or ID.");
    expect(view.getByLabelText("Email or Flovers ID")).toBeTruthy();
    await act(async () => { fireEvent.press(view.getByRole("button", { name: "Send invitation" })); });
    expect(api.sendContactInvitation).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(view.queryByLabelText("Email or Flovers ID")).toBeNull());
  });
  it("keeps the Reminders-style menu outside the contacts tile", async () => {
    const view = await setup(); const tile = view.UNSAFE_getAllByType(GlassCard)[1]; const count = within(tile).getAllByRole("button").length;
    fireEvent.press(view.getByRole("button", { name: "Actions for Bob" })); expect(StyleSheet.flatten(view.getByTestId("contact-actions-menu").props.style)).toMatchObject({ position: "absolute", right: 52, top: 494, maxWidth: 296, elevation: 0, shadowOpacity: 0 });
    expect(within(tile).getAllByRole("button", { includeHiddenElements: true })).toHaveLength(count); fireEvent.press(view.getByRole("button", { name: "Close" })); expect(view.queryByRole("button", { name: "Edit" })).toBeNull();
  });
  it("moves taller menus above the anchor", async () => {
    const view = await setup(); fireEvent.press(view.getByRole("button", { name: "Actions for Bob" })); fireEvent(view.getByTestId("contact-actions-menu"), "layout", { nativeEvent: { layout: { height: 300 } } }); expect(StyleSheet.flatten(view.getByTestId("contact-actions-menu").props.style).top).toBe(194);
  });
  it("saves a private alias without exposing demo sharing grants", async () => {
    (api.renameContact as jest.Mock).mockResolvedValue(snapshot([{ ...bob, name: "Mom" }])); const view = await setup(); fireEvent.press(view.getByRole("button", { name: "Actions for Bob" })); fireEvent.press(view.getByRole("button", { name: "Edit" }));
    expect(view.getByText(/Plant sharing is still a preview/)).toBeTruthy(); expect(view.queryByText("Golden pothos")).toBeNull(); fireEvent.changeText(view.getByLabelText("Contact name"), "Mom"); fireEvent.press(view.getByRole("button", { name: "Save" })); await view.findByRole("button", { name: "Actions for Mom" }); expect(api.renameContact).toHaveBeenCalledWith("2", "Mom");
  });
  it("keeps the delete dialog open on failure and deletes after server confirmation", async () => {
    (api.deleteContact as jest.Mock).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(snapshot([], [])); const view = await setup(); fireEvent.press(view.getByRole("button", { name: "Actions for Bob" })); fireEvent.press(view.getByRole("button", { name: "Delete" })); fireEvent.press(view.getByRole("button", { name: "Delete" }));
    await view.findByText("Could not connect. Please try again."); expect(view.getByText("Delete contact?")).toBeTruthy(); fireEvent.press(view.getByRole("button", { name: "Delete" })); await view.findByText("No contacts yet"); expect(view.queryByText("Delete contact?")).toBeNull();
  });
  it("copies the permanent public ID", async () => { const view = await setup(); fireEvent.press(view.getByRole("button", { name: "Copy ID" })); expect(Clipboard.setString).toHaveBeenCalledWith(person(1, "Owner").floversId); expect(view.getByRole("button", { name: "ID copied" })).toBeTruthy(); });
  it("closes dialogs on blur and honors the configured FAB position", async () => {
    mockFabPosition = "left"; const view = await setup(); expect(view.UNSAFE_getByType(FAB).props.position).toBe("left"); await openAdd(view); mockFocused = false; view.rerender(tree()); expect(view.queryByLabelText("Email or Flovers ID")).toBeNull(); expect(view.UNSAFE_queryAllByType(FAB)).toHaveLength(0);
  });
  it("dismisses only the expanded menu on Android Back", async () => {
    let onBack: any; jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, callback) => { onBack = callback; return { remove: jest.fn() }; }); const view = await setup(); fireEvent.press(view.getByRole("button", { name: "Actions for Bob" })); act(() => expect(onBack()).toBe(true)); expect(view.queryByRole("button", { name: "Edit" })).toBeNull();
  });
});

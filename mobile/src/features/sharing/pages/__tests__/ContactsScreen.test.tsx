import React from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";
import { act, fireEvent, render, within } from "@testing-library/react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import ContactsScreen from "../ContactsScreen";
import { SharingPreviewProvider, useSharingPreview } from "../../state/SharingPreviewProvider";
import GlassCard from "../../../profile/components/GlassCard";
import FAB from "../../../../shared/ui/FAB";

let mockFocused = true;
let mockFabPosition: "left" | "right" = "right";
jest.mock("@react-navigation/native", () => ({ useIsFocused: () => mockFocused }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("../../../../app/providers/SettingsProvider", () => ({
  useSettings: () => ({ settings: { fabPosition: mockFabPosition } }),
}));
jest.mock("../../../../api/client", () => ({ getAuthSessionId: () => 1 }));
jest.mock("../../../../app/providers/useAuth", () => ({
  useAuth: () => ({ user: { id: 12, email: "owner@example.test", first_name: "Owner" } }),
}));
jest.mock("@react-native-clipboard/clipboard", () => ({
  __esModule: true, default: { setString: jest.fn() },
}));
jest.mock("../../components/SharingUI", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  return {
    SharingPage: ({ children, showBack = true }: any) => React.createElement(View, null,
      showBack ? React.createElement(Text, null, "Back") : null, children),
    SharingSheet: ({ visible, title, children }: any) => visible
      ? React.createElement(View, null, React.createElement(Text, null, title), children) : null,
    SharingButton: ({ label, onPress, disabled }: any) => React.createElement(
      Pressable, { accessibilityRole: "button", onPress, disabled }, React.createElement(Text, null, label),
    ),
    PreviewNotice: () => React.createElement(Text, null, "UI preview"),
    sharingStyles: {},
  };
}, { virtual: true });

function StateObserver() {
  const { shareDraft, shares, contacts, toast } = useSharingPreview();
  return <>
    <Text testID="share-draft">{shareDraft?.contactId || "closed"}</Text>
    <Text testID="share-count">{shares.length}</Text>
    <Text testID="contact-state">{JSON.stringify(contacts)}</Text>
    <Text testID="toast-kind">{toast?.kind || "none"}</Text>
    <Text testID="toast-variant">{toast?.variant || "none"}</Text>
  </>;
}

function setup() {
  return render(<SharingPreviewProvider><ContactsScreen /><StateObserver /></SharingPreviewProvider>);
}

async function openAddContact(view: ReturnType<typeof setup>) {
  fireEvent.press(view.getByText("plus"));
  fireEvent.press(view.getByText("Add contact"));
  return view.findByLabelText("Email or Flovers ID");
}

describe("Contacts screen preview", () => {
  beforeEach(() => {
    mockFocused = true;
    mockFabPosition = "right";
    jest.clearAllMocks();
    jest.spyOn(View.prototype, "measureInWindow").mockImplementation(function (this: any, callback: any) {
      if (this.props.testID === "contacts-screen") callback(0, 0, 360, 780);
      else callback(280, 500, 34, 34);
    });
  });
  afterEach(() => jest.restoreAllMocks());
  it("accepts an incoming invitation into contacts and cancels a sent invitation", () => {
    const view = setup();
    expect(view.getByText("UI preview")).toBeTruthy();
    expect(view.queryByText("Back")).toBeNull();
    expect(view.queryByRole("button", { name: "Actions for Marta Nowak" })).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Accept" }));
    expect(view.getByRole("button", { name: "Actions for Marta Nowak" })).toBeTruthy();
    expect(view.queryByRole("button", { name: "Accept" })).toBeNull();

    fireEvent.press(view.getByRole("button", { name: "Cancel invitation" }));
    expect(view.queryByText("Alex Taylor")).toBeNull();
    expect(view.getByText("No pending invitations")).toBeTruthy();
  });

  it("validates the identifier and adds a local outgoing invitation from the shared FAB", async () => {
    const view = setup();
    expect(view.queryByText("Add contact")).toBeNull();
    const field = await openAddContact(view);
    fireEvent.changeText(field, "not an address");
    fireEvent.press(view.getByRole("button", { name: "Add invitation" }));
    expect(view.getByText("Enter a valid email address or Flovers ID.")).toBeTruthy();

    fireEvent.changeText(field, "friend@example.test");
    fireEvent.press(view.getByRole("button", { name: "Add invitation" }));
    expect(view.getByText("friend@example.test")).toBeTruthy();
    expect(view.queryByLabelText("Email or Flovers ID")).toBeNull();
  });

  it("opens sharing for one selected contact and displays both sharing directions", () => {
    const view = setup();
    fireEvent.press(view.getByRole("button", { name: "Actions for Anna Kowalska" }));
    fireEvent.press(view.getByRole("button", { name: "Edit" }));
    expect(view.getByText("Golden pothos")).toBeTruthy();
    expect(view.getByText("Monstera")).toBeTruthy();
    expect(view.getByText("Can complete tasks")).toBeTruthy();
    expect(view.getByText("View only")).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Share plants" }));
    expect(view.getByTestId("share-draft").props.children).toBe("preview-anna");
    expect(view.queryByText("Edit contact")).toBeNull();
  });

  it("requires confirmation before removing a contact and their shared plants", () => {
    const view = setup();
    fireEvent.press(view.getByRole("button", { name: "Actions for Anna Kowalska" }));
    fireEvent.press(view.getByRole("button", { name: "Delete" }));
    expect(view.getByText("Delete contact?")).toBeTruthy();
    expect(view.getByTestId("share-count", { includeHiddenElements: true }).props.children).toBe(4);

    fireEvent.press(view.getByRole("button", { name: "Delete" }));
    expect(view.queryByRole("button", { name: "Actions for Anna Kowalska" })).toBeNull();
    expect(view.getByTestId("share-count").props.children).toBe(2);
  });

  it("copies the explicitly labelled preview ID", () => {
    const view = setup();
    expect(view.getByText("Your preview Flovers ID")).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Copy ID" }));
    expect(Clipboard.setString).toHaveBeenCalledWith("FL-DEMO-ME");
    expect(view.getByRole("button", { name: "ID copied" })).toBeTruthy();
    expect(view.getByTestId("toast-kind").props.children).toBe("idCopied");
    expect(view.getByTestId("toast-variant").props.children).toBe("success");
  });

  it("reports a clipboard failure and clears the copied state", () => {
    const view = setup();
    fireEvent.press(view.getByRole("button", { name: "Copy ID" }));
    (Clipboard.setString as jest.Mock).mockImplementationOnce(() => { throw new Error("Clipboard unavailable"); });
    fireEvent.press(view.getByRole("button", { name: "ID copied" }));
    expect(view.getByRole("button", { name: "Copy ID" })).toBeTruthy();
    expect(view.getByTestId("toast-kind").props.children).toBe("copyFailed");
    expect(view.getByTestId("toast-variant").props.children).toBe("error");
  });

  it("closes sheets on blur so a hidden Contacts tab cannot retain an open overlay", async () => {
    const view = setup();
    await openAddContact(view);
    mockFocused = false;
    view.rerender(<SharingPreviewProvider><ContactsScreen /><StateObserver /></SharingPreviewProvider>);
    expect(view.queryByLabelText("Email or Flovers ID")).toBeNull();

    mockFocused = true;
    view.rerender(<SharingPreviewProvider><ContactsScreen /><StateObserver /></SharingPreviewProvider>);
    expect(view.queryByLabelText("Email or Flovers ID")).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Actions for Anna Kowalska" }));
    fireEvent.press(view.getByRole("button", { name: "Edit" }));
    expect(view.getByText("Edit contact")).toBeTruthy();
    mockFocused = false;
    view.rerender(<SharingPreviewProvider><ContactsScreen /><StateObserver /></SharingPreviewProvider>);
    expect(view.queryByText("Edit contact")).toBeNull();
  });

  it("opens a floating ellipsis menu with only Edit and Delete and dismisses it outside", () => {
    const view = setup();
    expect(view.queryByRole("button", { name: "Anna Kowalska" })).toBeNull();
    expect(view.queryByRole("button", { name: "Edit" })).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Actions for Anna Kowalska" }));
    expect(view.getByRole("button", { name: "Edit" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Delete" })).toBeTruthy();
    expect(view.queryByRole("button", { name: "Share plants" })).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Close" }));
    expect(view.queryByRole("button", { name: "Edit" })).toBeNull();
  });

  it("anchors the popup to the measured ellipsis without adding content to the contacts tile", () => {
    const view = setup();
    const contactsTile = view.UNSAFE_getAllByType(GlassCard)[1];
    const originalButtons = within(contactsTile).getAllByRole("button").length;
    fireEvent.press(view.getByRole("button", { name: "Actions for Anna Kowalska" }));
    const popup = view.getByTestId("contact-actions-menu");
    const popupStyle = StyleSheet.flatten(popup.props.style);
    expect(popupStyle).toMatchObject({ position: "absolute", right: 52, top: 494, maxWidth: 296, elevation: 0, shadowOpacity: 0 });
    expect(popupStyle.width).toBeUndefined();
    expect(popupStyle.left).toBeUndefined();
    expect(within(contactsTile).getAllByRole("button", { includeHiddenElements: true })).toHaveLength(originalButtons);
    expect(within(contactsTile).queryByRole("button", { name: "Edit", includeHiddenElements: true })).toBeNull();
  });

  it("keeps a taller menu above its anchor when it would overlap the bottom bar", () => {
    const view = setup();
    fireEvent.press(view.getByRole("button", { name: "Actions for Anna Kowalska" }));
    fireEvent(view.getByTestId("contact-actions-menu"), "layout", { nativeEvent: { layout: { height: 300 } } });
    expect(StyleSheet.flatten(view.getByTestId("contact-actions-menu").props.style)).toMatchObject({ top: 194 });
  });

  it("changes the private contact name while preserving the account identity and share links", () => {
    const view = setup();
    fireEvent.press(view.getByRole("button", { name: "Actions for Anna Kowalska" }));
    fireEvent.press(view.getByRole("button", { name: "Edit" }));
    const field = view.getByLabelText("Contact name");
    fireEvent.changeText(field, "   ");
    fireEvent.press(view.getByRole("button", { name: "Save" }));
    expect(view.getByText("Enter a contact name (up to 80 characters).")).toBeTruthy();
    fireEvent.changeText(field, "  Mom  ");
    fireEvent.press(view.getByRole("button", { name: "Save" }));
    expect(view.getByRole("button", { name: "Actions for Mom" })).toBeTruthy();
    const contacts = JSON.parse(view.getByTestId("contact-state").props.children);
    expect(contacts.find((contact: any) => contact.id === "preview-anna")).toEqual({
      id: "preview-anna", name: "Mom", email: "anna@example.test", floversId: "FL-DEMO-ANNA",
    });
    expect(view.getByTestId("share-count").props.children).toBe(4);
  });

  it("closes only the expanded contact menu on Android Back", () => {
    let onBack: (() => boolean | null | undefined) | undefined;
    const listener = jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, callback) => {
      onBack = callback;
      return { remove: jest.fn() };
    });
    try {
      const view = setup();
      fireEvent.press(view.getByRole("button", { name: "Actions for Anna Kowalska" }));
      expect(view.getByRole("button", { name: "Edit" })).toBeTruthy();
      act(() => expect(onBack?.()).toBe(true));
      expect(view.queryByRole("button", { name: "Edit" })).toBeNull();
      expect(view.getByRole("button", { name: "Actions for Anna Kowalska" })).toBeTruthy();
    } finally {
      listener.mockRestore();
    }
  });

  it("honors the FAB position and resets its open state after blur and a dialog", async () => {
    mockFabPosition = "left";
    const view = setup();
    expect(view.UNSAFE_getByType(FAB).props.position).toBe("left");
    fireEvent.press(view.getByText("plus"));
    expect(view.getByText("Add contact")).toBeTruthy();
    mockFocused = false;
    view.rerender(<SharingPreviewProvider><ContactsScreen /><StateObserver /></SharingPreviewProvider>);
    expect(view.UNSAFE_queryAllByType(FAB)).toHaveLength(0);
    mockFocused = true;
    view.rerender(<SharingPreviewProvider><ContactsScreen /><StateObserver /></SharingPreviewProvider>);
    expect(view.queryByText("Add contact")).toBeNull();
    await openAddContact(view);
    expect(view.UNSAFE_queryAllByType(FAB)).toHaveLength(0);
    fireEvent.press(view.getByRole("button", { name: "Cancel" }));
    expect(view.UNSAFE_getByType(FAB).props.position).toBe("left");
    expect(view.queryByText("Add contact")).toBeNull();
  });
});

import React from "react";
import { Pressable, Text } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import SharingToastHost from "../SharingToastHost";
import { SharingPreviewProvider, useSharingPreview } from "../../state/SharingPreviewProvider";

let mockDismissCallbacks: (() => void)[] = [];
jest.mock("../../../../api/client", () => ({ getAuthSessionId: () => 1 }));
jest.mock("../../../../app/providers/useAuth", () => ({ useAuth: () => ({ user: { id: 12, email: "owner@example.test" } }) }));
jest.mock("../../../../shared/ui/TopSnackbar", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  return (props: any) => {
    mockDismissCallbacks.push(props.onDismiss);
    return <View><Text testID="toast-message">{props.message}</Text><Text testID="toast-variant">{props.variant}</Text>
      <Pressable onPress={props.onDismiss}><Text>Dismiss toast</Text></Pressable></View>;
  };
});

function Actions() {
  const sharing = useSharingPreview();
  const buttons = [
    ["Invalid invitation", () => sharing.inviteContact("invalid")],
    ["Invite", () => sharing.inviteContact("friend@example.test")],
    ["Accept", () => sharing.acceptInvitation("preview-incoming")],
    ["Decline", () => sharing.dismissInvitation("preview-incoming")],
    ["Cancel invitation", () => sharing.dismissInvitation("preview-outgoing")],
    ["Rename", () => sharing.updateContactName("preview-anna", "Mom")],
    ["Delete", () => sharing.removeContact("preview-anna")],
    ["Remove access", () => sharing.removeShare("preview-pothos-anna")],
    ["Leave", () => sharing.removeShare("preview-monstera-anna")],
    ["Save sharing", () => sharing.savePlantsSharing([
      { plant: { id: "bird", name: "Bird" }, recipients: [{ contactId: "preview-anna", canCompleteTasks: false }] },
      { plant: { id: "pilea", name: "Pilea" }, recipients: [{ contactId: "preview-anna", canCompleteTasks: false }] },
    ])],
    ["Copy failure", () => sharing.notify("copyFailed", "error")],
    ["Reset", () => sharing.resetPreview()],
  ] as const;
  return <>{buttons.map(([label, action]) => <Pressable key={label} onPress={action}><Text>{label}</Text></Pressable>)}</>;
}

function setup() {
  return render(<SharingPreviewProvider><Actions /><SharingToastHost /></SharingPreviewProvider>);
}

describe("Sharing feedback", () => {
  beforeEach(() => { mockDismissCallbacks = []; });
  it("shows truthful preview invitation feedback and leaves validation inline", () => {
    const view = setup();
    fireEvent.press(view.getByText("Invalid invitation"));
    expect(view.queryByTestId("toast-message")).toBeNull();
    fireEvent.press(view.getByText("Invite"));
    expect(view.getByTestId("toast-message").props.children).toBe("Invitation added to the preview.");
    fireEvent.press(view.getByText("Accept"));
    expect(view.getByTestId("toast-message").props.children).toBe("Contact added in this preview.");
    fireEvent.press(view.getByText("Cancel invitation"));
    expect(view.getByTestId("toast-message").props.children).toBe("Invitation cancelled in this preview.");
  });

  it("confirms contact edits and deletions without claiming a live server update", () => {
    const view = setup();
    fireEvent.press(view.getByText("Rename"));
    expect(view.getByTestId("toast-message").props.children).toBe("Contact updated in this preview.");
    fireEvent.press(view.getByText("Delete"));
    expect(view.getByTestId("toast-message").props.children).toBe("Contact deleted in this preview.");
    fireEvent.press(view.getByText("Decline"));
    expect(view.getByTestId("toast-message").props.children).toBe("Invitation declined in this preview.");
  });

  it("confirms batch sharing and distinguishes leaving from revoking access", () => {
    const view = setup();
    fireEvent.press(view.getByText("Save sharing"));
    expect(view.getByTestId("toast-message").props.children).toBe("Sharing updated in this preview.");
    expect(mockDismissCallbacks).toHaveLength(1);
    fireEvent.press(view.getByText("Remove access"));
    expect(view.getByTestId("toast-message").props.children).toBe("Access removed in this preview.");
    fireEvent.press(view.getByText("Leave"));
    expect(view.getByTestId("toast-message").props.children).toBe("Shared plant removed from this preview.");
  });

  it("does not let an older toast dismiss newer feedback", () => {
    const view = setup();
    fireEvent.press(view.getByText("Invite"));
    const oldDismiss = mockDismissCallbacks[0];
    fireEvent.press(view.getByText("Accept"));
    act(() => oldDismiss());
    expect(view.getByTestId("toast-message").props.children).toBe("Contact added in this preview.");
    fireEvent.press(view.getByText("Dismiss toast"));
    expect(view.queryByTestId("toast-message")).toBeNull();
  });

  it("shows clipboard failures as errors and confirms preview reset", () => {
    const view = setup();
    fireEvent.press(view.getByText("Copy failure"));
    expect(view.getByTestId("toast-variant").props.children).toBe("error");
    fireEvent.press(view.getByText("Reset"));
    expect(view.getByTestId("toast-message").props.children).toBe("Preview reset.");
    expect(view.getByTestId("toast-variant").props.children).toBe("success");
  });
});

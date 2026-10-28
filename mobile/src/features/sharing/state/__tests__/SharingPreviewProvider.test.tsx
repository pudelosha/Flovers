import React from "react";
import { Pressable, Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { SharingPreviewProvider, useSharingPreview } from "../SharingPreviewProvider";

let mockSession = 1;
let mockUser = { id: 12, email: "owner@example.test", first_name: "Owner" };
jest.mock("../../../../api/client", () => ({ getAuthSessionId: () => mockSession }));
jest.mock("../../../../app/providers/useAuth", () => ({ useAuth: () => ({ user: mockUser }) }));

function Probe() {
  const { contacts, currentUser, shareDraft, toast, acceptInvitation, openSharePlant } = useSharingPreview();
  return <>
    <Text testID="count">{contacts.length}</Text><Text testID="owner">{currentUser.email}</Text>
    <Text testID="draft">{shareDraft ? "open" : "closed"}</Text>
    <Text testID="toast-kind">{toast?.kind ?? "none"}</Text>
    <Pressable onPress={() => { acceptInvitation("preview-incoming"); openSharePlant({ id: "12", name: "Bird" }); }}><Text>Change preview</Text></Pressable>
  </>;
}

describe("Sharing preview isolation", () => {
  beforeEach(() => { mockSession = 1; mockUser = { id: 12, email: "owner@example.test", first_name: "Owner" }; });
  it("resets contacts and open drafts when switching accounts", () => {
    const view = render(<SharingPreviewProvider><Probe /></SharingPreviewProvider>);
    fireEvent.press(view.getByText("Change preview"));
    expect(view.getByTestId("count").props.children).toBe(3);
    expect(view.getByTestId("toast-kind").props.children).toBe("invitationAccepted");
    mockUser = { id: 13, email: "other@example.test", first_name: "Other" };
    view.rerender(<SharingPreviewProvider><Probe /></SharingPreviewProvider>);
    expect(view.getByTestId("count").props.children).toBe(2);
    expect(view.getByTestId("draft").props.children).toBe("closed");
    expect(view.getByTestId("owner").props.children).toBe("other@example.test");
    expect(view.getByTestId("toast-kind").props.children).toBe("none");
  });
  it("also resets after a new login to the same account", () => {
    const view = render(<SharingPreviewProvider><Probe /></SharingPreviewProvider>);
    fireEvent.press(view.getByText("Change preview"));
    mockSession += 1;
    view.rerender(<SharingPreviewProvider><Probe /></SharingPreviewProvider>);
    expect(view.getByTestId("count").props.children).toBe(2);
    expect(view.getByTestId("draft").props.children).toBe("closed");
    expect(view.getByTestId("toast-kind").props.children).toBe("none");
  });
});

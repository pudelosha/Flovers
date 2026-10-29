import React from "react";
import { Text, Pressable } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import SharingToastHost from "../SharingToastHost";
import { SharingPreviewProvider, useSharingPreview } from "../../state/SharingPreviewProvider";

let mockDismissCallbacks: (() => void)[] = [];
jest.mock("../../../../api/client", () => ({ getAuthSessionId: () => 1 }));
jest.mock("../../../../app/providers/useAuth", () => ({ useAuth: () => ({ user: { id: 1, email: "owner@example.test" } }) }));
jest.mock("../../../../shared/ui/TopSnackbar", () => {
  const React = require("react"); const { Text, View } = require("react-native");
  return (props: any) => { mockDismissCallbacks.push(props.onDismiss); return <View><Text testID="toast-message">{props.message}</Text><Text testID="toast-variant">{props.variant}</Text></View>; };
});
function Actions() {
  const { notify } = useSharingPreview();
  return <>{(["sharingSaved", "sharingDeleted", "accessRemoved", "plantLeft", "contactsInvitationAdded", "copyFailed"] as const).map((kind) =>
    <Pressable key={kind} onPress={() => notify(kind, kind === "copyFailed" ? "error" : "success")}><Text>{kind}</Text></Pressable>)}</>;
}
const setup = () => render(<SharingPreviewProvider><Actions /><SharingToastHost /></SharingPreviewProvider>);
beforeEach(() => { mockDismissCallbacks = []; });
it("uses live sharing and contact success messages", () => {
  const view = setup(); fireEvent.press(view.getByText("sharingSaved")); expect(view.getByTestId("toast-message").props.children).toBe("Sharing updated.");
  fireEvent.press(view.getByText("sharingDeleted")); expect(view.getByTestId("toast-message").props.children).toBe("Sharing removed for all contacts.");
  fireEvent.press(view.getByText("accessRemoved")); expect(view.getByTestId("toast-message").props.children).toBe("Access removed.");
  fireEvent.press(view.getByText("plantLeft")); expect(view.getByTestId("toast-message").props.children).toBe("Shared plant removed.");
  fireEvent.press(view.getByText("contactsInvitationAdded")); expect(view.getByTestId("toast-message").props.children).toBe("Invitation sent.");
});
it("does not let a previous toast dismiss newer feedback", () => {
  const view = setup(); fireEvent.press(view.getByText("sharingSaved")); const old = mockDismissCallbacks[0];
  fireEvent.press(view.getByText("accessRemoved")); act(() => old()); expect(view.getByTestId("toast-message").props.children).toBe("Access removed.");
  act(() => mockDismissCallbacks[mockDismissCallbacks.length - 1]()); expect(view.queryByTestId("toast-message")).toBeNull();
});
it("uses the error style for clipboard failure", () => {
  const view = setup(); fireEvent.press(view.getByText("copyFailed")); expect(view.getByTestId("toast-variant").props.children).toBe("error");
});

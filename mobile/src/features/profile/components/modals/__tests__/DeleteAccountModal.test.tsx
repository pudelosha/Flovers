import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import DeleteAccountModal from "../DeleteAccountModal";
import { deleteMyAccount } from "../../../../../api/services/profile.service";
import { deletePlantPhotoById } from "../../../../../shared/utils/photoStorage";
import { ApiError } from "../../../../../api/client";

let mockSession = 1;
const mockLogout = jest.fn(async () => undefined);
jest.mock("../../../../../app/providers/useAuth", () => ({ useAuth: () => ({ logout: mockLogout }) }));
jest.mock("../../../../../api/client", () => ({
  ...jest.requireActual("../../../../../api/client"), getAuthSessionId: () => mockSession,
}));
jest.mock("../../../../../api/services/profile.service", () => ({ deleteMyAccount: jest.fn() }));
jest.mock("../../../../../shared/utils/photoStorage", () => ({ deletePlantPhotoById: jest.fn(async () => undefined) }));

const remove = deleteMyAccount as jest.Mock;
const photo = deletePlantPhotoById as jest.Mock;
function setup() {
  const onClose = jest.fn(), showToast = jest.fn();
  return { ...render(<DeleteAccountModal visible onClose={onClose} showToast={showToast} />), onClose, showToast };
}
function enter(view: ReturnType<typeof setup>, password = "current-password") {
  fireEvent.changeText(view.getByPlaceholderText("profileModals.prompts.deleteAccount.passwordPlaceholder"), password);
}
beforeEach(() => { jest.clearAllMocks(); mockSession = 1; remove.mockReset(); photo.mockReset().mockResolvedValue(undefined); });

it("requires password confirmation without sending a request", () => {
  const view = setup();
  fireEvent.press(view.getByText("profile.common.delete"));
  expect(remove).not.toHaveBeenCalled();
  expect(mockLogout).not.toHaveBeenCalled();
  expect(view.showToast).toHaveBeenCalledWith("profileModals.toasts.enterCurrentPassword", "error");
});

it("keeps the account, photos and modal after wrong-password or network failure", async () => {
  const view = setup(); enter(view);
  remove.mockRejectedValueOnce(new ApiError(400, { code: "incorrect_password" }));
  await act(async () => { fireEvent.press(view.getByText("profile.common.delete")); });
  expect(view.showToast).toHaveBeenLastCalledWith("profileModals.toasts.incorrectPassword", "error");
  remove.mockRejectedValueOnce(new Error("Offline"));
  await act(async () => { fireEvent.press(view.getByText("profile.common.delete")); });
  expect(view.showToast).toHaveBeenLastCalledWith("profileModals.toasts.couldNotDeleteAccount", "error");
  expect(photo).not.toHaveBeenCalled();
  expect(mockLogout).not.toHaveBeenCalled();
  expect(view.onClose).not.toHaveBeenCalled();
  expect(view.getByPlaceholderText("profileModals.prompts.deleteAccount.passwordPlaceholder").props.value).toBe("current-password");
});

it("waits for server confirmation, blocks duplicate taps/close, then clears only owned photos and logs out", async () => {
  let finish!: (ids: number[]) => void;
  remove.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const view = setup(); enter(view);
  fireEvent.press(view.getByText("profile.common.delete"));
  fireEvent.press(view.getByText("profileModals.common.deleting"));
  fireEvent.press(view.getByRole("button", { name: "profile.common.close" }));
  expect(remove).toHaveBeenCalledTimes(1);
  expect(photo).not.toHaveBeenCalled(); expect(mockLogout).not.toHaveBeenCalled();
  expect(view.onClose).not.toHaveBeenCalled();
  await act(async () => { finish([12, 15]); });
  expect(photo.mock.calls.map((call) => call[0])).toEqual([12, 15]);
  expect(mockLogout).toHaveBeenCalledTimes(1);
  expect(view.onClose).toHaveBeenCalledTimes(1);
});

it("does not log out a newer account when deletion of an older account finishes", async () => {
  let finish!: (ids: number[]) => void;
  remove.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const view = setup(); enter(view);
  fireEvent.press(view.getByText("profile.common.delete"));
  mockSession = 2;
  await act(async () => { finish([12]); });
  expect(photo).toHaveBeenCalledWith(12);
  expect(mockLogout).not.toHaveBeenCalled();
  expect(view.onClose).not.toHaveBeenCalled();
});

it("still clears the deleted account session if local photo cleanup fails", async () => {
  remove.mockResolvedValue([12]); photo.mockRejectedValue(new Error("Native file error"));
  const view = setup(); enter(view);
  await act(async () => { fireEvent.press(view.getByText("profile.common.delete")); });
  expect(mockLogout).toHaveBeenCalledTimes(1);
  expect(view.showToast).not.toHaveBeenCalled();
});

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import ConfirmDeleteReadingModal from "../ConfirmDeleteReadingModal";

describe("ConfirmDeleteReadingModal", () => {
  it("renders nothing while hidden", () => {
    const { queryByText } = render(
      <ConfirmDeleteReadingModal
        visible={false}
        name="Bedroom node"
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />
    );

    expect(queryByText("readingsModals.confirmDelete.title")).toBeNull();
  });

  it("calls cancel and confirm handlers from visible actions", () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();

    const { getByText } = render(
      <ConfirmDeleteReadingModal
        visible
        name="Bedroom node"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    fireEvent.press(getByText("readingsModals.common.cancel"));
    fireEvent.press(getByText("readingsModals.common.delete"));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

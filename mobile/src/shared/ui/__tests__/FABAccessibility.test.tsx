import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import FAB from "../FAB";

it("exposes the FAB and its localized actions as buttons and closes after selecting", async () => {
  const navigate = jest.fn();
  const view = render(<FAB actions={[
    { key: "history", label: "Task Journal", icon: "history", onPress: navigate },
  ]} />);
  expect(view.getByTestId("fab-toggle").props.accessibilityRole).toBe("button");
  expect(view.queryByRole("button", { name: "Task Journal" })).toBeNull();
  fireEvent.press(view.getByTestId("fab-toggle"));
  fireEvent.press(view.getByRole("button", { name: "Task Journal" }));
  expect(view.queryByRole("button", { name: "Task Journal" })).toBeNull();
  await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
});

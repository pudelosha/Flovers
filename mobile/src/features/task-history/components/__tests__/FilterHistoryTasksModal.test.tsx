import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import FilterHistoryTasksModal from "../modals/FilterHistoryTasksModal";

it("adds Photo as a journal-only filter alongside the unchanged task types", () => {
  const apply = jest.fn();
  const view = render(<FilterHistoryTasksModal visible plants={[]} locations={[]} filters={{}}
    onCancel={jest.fn()} onClearAll={jest.fn()} onApply={apply} />);
  fireEvent.press(view.getByText("Photo"));
  fireEvent.press(view.getByText("home.taskTypes.watering"));
  fireEvent.press(view.getByText("taskHistoryModals.common.apply"));
  expect(apply).toHaveBeenCalledWith(expect.objectContaining({ types: ["photo", "watering"] }));
});

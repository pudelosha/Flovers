import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import FilterHistoryTasksModal from "../modals/FilterHistoryTasksModal";

it("offers regular task types without a Photo filter", () => {
  const apply = jest.fn();
  const view = render(<FilterHistoryTasksModal visible plants={[]} locations={[]} filters={{}}
    onCancel={jest.fn()} onClearAll={jest.fn()} onApply={apply} />);
  expect(view.queryByText("Photo")).toBeNull();
  fireEvent.press(view.getByText("home.taskTypes.watering"));
  fireEvent.press(view.getByText("taskHistoryModals.common.apply"));
  expect(apply).toHaveBeenCalledWith(expect.objectContaining({ types: ["watering"] }));
});

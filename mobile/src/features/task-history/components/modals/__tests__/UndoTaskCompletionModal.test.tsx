import React from "react";
import {act,fireEvent,render} from "@testing-library/react-native";
import UndoTaskCompletionModal from "../UndoTaskCompletionModal";
import {undoReminderTask} from "../../../../../api/services/reminders.service";
jest.mock("../../../../../api/services/reminders.service",()=>({undoReminderTask:jest.fn()}));
const undo=undoReminderTask as jest.Mock;
const item:any={id:"7",plant:"Bird",type:"watering",completedAt:"2026-11-01T10:00:00Z",undoCompletion:"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"};
const props=()=>({visible:true,item,onClose:jest.fn(),onSaved:jest.fn(),onConflict:jest.fn()});
beforeEach(()=>{jest.clearAllMocks();undo.mockReset();undo.mockResolvedValue({id:7,status:"pending"});});
it("confirms the exact completion generation and closes after success",async()=>{
 const callbacks=props();const view=render(<UndoTaskCompletionModal {...callbacks}/>);
 expect(view.getByText("Bird")).toBeTruthy();
 await act(async()=>{fireEvent.press(view.getByText("Undo"));});
 expect(undo).toHaveBeenCalledWith(7,item.undoCompletion);
 expect(callbacks.onSaved).toHaveBeenCalledTimes(1);expect(callbacks.onClose).toHaveBeenCalledTimes(1);
});
it("keeps a failed save open for retry",async()=>{
 undo.mockRejectedValueOnce(new Error("Offline"));const callbacks=props();const view=render(<UndoTaskCompletionModal {...callbacks}/>);
 await act(async()=>{fireEvent.press(view.getByText("Undo"));});
 expect(view.getByText("Could not undo completion. Please try again.")).toBeTruthy();expect(callbacks.onClose).not.toHaveBeenCalled();
 await act(async()=>{fireEvent.press(view.getByText("Undo"));});expect(callbacks.onSaved).toHaveBeenCalledTimes(1);
});
it.each([404,409])("closes and refreshes stale eligibility on status %s",async status=>{
 undo.mockRejectedValueOnce({status});const callbacks=props();const view=render(<UndoTaskCompletionModal {...callbacks}/>);
 await act(async()=>{fireEvent.press(view.getByText("Undo"));});
 expect(callbacks.onConflict).toHaveBeenCalledTimes(1);expect(callbacks.onSaved).not.toHaveBeenCalled();expect(callbacks.onClose).toHaveBeenCalledTimes(1);
});
it("ignores a late reply after leaving the screen",async()=>{
 let finish:any;undo.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));const callbacks=props();
 const view=render(<UndoTaskCompletionModal {...callbacks}/>);
 act(()=>{fireEvent.press(view.getByText("Undo"));});
 view.rerender(<UndoTaskCompletionModal {...callbacks} visible={false}/>);
 await act(async()=>{finish({id:7});});expect(callbacks.onSaved).not.toHaveBeenCalled();
});

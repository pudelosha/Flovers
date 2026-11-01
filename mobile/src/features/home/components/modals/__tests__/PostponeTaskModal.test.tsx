import React from "react";
import {act,fireEvent,render} from "@testing-library/react-native";
import PostponeTaskModal,{parsePostponeDate} from "../PostponeTaskModal";
import {postponeReminderTask} from "../../../../../api/services/reminders.service";
import {Platform} from "react-native";

jest.mock("../../../../../api/services/reminders.service",()=>({postponeReminderTask:jest.fn()}));
jest.mock("@react-native-community/datetimepicker",()=>({__esModule:true,default:(props:any)=>require("react").createElement(require("react-native").View,{testID:"postpone-datepicker",...props})}));
const task={id:"7",plant:"Bird",dueDate:"2026-11-01"};
const props=()=>({visible:true,task,onClose:jest.fn(),onSaved:jest.fn(),onConflict:jest.fn()});
const post=postponeReminderTask as jest.Mock;
beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date(2026,10,1,10));jest.clearAllMocks();post.mockReset();post.mockResolvedValue({id:7,due_date:"2026-11-02"});});
afterEach(()=>{jest.useRealTimers();jest.restoreAllMocks();});
it("offers tomorrow/two/three day shortcuts and accepts a manually typed date",async()=>{
 const callbacks=props();const view=render(<PostponeTaskModal {...callbacks}/>);
 expect(view.getByLabelText("New due date").props.value).toBe("02.11.2026");
 fireEvent.press(view.getByText("In 2 days"));expect(view.getByLabelText("New due date").props.value).toBe("03.11.2026");
 fireEvent.press(view.getByText("In 3 days"));expect(view.getByLabelText("New due date").props.value).toBe("04.11.2026");
 fireEvent.press(view.getByText("Tomorrow"));expect(view.getByLabelText("New due date").props.value).toBe("02.11.2026");
 fireEvent.changeText(view.getByLabelText("New due date"),"05.11.2026");
 await act(async()=>fireEvent.press(view.getByText("Postpone")));
 expect(post).toHaveBeenCalledWith(7,"2026-11-05","2026-11-01");
 expect(callbacks.onSaved).toHaveBeenCalledTimes(1);expect(callbacks.onClose).toHaveBeenCalledTimes(1);
});
it.each(["", "31.02.2027", "01.11.2026", "31.10.2026", "2026-11-02"])("rejects invalid, unchanged or past date %s",(value)=>{
 const view=render(<PostponeTaskModal {...props()}/>);
 fireEvent.changeText(view.getByLabelText("New due date"),value);
 fireEvent.press(view.getByText("Postpone"));expect(post).not.toHaveBeenCalled();
 expect(view.getByRole("button",{name:"Postpone"}).props.accessibilityState.disabled).toBe(true);
});
it("does not let shortcuts bring an upcoming task forward",()=>{
 const view=render(<PostponeTaskModal {...props()} task={{...task,dueDate:"2026-11-06"}}/>);
 expect(view.getByLabelText("New due date").props.value).toBe("07.11.2026");
 for(const name of ["Tomorrow","In 2 days","In 3 days"]){expect(view.getByRole("button",{name}).props.accessibilityState.disabled).toBe(true);fireEvent.press(view.getByText(name));}
 expect(view.getByLabelText("New due date").props.value).toBe("07.11.2026");
});
it("allows an overdue task to move to today",async()=>{
 const view=render(<PostponeTaskModal {...props()} task={{...task,dueDate:"2026-10-29"}}/>);
 fireEvent.changeText(view.getByLabelText("New due date"),"01.11.2026");
 await act(async()=>fireEvent.press(view.getByText("Postpone")));
 expect(post).toHaveBeenCalledWith(7,"2026-11-01","2026-10-29");
});
it("uses the native date picker and ignores Android cancellation",()=>{
 jest.replaceProperty(Platform,"OS","android");
 const view=render(<PostponeTaskModal {...props()}/>);
 fireEvent.press(view.getByLabelText("Choose date"));
 fireEvent(view.getByTestId("postpone-datepicker"),"change",{type:"dismissed"});
 expect(view.getByLabelText("New due date").props.value).toBe("02.11.2026");
 fireEvent.press(view.getByLabelText("Choose date"));
 fireEvent(view.getByTestId("postpone-datepicker"),"change",{type:"set"},new Date(2026,10,8));
 expect(view.getByLabelText("New due date").props.value).toBe("08.11.2026");
});
it("keeps the form available after a failed save and retries without losing the selected date",async()=>{
 post.mockRejectedValueOnce(new Error("Offline"));const callbacks=props();
 const view=render(<PostponeTaskModal {...callbacks}/>);
 await act(async()=>fireEvent.press(view.getByText("Postpone")));
 expect(view.getByText("Could not postpone the task. Please try again.")).toBeTruthy();
 expect(callbacks.onClose).not.toHaveBeenCalled();
 await act(async()=>fireEvent.press(view.getByText("Postpone")));expect(callbacks.onSaved).toHaveBeenCalledTimes(1);
});
it("closes and requests a refresh after a conflict",async()=>{
 post.mockRejectedValueOnce({status:409});const callbacks=props();const view=render(<PostponeTaskModal {...callbacks}/>);
 await act(async()=>fireEvent.press(view.getByText("Postpone")));
 expect(callbacks.onConflict).toHaveBeenCalledTimes(1);expect(callbacks.onSaved).not.toHaveBeenCalled();expect(callbacks.onClose).toHaveBeenCalledTimes(1);
});
it("ignores a response after the modal is closed by navigation",async()=>{
 let finish:any;post.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 const callbacks=props();const view=render(<PostponeTaskModal {...callbacks}/>);
 act(()=>{fireEvent.press(view.getByText("Postpone"));});
 expect(post).toHaveBeenCalledTimes(1);expect(callbacks.onSaved).not.toHaveBeenCalled();
 await act(async()=>{view.rerender(<PostponeTaskModal {...callbacks} visible={false}/>);});
 expect(callbacks.onSaved).not.toHaveBeenCalled();
 await act(async()=>finish({id:7}));expect(callbacks.onSaved).not.toHaveBeenCalled();
});
it.each([["04.11.2026","DD.MM.YYYY"],["2026-11-04","YYYY-MM-DD"],["11/04/2026","MM/DD/YYYY"],["04/11/2026","DD/MM/YYYY"]])("parses the profile's date format %s",(value,pattern)=>{
 const date=parsePostponeDate(value,pattern);expect(date?.getFullYear()).toBe(2026);expect(date?.getMonth()).toBe(10);expect(date?.getDate()).toBe(4);
});

it("provides the complete postpone namespace in every supported locale",()=>{
 const fs=require("fs"),path=require("path");
 const root=path.resolve(__dirname,"../../../../../i18n/locales");
 const expected=Object.keys(JSON.parse(fs.readFileSync(path.join(root,"en/homeModals.json"),"utf8")).homeModals.postpone).sort();
 for(const locale of fs.readdirSync(root)){
  const filename=path.join(root,locale,"homeModals.json");if(!fs.existsSync(filename))continue;
  const labels=JSON.parse(fs.readFileSync(filename,"utf8")).homeModals.postpone;
  expect(Object.keys(labels).sort()).toEqual(expected);
  expect(labels.currentDue).toContain("{{date}}");
  expect(Object.values(labels).every(value=>typeof value==="string" && value.trim().length>0)).toBe(true);
 }
});

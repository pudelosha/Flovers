import React from "react";
import {act,render} from "@testing-library/react-native";
import TaskCalendar,{taskDateKey} from "../TaskCalendar";
import Calendar from "react-native-calendars/src/calendar";
const mockT=(key:string,options:any={})=>options.defaultValue ?? key;
jest.mock("react-i18next",()=>({useTranslation:()=>({t:mockT,i18n:{language:"en"}})}));
jest.mock("react-native-calendars",()=>({LocaleConfig:{locales:{},defaultLocale:"en"}}));
jest.mock("react-native-calendars/src/calendar",()=> (props:any)=>require("react").createElement(require("react-native").View,props));
jest.mock("../../../../app/providers/LanguageProvider",()=>({useLanguage:()=>({currentLanguage:"en"})}));
jest.mock("../../../../app/providers/SettingsProvider",()=>({useSettings:()=>({settings:{dateFormat:"YYYY-MM-DD"}})}));
const task=(id:string,date:string,type="watering")=>({id,dueDate:new Date(`${date}T12:00:00`),type,plant:"Fern",location:"Room",due:"",intervalValue:7,intervalUnit:"days"} as any);
it("shows pruning dots alongside other tasks on the same day",()=>{
 const view=render(<TaskCalendar tasks={[task("1","2026-11-08","pruning"),task("2","2026-11-08")]} selectedDate="2026-11-08" onSelectDate={jest.fn()}/>);
 expect(view.UNSAFE_getByType(Calendar).props.markedDates["2026-11-08"].dots).toEqual(expect.arrayContaining([expect.objectContaining({key:"pruning-1",color:"#ff922b"})]));
});
it("marks real task due dates only, including shared and postponed tasks without projecting recurrence",()=>{
 const shared={...task("3","2026-11-07","care"),access:{is_owner:false,can_complete_tasks:true}};
 const view=render(<TaskCalendar tasks={[task("1","2026-10-28"),task("2","2026-11-04"),shared,task("4","2026-11-04")]} selectedDate="2026-11-01" onSelectDate={jest.fn()}/>);
 const marked=view.UNSAFE_getByType(Calendar).props.markedDates;
 expect(Object.keys(marked).sort()).toEqual(["2026-10-28","2026-11-01","2026-11-04","2026-11-07"]);
 expect(marked["2026-11-04"].dots).toHaveLength(1);
 expect(marked["2026-11-07"].dots[0].key).toBe("care-3");
 expect(marked["2026-11-11"]).toBeUndefined();expect(marked["2026-11-01"].selected).toBe(true);
});
it("changes the selected day through the calendar and preserves date-only strings without UTC shifts",()=>{
 const select=jest.fn();const view=render(<TaskCalendar tasks={[]} selectedDate="2026-11-01" onSelectDate={select}/>);
 act(()=>{view.UNSAFE_getByType(Calendar).props.onDayPress({dateString:"2026-11-03"});});
 expect(select).toHaveBeenCalledWith("2026-11-03");expect(taskDateKey("2026-11-03")).toBe("2026-11-03");
 expect(taskDateKey(new Date(2026,10,3,0,1))).toBe("2026-11-03");
});

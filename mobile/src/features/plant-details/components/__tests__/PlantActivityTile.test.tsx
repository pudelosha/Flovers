import React from "react";
import {render} from "@testing-library/react-native";
import PlantActivityTile,{activityDateLabel} from "../PlantActivityTile";
jest.mock("../../../../app/providers/SettingsProvider",()=>({useSettings:()=>({settings:{dateFormat:"DD.MM.YYYY"}})}));
const stamp=new Date(2026,10,1,10,30).toISOString();
it("renders a compact read-only list with actor, care type and local timestamp",()=>{
 const view=render(<PlantActivityTile items={[{id:"1",type:"watering",actor:"Anna",completedAt:stamp}]}/>);
 expect(view.getByText("Activity")).toBeTruthy();
 expect(view.getByText("WATERING")).toBeTruthy();
 expect(view.getByText("01.11.2026 10:30 · Anna")).toBeTruthy();expect(view.queryAllByRole("button")).toHaveLength(0);
});
it("shows a clear empty state and caps the visible rows at five",()=>{
 const view=render(<PlantActivityTile items={[]}/>);expect(view.getByText("No completed tasks yet.")).toBeTruthy();
 const rows=Array.from({length:6},(_,i)=>({id:String(i),type:"care" as const,actor:`Actor ${i}`,completedAt:stamp}));
 view.rerender(<PlantActivityTile items={rows}/>);
 expect(view.queryByText("No completed tasks yet.")).toBeNull();expect(view.queryByText(/Actor 5/)).toBeNull();expect(view.getAllByText(/Actor/)).toHaveLength(5);
});
it("uses a safe fallback when the completing account is gone",()=>{
 const view=render(<PlantActivityTile items={[{id:"1",type:"care",actor:null,completedAt:stamp}]}/>);
 expect(view.getByText(/Unknown user/)).toBeTruthy();
 expect(activityDateLabel(stamp,"YYYY-MM-DD")).toBe("2026-11-01 10:30");expect(activityDateLabel("invalid","YYYY-MM-DD")).toBe("");
});

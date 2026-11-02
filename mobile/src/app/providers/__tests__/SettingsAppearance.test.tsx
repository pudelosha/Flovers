import React from "react";
import {Text} from "react-native";
import {act,render,waitFor} from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {SettingsProvider,useSettings} from "../SettingsProvider";
import {fetchProfileSettings} from "../../../api/services/profile.service";
jest.unmock("../SettingsProvider");
let mockUser:any={id:1};const mockChange=jest.fn(async()=>{});
jest.mock("../useAuth",()=>({useAuth:()=>({user:mockUser})}));
jest.mock("../LanguageProvider",()=>({useLanguage:()=>({changeLanguage:mockChange})}));
jest.mock("../../../i18n",()=>({__esModule:true,default:{language:"en",on:jest.fn(),off:jest.fn()}}));
jest.mock("../../../api/services/profile.service",()=>({fetchProfileSettings:jest.fn()}));
const api:any={language:"en",date_format:"DD.MM.YYYY",temperature_unit:"C",measure_unit:"metric",tile_transparency:0.12,tile_motive:"light",background:"bg2",fab_position:"right"};
let state:any;
function Probe(){state=useSettings();return <Text testID="appearance">{`${state.loading}:${state.settings.theme}:${state.settings.background}`}</Text>;}
beforeEach(async()=>{jest.clearAllMocks();await AsyncStorage.clear();mockUser={id:1};(fetchProfileSettings as jest.Mock).mockResolvedValue(api);});
it("ignores retired server background choices and defaults missing theme to Dark",async()=>{
 const view=render(<SettingsProvider><Probe/></SettingsProvider>);
 await waitFor(()=>expect(view.getByTestId("appearance").props.children).toBe("false:dark:bg5"));
});
it("normalizes legacy cached backgrounds before a delayed profile response",async()=>{
 await AsyncStorage.setItem("app:settings:v1",JSON.stringify({background:"bg1",theme:"system"}));
 let finish:any;(fetchProfileSettings as jest.Mock).mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 const view=render(<SettingsProvider><Probe/></SettingsProvider>);
 await waitFor(()=>expect(fetchProfileSettings).toHaveBeenCalled());
 expect(state.settings.background).toBe("bg5");expect(state.settings.theme).toBe("dark");
 await act(async()=>{finish({...api,theme:"dark"});});
 expect(view.getByTestId("appearance").props.children).toBe("false:dark:bg5");
 act(()=>{state.updateLocalSettings({theme:"light",background:"bg4"});});
 expect(state.settings.theme).toBe("light");expect(state.settings.background).toBe("bg5");
});
it("resets to the dark default on logout",async()=>{
 const view=render(<SettingsProvider><Probe/></SettingsProvider>);
 await waitFor(()=>expect(state.loading).toBe(false));mockUser=null;
 view.rerender(<SettingsProvider><Probe/></SettingsProvider>);
 await waitFor(()=>expect(state.settings.theme).toBe("dark"));
 expect(state.settings.background).toBe("bg5");
});

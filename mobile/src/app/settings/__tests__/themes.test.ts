import {DEFAULT_SETTINGS} from "../settings.defaults";
import {backgroundForSession,normalizeTheme,THEME_OPTIONS} from "../themes";
it("defaults to Dark and enables the complete Light theme",()=>{
 expect(DEFAULT_SETTINGS.theme).toBe("dark");expect(DEFAULT_SETTINGS.background).toBe("bg5");
 expect(THEME_OPTIONS).toEqual([{key:"dark",available:true},{key:"light",available:true}]);
 expect(normalizeTheme("light")).toBe("light");
 for(const value of [undefined,null,"bg1","system","dark"]){expect(normalizeTheme(value)).toBe("dark");}
});
it("always uses flowers before login and background five after login",()=>{
 expect(backgroundForSession(false)).toBe("bg1");expect(backgroundForSession(true)).toBe("bg5");
});

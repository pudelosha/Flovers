import type {ThemeMode,BackgroundKey} from "../../features/profile/types/profile.types";

// Both themes share screen geometry; their surfaces and text use the central palette.
export const THEME_OPTIONS:readonly {key:ThemeMode;available:boolean}[]=[
 {key:"dark",available:true},{key:"light",available:true},
];
export function normalizeTheme(value:unknown):ThemeMode{
 return THEME_OPTIONS.find(option=>option.key===value && option.available)?.key ?? "dark";
}
export function backgroundForSession(signedIn:boolean):BackgroundKey{
 return signedIn ? "bg5" : "bg1";
}

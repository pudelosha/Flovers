import React, { createContext, useContext, useReducer, ReactNode } from "react";
type State = Record<string, unknown>;
type Action = { type: string; payload?: unknown };
const initialState: State = {};
function reducer(state: State, _action: Action) { return state; }
const Ctx = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);
export function useCreatePlantContext() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("CreatePlantProvider missing");
  return ctx;
}
export default function CreatePlantProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

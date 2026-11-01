import React, { useContext } from "react";
import { Text } from "react-native";
import { act, render, waitFor } from "@testing-library/react-native";
import * as Keychain from "react-native-keychain";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext, AuthProvider } from "../AuthContext";
import { getAuthSessionId } from "../../../api/client";
import { bootstrapAuth, loginUser } from "../../../api/services/auth.service";
import { unregisterPushNotifications } from "../../../api/services/push.service";

jest.mock("../../../api/services/auth.service", () => ({
  ...jest.requireActual("../../../api/services/auth.service"),
  bootstrapAuth: jest.fn(), loginUser: jest.fn(),
}));
jest.mock("../../../api/services/push.service", () => ({
  stopPushNotifications: jest.fn(), unregisterPushNotifications: jest.fn(async () => undefined),
}));

type Auth = React.ContextType<typeof AuthContext>;
let auth: Auth;
function Probe() {
  auth = useContext(AuthContext);
  return <Text testID="auth">{auth.token}:{auth.user?.email}</Text>;
}
const mockedBootstrap = bootstrapAuth as jest.Mock;
const mockedLogin = loginUser as jest.Mock;
const mockedUnregister = unregisterPushNotifications as jest.Mock;
const readStored = jest.requireActual("../../../api/services/auth.service").bootstrapAuth;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
async function login(account: string) {
  mockedLogin.mockResolvedValueOnce({ access: `access-${account}`, refresh: `refresh-${account}`, user: { id: account, email: `${account}@example.com` } });
  await act(async () => { await auth.login({ email: `${account}@example.com`, password: "password8" }); });
}

describe("AuthProvider session lifecycle", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockedBootstrap.mockReset().mockResolvedValue({ access: null, refresh: null, user: null });
    mockedLogin.mockReset();
    mockedUnregister.mockReset().mockResolvedValue(undefined);
  });

  it("clears authentication and durable storage without waiting for push deregistration", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(auth.loading).toBe(false));
    await login("a");
    const unregister = deferred<void>();
    mockedUnregister.mockReturnValueOnce(unregister.promise);
    let loggingOut!: Promise<void>;
    act(() => { loggingOut = auth.logout(); });
    expect(auth.token).toBeNull();
    expect(mockedUnregister).toHaveBeenCalledTimes(1);
    expect(mockedUnregister).toHaveBeenCalledWith("access-a");
    await act(async () => { await loggingOut; });
    expect((await readStored()).access).toBeNull();
    await act(async () => { unregister.resolve(); await loggingOut; });
    expect(auth.token).toBeNull();
    await expect(readStored()).resolves.toEqual({ access: null, refresh: null, user: null });
  });

  it("does not let an earlier logout clear a later login", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(auth.loading).toBe(false));
    await login("a");
    const unregister = deferred<void>();
    mockedUnregister.mockReturnValueOnce(unregister.promise);
    let loggingOut!: Promise<void>;
    act(() => { loggingOut = auth.logout(); });
    expect(mockedUnregister.mock.calls[0][0]).toBe("access-a");
    await login("b");
    await act(async () => { unregister.resolve(); await loggingOut; });
    expect(auth.token).toBe("access-b");
    expect(auth.user?.email).toBe("b@example.com");
    expect((await readStored()).access).toBe("access-b");
  });

  it("ignores a bootstrap result that arrives after a login", async () => {
    const bootstrap = deferred<any>();
    mockedBootstrap.mockReturnValueOnce(bootstrap.promise);
    render(<AuthProvider><Probe /></AuthProvider>);
    await login("b");
    await act(async () => { bootstrap.resolve({ access: "old-a", refresh: "old-a", user: { email: "a@example.com" } }); });
    expect(auth.token).toBe("access-b");
    expect(auth.user?.email).toBe("b@example.com");
  });

  it("caches a changed email and rejects updates captured in an earlier account session", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(auth.loading).toBe(false));
    await login("a");
    const oldSession = getAuthSessionId();
    await login("b");
    await act(async () => { await auth.updateUser({ email: "late-a@example.com" }, oldSession); });
    expect(auth.user?.email).toBe("b@example.com");
    await act(async () => { await auth.updateUser({ email: "updated-b@example.com" }, getAuthSessionId()); });
    expect(auth.user?.email).toBe("updated-b@example.com");
    expect((await readStored()).user.email).toBe("updated-b@example.com");
  });
});


it("does not expose a login before secure persistence completes, or resurrect it after logout",async()=>{
 const view=render(<AuthProvider><Probe/></AuthProvider>);
 await waitFor(()=>expect(auth.loading).toBe(false));
 const writer=Keychain.setGenericPassword as jest.Mock;const original=writer.getMockImplementation()!;
 const gate=deferred<void>();
 writer.mockImplementation((...args:any[])=>gate.promise.then(()=>original(...args)));
 mockedLogin.mockResolvedValueOnce({access:"pending",refresh:"refresh-pending",user:{id:"a"}});
 try{
   let loggingIn!:Promise<void>;
   await act(async()=>{loggingIn=auth.login({email:"a@example.test",password:"password8"});for(let i=0;i<20;i++)await Promise.resolve();});
   expect(writer).toHaveBeenCalled();expect(auth.token).toBeNull();
   let loggingOut!:Promise<void>;
   act(()=>{loggingOut=auth.logout();});
   await act(async()=>{gate.resolve();await loggingIn;await loggingOut;});
   expect(auth.token).toBeNull();await expect(readStored()).resolves.toEqual({access:null,refresh:null,user:null});
 }finally{writer.mockImplementation(original);view.unmount();}
});

it("keeps the login screen unauthenticated when native secure storage fails",async()=>{
 render(<AuthProvider><Probe/></AuthProvider>);
 await waitFor(()=>expect(auth.loading).toBe(false));
 mockedLogin.mockResolvedValueOnce({access:"unpersisted",refresh:"unpersisted-refresh",user:null});
 (Keychain.setGenericPassword as jest.Mock).mockRejectedValueOnce(new Error("keystore unavailable"));
 await act(async()=>{await expect(auth.login({email:"a@example.test",password:"password8"})).rejects.toMatchObject({code:"secure_auth_storage_unavailable"});});
 expect(auth.token).toBeNull();await expect(readStored()).resolves.toEqual({access:null,refresh:null,user:null});
});

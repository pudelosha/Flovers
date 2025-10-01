// useAuth.ts
// A tiny helper (custom hook) to read the AuthContext anywhere in the app.
// Purpose: instead of importing useContext/AuthContext everywhere,
// you just import `useAuth()` and get { loading, token, user, login, logout, ... }.

import { useContext } from "react";
import { AuthContext } from "./AuthContext";

// Return the current AuthContext value provided by <AuthProvider>.
// If you call this inside any child component, you can access auth state & actions.
export const useAuth = () => useContext(AuthContext);

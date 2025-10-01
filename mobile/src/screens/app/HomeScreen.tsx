// HomeScreen.tsx
// Protected "home" screen shown only when the user is authenticated.
// - Simple top bar with a dropdown menu
// - Greets the user (if we have first_name from backend)
// - Menu contains placeholder items + a working "Log out" action

import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { useAuth } from "../../auth/useAuth";

export default function HomeScreen() {
  // Access auth actions/state from context
  const { logout, user } = useAuth();

  // Local UI state for the dropdown modal visibility
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      {/* ---- Top app bar --------------------------------------------------- */}
      <View
        style={{
          height: 56,
          backgroundColor: "#2e7d32",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 12,
        }}
      >
        <Text style={{ color: "white", fontWeight: "700", fontSize: 18 }}>Flovers</Text>

        {/* Button to open the dropdown menu */}
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Text style={{ color: "white" }}>Menu ▾</Text>
        </TouchableOpacity>
      </View>

      {/* ---- Main content -------------------------------------------------- */}
      <View style={{ padding: 16 }}>
        {/* Greet user if we have a first_name; otherwise show empty string */}
        <Text style={{ fontSize: 18, fontWeight: "600" }}>
          Hello {user?.first_name ?? ""}
        </Text>
        <Text style={{ marginTop: 6 }}>This is your home screen (protected).</Text>
      </View>

      {/* ---- Dropdown menu (modal) ---------------------------------------- */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)} // Android Back button handler
      >
        {/* Click-away overlay: closes the menu when tapping outside */}
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.2)" }}
          onPress={() => setMenuVisible(false)}
        >
          {/* The menu panel itself (positioned under the top bar, right side) */}
          <View
            style={{
              position: "absolute",
              top: 56,
              right: 12,
              backgroundColor: "white",
              borderRadius: 8,
              elevation: 4, // Android shadow
              paddingVertical: 8,
              minWidth: 180,
            }}
          >
            {/* Placeholder menu items; wire up navigation later */}
            {["My plants", "Calendar", "Readings", "Profile"].map((label) => (
              <Pressable key={label} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text>{label}</Text>
              </Pressable>
            ))}

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: "#eee", marginVertical: 6 }} />

            {/* Real action: log out user (clears token, returns to Auth stack) */}
            <Pressable
              style={{ paddingHorizontal: 12, paddingVertical: 10 }}
              onPress={logout}
            >
              <Text style={{ color: "crimson", fontWeight: "600" }}>Log out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

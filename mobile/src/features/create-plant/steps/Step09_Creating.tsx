// steps/Step09_Creating.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";

// Lottie (optional). Graceful fallback if lib or file is not present.
let LottieView: any = null;
try { LottieView = require("lottie-react-native").default; } catch {}
let ANIM: any = null;
try { ANIM = require("../../../../assets/lottie/lottie-creating-plant.json"); } catch {}

const PLANTS_ROUTE_NAME = "Plants"; // <-- Tab route name

export default function Step09_Creating() {
  const { state, actions } = useCreatePlantWizard();
  const navigation = useNavigation<any>();
  const [status, setStatus] = useState<"creating" | "success">("creating");
  const lottieRef = useRef<any>(null);

  // one-shot guard to prevent multiple POSTs even if the effect re-runs
  const startedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (startedRef.current) return; // ✅ guard
      startedRef.current = true;

      setStatus("creating");
      try {
        await actions.createPlant(); // call backend in provider
        if (!mounted) return;
        setStatus("success");

        // Navigate to Plants tab after ~2.5s
        setTimeout(() => {
          if (!mounted) return;
          navigation.navigate(PLANTS_ROUTE_NAME);
        }, 2500);
      } catch (e) {
        console.error("Create plant failed", e);
      }
    };

    run();
    return () => { mounted = false; };
  }, [actions, navigation]);

  return (
    <View style={wiz.cardWrap}>
      {/* glass layer */}
      <View style={wiz.cardGlass}>
        <BlurView
          style={{ position: "absolute", inset: 0 } as any}
          blurType="light"
          blurAmount={10}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
        />
        <View
          pointerEvents="none"
          style={{ position: "absolute", inset: 0, backgroundColor: "rgba(255,255,255,0.12)" } as any}
        />
      </View>

      <View style={[wiz.cardInner, { alignItems: "center" }]}>
        {/* Lottie centered */}
        <View style={{ width: 220, height: 220, alignItems: "center", justifyContent: "center", marginTop: 4 }}>
          {LottieView && ANIM ? (
            <LottieView
              ref={lottieRef}
              source={ANIM}
              autoPlay
              loop={status !== "success"}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <MaterialCommunityIcons name="sprout" size={92} color="#FFFFFF" />
          )}
        </View>

        {/* Status text */}
        <Text style={[wiz.title, { marginTop: 8, textAlign: "center" }]}>
          {status === "creating" ? "creating new plant" : "plant created successfully"}
        </Text>

        {status === "success" && state.createdPlantId && (
          <Text style={[wiz.smallMuted, { textAlign: "center" }]}>
            ID: {state.createdPlantId}
          </Text>
        )}
      </View>
    </View>
  );
}

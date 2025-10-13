// steps/Step07_Photo.tsx
import React from "react";
import { View, Text, Image, Pressable, Alert } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";

// Try to use react-native-image-picker if available.
// If not installed, we show a friendly message.
let ImagePicker: any = null;
try {
  ImagePicker = require("react-native-image-picker");
} catch {}

export default function Step07_Photo() {
  const { state, actions } = useCreatePlantWizard();

  const takePhoto = async () => {
    if (!ImagePicker?.launchCamera) {
      Alert.alert(
        "Camera not available",
        "Camera/photo picker library is not installed in this build. You can add a photo later from the plant details."
      );
      return;
    }
    ImagePicker.launchCamera(
      { mediaType: "photo", saveToPhotos: false, includeBase64: false },
      (res: any) => {
        if (res?.assets?.[0]?.uri) {
          // Local-only: we store the URI in state; we do not upload to server.
          actions.setPhotoUri(res.assets[0].uri);
        } else if (res?.didCancel) {
          // do nothing
        } else if (res?.errorCode) {
          Alert.alert("Camera error", String(res.errorMessage || res.errorCode));
        }
      }
    );
  };

  const pickFromLibrary = async () => {
    if (!ImagePicker?.launchImageLibrary) {
      Alert.alert(
        "Library not available",
        "Camera/photo picker library is not installed in this build. You can add a photo later from the plant details."
      );
      return;
    }
    ImagePicker.launchImageLibrary(
      { mediaType: "photo", selectionLimit: 1, includeBase64: false },
      (res: any) => {
        if (res?.assets?.[0]?.uri) {
          actions.setPhotoUri(res.assets[0].uri);
        } else if (res?.didCancel) {
          // do nothing
        } else if (res?.errorCode) {
          Alert.alert("Picker error", String(res.errorMessage || res.errorCode));
        }
      }
    );
  };

  const removePhoto = () => {
    actions.clearPhoto();
  };

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

      <View style={wiz.cardInner}>
        <Text style={wiz.title}>Add a photo</Text>
        <Text style={wiz.subtitle}>
          Photograph your plant so you can spot it faster. The picture is saved locally on your
          device (app storage) and is <Text style={{ fontWeight: "800", color: "#FFFFFF" }}>not uploaded</Text> to our servers.
        </Text>

        {/* Always-visible preview area */}
        <View
          style={[
            wiz.hero,
            {
              marginTop: 8,
              marginBottom: 10,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.08)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.18)",
            },
          ]}
        >
          {state.photoUri ? (
            <Image
              source={{ uri: state.photoUri }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="image-plus" size={28} color="#FFFFFF" />
              <Text style={{ color: "rgba(255,255,255,0.92)", fontWeight: "600", marginTop: 8 }}>
                No photo selected
              </Text>
            </View>
          )}
        </View>

        {/* Stacked full-width buttons */}
        <View style={{ gap: 10 }}>
          <Pressable style={[wiz.actionFull, { backgroundColor: "rgba(11,114,133,0.9)" }]} onPress={takePhoto}>
            <MaterialCommunityIcons name="camera" size={18} color="#FFFFFF" />
            <Text style={wiz.actionText}>Take a photo</Text>
          </Pressable>
          <Pressable style={wiz.actionFull} onPress={pickFromLibrary}>
            <MaterialCommunityIcons name="image-multiple" size={18} color="#FFFFFF" />
            <Text style={wiz.actionText}>Choose from gallery</Text>
          </Pressable>
          {state.photoUri && (
            <Pressable style={wiz.actionFull} onPress={removePhoto}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FFFFFF" />
              <Text style={wiz.actionText}>Remove photo</Text>
            </Pressable>
          )}
        </View>

        {/* Prev / Next */}
        <View style={wiz.footerRowSplit}>
          <Pressable style={[wiz.splitBtn, wiz.splitBtnSecondary]} onPress={actions.goPrev}>
            <Text style={wiz.splitBtnText}>Previous</Text>
          </Pressable>
          <Pressable style={[wiz.splitBtn, wiz.splitBtnPrimary]} onPress={actions.goNext}>
            <Text style={wiz.splitBtnText}>Next</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

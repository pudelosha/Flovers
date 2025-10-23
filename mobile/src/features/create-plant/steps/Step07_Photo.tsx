// steps/Step07_Photo.tsx
import React from "react";
import { View, Text, Image, Pressable, Alert, PermissionsAndroid, Platform } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import {
  launchCamera,
  launchImageLibrary,
  type CameraOptions,
  type ImageLibraryOptions,
} from "react-native-image-picker";

async function ensureAndroidPermissionCameraAndRead(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  // Android 13+ needs READ_MEDIA_IMAGES; <=12 needs READ_EXTERNAL_STORAGE
  const perms: string[] = [
    PermissionsAndroid.PERMISSIONS.CAMERA,
    (Number(Platform.Version) >= 33
      ? (PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE),
  ].filter(Boolean) as string[];

  const results = await PermissionsAndroid.requestMultiple(perms);
  const allGranted = perms.every((p) => results[p] === PermissionsAndroid.RESULTS.GRANTED);
  return allGranted;
}

export default function Step07_Photo() {
  const { state, actions } = useCreatePlantWizard();

  const doLaunchCamera = async () => {
    const ok = await ensureAndroidPermissionCameraAndRead();
    if (!ok) {
      Alert.alert("Permission required", "Please grant camera and media permissions to take a photo.");
      return;
    }

    const opts: CameraOptions = {
      mediaType: "photo",
      saveToPhotos: false,
      includeBase64: false,
      quality: 0.92,
    };
    const res = await launchCamera(opts);
    if (res.didCancel) return;
    if (res.errorCode) {
      Alert.alert("Camera error", String(res.errorMessage || res.errorCode));
      return;
    }
    const uri = res.assets?.[0]?.uri;
    if (uri) actions.setPhotoUri(uri);
  };

  const doLaunchLibrary = async () => {
    const ok = await ensureAndroidPermissionCameraAndRead();
    if (!ok) {
      Alert.alert("Permission required", "Please grant media permission to pick a photo.");
      return;
    }

    const opts: ImageLibraryOptions = {
      mediaType: "photo",
      selectionLimit: 1,
      includeBase64: false,
      quality: 0.92,
    };
    const res = await launchImageLibrary(opts);
    if (res.didCancel) return;
    if (res.errorCode) {
      Alert.alert("Picker error", String(res.errorMessage || res.errorCode));
      return;
    }
    const uri = res.assets?.[0]?.uri;
    if (uri) actions.setPhotoUri(uri);
  };

  const removePhoto = () => actions.clearPhoto();

  return (
    <View style={wiz.cardWrap}>
      {/* glass frame — match Steps 1–6: blur 20 + white tint + thin border */}
      <View style={wiz.cardGlass}>
        <BlurView
          style={{ position: "absolute", inset: 0 } as any}
          blurType="light"
          blurAmount={20}
          overlayColor="transparent"
          reducedTransparencyFallbackColor="transparent"
        />
        <View pointerEvents="none" style={wiz.cardTint} />
        <View pointerEvents="none" style={wiz.cardBorder} />
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
            <Image source={{ uri: state.photoUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="image-plus" size={28} color="#FFFFFF" />
              <Text style={{ color: "rgba(255,255,255,0.92)", fontWeight: "600", marginTop: 8 }}>
                No photo selected
              </Text>
            </View>
          )}
        </View>

        {/* Stacked full-width actions */}
        <View style={{ gap: 10 }}>
          <Pressable
            style={[wiz.actionFull, { backgroundColor: "rgba(11,114,133,0.9)" }]}
            onPress={doLaunchCamera}
            android_ripple={{ color: "rgba(255,255,255,0.12)" }}
          >
            <MaterialCommunityIcons name="camera" size={18} color="#FFFFFF" />
            <Text style={wiz.actionText}>Take a photo</Text>
          </Pressable>

          <Pressable style={wiz.actionFull} onPress={doLaunchLibrary} android_ripple={{ color: "rgba(255,255,255,0.12)" }}>
            <MaterialCommunityIcons name="image-multiple" size={18} color="#FFFFFF" />
            <Text style={wiz.actionText}>Choose from gallery</Text>
          </Pressable>

          {state.photoUri && (
            <Pressable style={wiz.actionFull} onPress={removePhoto} android_ripple={{ color: "rgba(255,255,255,0.12)" }}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FFFFFF" />
              <Text style={wiz.actionText}>Remove photo</Text>
            </Pressable>
          )}
        </View>

        {/* Prev / Next — unified with earlier steps (flat, same height, arrows) */}
        <View style={[wiz.buttonRowDual, { alignSelf: "stretch", marginTop: 12 }]}>
          <Pressable
            onPress={actions.goPrev}
            style={({ pressed }) => [
              wiz.nextBtnWide,
              {
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.12)",
                paddingHorizontal: 14,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
            android_ripple={{ color: "rgba(255,255,255,0.12)" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialCommunityIcons name="chevron-left" size={18} color="#FFFFFF" />
              <Text style={wiz.nextBtnText}>Previous</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={actions.goNext}
            style={({ pressed }) => [
              wiz.nextBtnWide,
              {
                flex: 1,
                backgroundColor: "rgba(11,114,133,0.9)",
                paddingHorizontal: 14,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
            android_ripple={{ color: "rgba(255,255,255,0.12)" }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 8,
                width: "100%",
              }}
            >
              <Text style={wiz.nextBtnText}>Next</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

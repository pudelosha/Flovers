import React, { useCallback } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import {
  launchCamera,
  launchImageLibrary,
  type CameraOptions,
  type ImageLibraryOptions,
} from "react-native-image-picker";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import LinearGradient from "react-native-linear-gradient";

// EXACT SAME green tones as AuthCard / PlantTile
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

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
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const { state, actions } = useCreatePlantWizard();

  // Safe translation (treat key-echo as missing)
  const getTranslation = useCallback(
    (key: string, fallback?: string): string => {
      try {
        const _lang = currentLanguage; // force dependency for rerender
        void _lang;
        const txt = t(key);
        const isMissing = !txt || txt === key;
        return (isMissing ? undefined : txt) || fallback || key.split(".").pop() || key;
      } catch {
        return fallback || key.split(".").pop() || key;
      }
    },
    [t, currentLanguage]
  );

  const doLaunchCamera = useCallback(async () => {
    const ok = await ensureAndroidPermissionCameraAndRead();
    if (!ok) {
      Alert.alert(
        getTranslation("createPlant.step07.permissionRequiredTitle", "Permission required"),
        getTranslation(
          "createPlant.step07.permissionCameraAndMedia",
          "Please grant camera and media permissions to take a photo."
        )
      );
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
      Alert.alert(
        getTranslation("createPlant.step07.cameraErrorTitle", "Camera error"),
        String(res.errorMessage || res.errorCode)
      );
      return;
    }
    const uri = res.assets?.[0]?.uri;
    if (uri) actions.setPhotoUri(uri);
  }, [actions, getTranslation]);

  const doLaunchLibrary = useCallback(async () => {
    const ok = await ensureAndroidPermissionCameraAndRead();
    if (!ok) {
      Alert.alert(
        getTranslation("createPlant.step07.permissionRequiredTitle", "Permission required"),
        getTranslation(
          "createPlant.step07.permissionMedia",
          "Please grant media permission to pick a photo."
        )
      );
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
      Alert.alert(
        getTranslation("createPlant.step07.pickerErrorTitle", "Picker error"),
        String(res.errorMessage || res.errorCode)
      );
      return;
    }
    const uri = res.assets?.[0]?.uri;
    if (uri) actions.setPhotoUri(uri);
  }, [actions, getTranslation]);

  const removePhoto = () => actions.clearPhoto();

  return (
    <View style={wiz.cardWrap}>
      {/* glass frame — match other steps */}
      <View style={wiz.cardGlass} pointerEvents="none">
        {/* Base green gradient (AuthCard match) */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
          locations={[0, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
        />

        {/* Fog highlight (AuthCard match) */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={[
            "rgba(255, 255, 255, 0.06)",
            "rgba(255, 255, 255, 0.02)",
            "rgba(255, 255, 255, 0.08)",
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View pointerEvents="none" style={wiz.cardTint} />
        <View pointerEvents="none" style={wiz.cardBorder} />
      </View>

      <View style={wiz.cardInner}>
        <Text style={wiz.title}>{getTranslation("createPlant.step07.title", "Add a photo")}</Text>

        <Text style={wiz.subtitle}>
          {getTranslation(
            "createPlant.step07.subtitlePrefix",
            "Photograph your plant so you can spot it faster. The picture is saved locally on your device (app storage) and is "
          )}
          <Text style={{ fontWeight: "800", color: "#FFFFFF" }}>
            {getTranslation("createPlant.step07.notUploaded", "not uploaded")}
          </Text>{" "}
          {getTranslation("createPlant.step07.subtitleSuffix", "to our servers.")}
        </Text>

        {/* Preview frame */}
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
              <Text
                style={{
                  color: "rgba(255,255,255,0.92)",
                  fontWeight: "600",
                  marginTop: 8,
                }}
              >
                {getTranslation("createPlant.step07.noPhotoSelected", "No photo selected")}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={{ gap: 10 }}>
          <Pressable
            style={[wiz.actionFull, { backgroundColor: "rgba(11,114,133,0.9)" }]}
            onPress={doLaunchCamera}
            android_ripple={{ color: "rgba(255,255,255,0.12)" }}
          >
            <MaterialCommunityIcons name="camera" size={18} color="#FFFFFF" />
            <Text style={wiz.actionText}>
              {getTranslation("createPlant.step07.takePhoto", "Take a photo")}
            </Text>
          </Pressable>

          <Pressable
            style={wiz.actionFull}
            onPress={doLaunchLibrary}
            android_ripple={{ color: "rgba(255,255,255,0.12)" }}
          >
            <MaterialCommunityIcons name="image-multiple" size={18} color="#FFFFFF" />
            <Text style={wiz.actionText}>
              {getTranslation("createPlant.step07.chooseFromGallery", "Choose from gallery")}
            </Text>
          </Pressable>

          {state.photoUri && (
            <Pressable
              style={wiz.actionFull}
              onPress={removePhoto}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FFFFFF" />
              <Text style={wiz.actionText}>
                {getTranslation("createPlant.step07.removePhoto", "Remove photo")}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

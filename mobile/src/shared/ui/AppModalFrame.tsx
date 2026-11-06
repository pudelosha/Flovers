import { useAppTheme } from "../theme/ThemeContext";
import React, { useEffect } from 'react';
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "../theme/native";
import { BlurView } from '@react-native-community/blur';
import { useTranslation } from 'react-i18next';
import AppModalHost from './AppModalHost';
import CenteredSpinner from './CenteredSpinner';
import ModalCloseButton from './ModalCloseButton';
import { DARK_MODAL_BACKGROUND, useModalNavigationBackdrop } from './modalNavigationBackdrop';
import { prompts as pr } from '../../features/profile/styles/profile.styles';

/** Shared full-area dialog with the standard title, close button and control insets. */
export default function AppModalFrame({
  visible,
  title,
  onClose,
  children,
  sharingLayout = false,
  scrollEnabled = true,
  fullScreen = true,
  centerContent = false,
  scrollable = true,
  reserveBottomBar = true,
  closeLabel,
  closeButtonRight,
  loading = false,
  loadingTestID = 'app-modal-loading',
}: {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  sharingLayout?: boolean;
  scrollEnabled?: boolean;
  scrollable?: boolean;
  reserveBottomBar?: boolean;
  closeLabel?: string;
  closeButtonRight?: number;
  loading?: boolean;
  loadingTestID?: string;
  fullScreen?: boolean;
  centerContent?: boolean;
}) {
  const { t } = useTranslation();
  const {isLight,colors}=useAppTheme();
  useModalNavigationBackdrop(visible && reserveBottomBar && fullScreen);
  useEffect(() => {
    if (!visible) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      Keyboard.dismiss();
      onClose();
      return true;
    });
    return () => handler.remove();
  }, [visible, onClose]);
  if (!visible) return null;
  const close = () => {
    Keyboard.dismiss();
    onClose();
  };
  return (
    <AppModalHost reserveBottomBar={reserveBottomBar}>
      <View style={s.overlay} accessibilityViewIsModal>
        <Pressable
          testID="contact-modal-backdrop"
          style={pr.backdrop}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={closeLabel ?? t('sharing.common.close', { defaultValue: 'Close' })}
        />
        <KeyboardAvoidingView
          pointerEvents="box-none"
          style={[pr.promptWrap, sharingLayout && s.sharingWrap, fullScreen && s.fullWrap]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Keep blank panel taps inside the dialog without a parent press responder
            competing with the scroll view, inputs, or photo gestures. */}
          <View
            testID="contact-modal-content"
            collapsable={false}
            onTouchStart={event => event.stopPropagation()}
            style={[
              pr.promptInner,
              s.inner,
              sharingLayout && s.sharingInner,
              sharingLayout && s.squareBottom,
              fullScreen && s.fullInner,
            ]}
          >
            {/* Keep the glass aligned and clipped to the same bounds as the form. */}
            <View
              testID="contact-modal-glass"
              pointerEvents="none"
              style={[pr.promptGlass, sharingLayout && s.squareBottom, fullScreen && s.fullGlass]}
            >
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="light"
                blurAmount={14}
                reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
              />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: isLight ? colors.modal : DARK_MODAL_BACKGROUND,
                  },
                ]}
              />
            </View>
            {loading && <View testID={loadingTestID} style={StyleSheet.absoluteFill}>
              <CenteredSpinner size={42} />
            </View>}
            <View style={fullScreen ? s.fullBody : s.body}>
              <View style={[appModalStyles.scroll, loading && { opacity: 0 }]}
                pointerEvents={loading ? "none" : "auto"}
                accessibilityElementsHidden={loading}
                importantForAccessibility={loading ? "no-hide-descendants" : "auto"}>
              {scrollable ? (
                <ScrollView
                  style={{ flex: 1 }}
                  scrollEnabled={scrollEnabled}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={[
                    s.content,
                    sharingLayout && s.sharingContent,
                    fullScreen && s.fullContent,
                    centerContent && s.centeredContent,
                  ]}
                >
                  {!!title && <Text style={pr.promptTitle}>{title}</Text>}
                  {children}
                </ScrollView>
              ) : (
                <View style={appModalStyles.scroll}>{children}</View>
              )}
              </View>
              <ModalCloseButton
                testID="app-modal-close"
                onPress={close}
                accessibilityLabel={
                  closeLabel ?? t('sharing.common.close', { defaultValue: 'Close' })
                }
                style={{ top: 8, right: closeButtonRight ?? (fullScreen ? 32 : 8) }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </AppModalHost>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 6000, elevation: 6000 },
  inner: { height: '86%', maxHeight: '86%', position: 'relative' },
  sharingWrap: { justifyContent: 'flex-end' },
  // Retain the centered frame's 7% top gap, extending its bottom to the tab bar.
  sharingInner: { height: '93%', maxHeight: '93%' },
  content: { flexGrow: 1, justifyContent: 'center', paddingTop: 44, paddingBottom: 20 },
  squareBottom: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  sharingContent: { justifyContent: 'flex-start', paddingBottom: 20 },
  fullWrap: { paddingHorizontal: 0 },
  fullInner: {
    width: '100%',
    maxWidth: '100%',
    height: '100%',
    maxHeight: '100%',
    borderRadius: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  fullGlass: { borderRadius: 0 },
  body: { flex: 1, width: '100%' },
  // Match the standard 7% top gap and 24dp side inset; keep scrolling to the tab bar.
  fullBody: {
    height: '93%',
    maxHeight: '93%',
    width: '100%',
    maxWidth: 568,
    paddingHorizontal: 24,
    position: 'relative',
  },
  fullContent: { justifyContent: 'flex-start', paddingBottom: 20 },
  centeredContent: { justifyContent: 'center', paddingTop: 44, paddingBottom: 44 },
});

/** Shared scrolling geometry for forms with specialized scroll/camera content. */
export const appModalStyles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingTop: 44, paddingBottom: 20 },
  centeredContent: { justifyContent: 'center', paddingTop: 44, paddingBottom: 44 },
});

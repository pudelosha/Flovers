import React, { forwardRef, useContext } from 'react';
import * as Native from 'react-native';
import { useAppTheme, ContrastContext } from './ThemeContext';
import { isAccentSurface, themeColor, type ThemeContrast } from './palette';
export * from 'react-native';
export function resolveStyle(
  style: any,
  isLight: boolean,
  contrast: ThemeContrast,
) {
  if (!isLight) return style;
  if (typeof style === 'function')
    return (state: any) => resolveStyle(style(state), isLight, contrast);
  const flat = Native.StyleSheet.flatten(style);
  if (!flat) return style;
  const result = { ...flat };
  for (const key of Object.keys(result)) {
    if (key === 'color' || key === 'tintColor' || key === 'textDecorationColor')
      result[key] = themeColor(result[key], 'foreground', isLight, contrast);
    else if (key === 'backgroundColor') {
      const fullOverlay =
        flat.position === 'absolute' &&
        flat.top === 0 &&
        flat.bottom === 0 &&
        flat.left === 0 &&
        flat.right === 0;
      const dim =
        typeof result[key] === 'string' &&
        /^rgba\(\s*0,\s*0,\s*0,\s*0\.[4-8]\s*\)$/.test(result[key]);
      // Decorative glass tint layers must not stain white card surfaces.
      const glassTint = contrast === 'surface' && fullOverlay &&
        typeof result[key] === 'string' && /^rgba\(\s*255,\s*255,\s*255,\s*0\.[0-2]\d*\s*\)$/.test(result[key]);
      result[key] = glassTint ? 'transparent' : fullOverlay && dim
          ? result[key]
          : themeColor(result[key], 'background', isLight, contrast);
    } else if (key.toLowerCase().includes('border') && key.endsWith('Color'))
      result[key] = themeColor(result[key], 'border', isLight, contrast);
  }
  return result;
}
function themed(Component: any, kind = 'view') {
  return forwardRef<any, any>((props, ref) => {
    const { isLight } = useAppTheme();
    const inherited = useContext(ContrastContext);
    if (!isLight) return <Component {...props} ref={ref} />;
    const base =
      typeof props.style === 'function'
        ? props.style({ pressed: false })
        : props.style;
    const background = Native.StyleSheet.flatten(base)?.backgroundColor;
    const contrast =
      inherited === 'surface' && isAccentSurface(background)
        ? 'accent'
        : inherited;
    const next: any = {
      ...props,
      style: resolveStyle(props.style, true, contrast),
      ref,
    };
    if (kind === 'animated') next.needsOffscreenAlphaCompositing = true;
    if (kind === 'text' && contrast === 'photo')
      next.style = [
        next.style,
        {
          textShadowColor: 'rgba(0,35,24,0.85)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 4,
        },
      ];
    if (props.contentContainerStyle)
      next.contentContainerStyle = resolveStyle(
        props.contentContainerStyle,
        true,
        contrast,
      );
    if (kind === 'input') {
      next.placeholderTextColor = themeColor(
        props.placeholderTextColor || 'rgba(255,255,255,0.5)',
        'foreground',
        true,
        contrast,
      );
      next.selectionColor = '#0B8F7D';
      next.keyboardAppearance = 'light';
    }
    if (kind === 'spinner')
      next.color = themeColor(
        props.color || '#FFFFFF',
        'foreground',
        true,
        contrast,
      );
    if (kind === 'switch') {
      next.trackColor = { false: '#BCD9CB', true: '#0B8F7D' };
      next.thumbColor = '#FFFFFF';
      next.ios_backgroundColor = '#BCD9CB';
    }
    if (kind === 'refresh') {
      if (props.tintColor)
        next.tintColor = themeColor(
          props.tintColor,
          'foreground',
          true,
          contrast,
        );
      if (props.colors)
        next.colors = props.colors.map((c: any) =>
          themeColor(c, 'foreground', true, contrast),
        );
    }
    if (props.android_ripple)
      next.android_ripple = {
        ...props.android_ripple,
        color: themeColor(props.android_ripple.color, 'border', true, contrast),
      };
    const element = <Component {...next} />;
    return contrast === inherited ? (
      element
    ) : (
      <ContrastContext.Provider value={contrast}>
        {element}
      </ContrastContext.Provider>
    );
  });
}
export const View = themed(Native.View) as unknown as typeof Native.View;
export type View = Native.View;
export const Text = themed(
  Native.Text,
  'text',
) as unknown as typeof Native.Text;
export type Text = Native.Text;
export const TextInput = themed(
  Native.TextInput,
  'input',
) as unknown as typeof Native.TextInput;
export type TextInput = Native.TextInput;
export const Pressable = themed(
  Native.Pressable,
) as unknown as typeof Native.Pressable;
export const TouchableOpacity = themed(
  Native.TouchableOpacity,
) as unknown as typeof Native.TouchableOpacity;
export const TouchableHighlight = themed(
  Native.TouchableHighlight,
) as unknown as typeof Native.TouchableHighlight;
export const ScrollView = themed(
  Native.ScrollView,
) as unknown as typeof Native.ScrollView;
export type ScrollView = Native.ScrollView;
export const FlatList = themed(
  Native.FlatList,
) as unknown as typeof Native.FlatList;
export type FlatList<T> = Native.FlatList<T>;
export const Image = themed(Native.Image) as unknown as typeof Native.Image;
export type Image = Native.Image;
export const ImageBackground = themed(
  Native.ImageBackground,
) as unknown as typeof Native.ImageBackground;
export const ActivityIndicator = themed(
  Native.ActivityIndicator,
  'spinner',
) as unknown as typeof Native.ActivityIndicator;
export const RefreshControl = themed(
  Native.RefreshControl,
  'refresh',
) as unknown as typeof Native.RefreshControl;
export const KeyboardAvoidingView = themed(
  Native.KeyboardAvoidingView,
) as unknown as typeof Native.KeyboardAvoidingView;
export const SafeAreaView = themed(
  Native.SafeAreaView,
) as unknown as typeof Native.SafeAreaView;
export const AnimatedView = themed(
  Native.Animated.View,
  "animated",
) as unknown as typeof Native.Animated.View;
export const AnimatedText = themed(
  Native.Animated.Text,
) as unknown as typeof Native.Animated.Text;
export const AnimatedScrollView = themed(
  Native.Animated.ScrollView,
) as unknown as typeof Native.Animated.ScrollView;
export const AnimatedFlatList = themed(
  Native.Animated.FlatList,
) as unknown as typeof Native.Animated.FlatList;

export const Switch = themed(
  Native.Switch,
  'switch',
) as unknown as typeof Native.Switch;

Object.assign(Image, {
  getSize: Native.Image.getSize,
  getSizeWithHeaders: Native.Image.getSizeWithHeaders,
  prefetch: Native.Image.prefetch,
  resolveAssetSource: Native.Image.resolveAssetSource,
});

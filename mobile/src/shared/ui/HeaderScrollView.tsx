import React, { forwardRef, useContext } from 'react';
import { StyleSheet } from 'react-native';
import {
  ScrollView as ThemedScrollView,
  FlatList as ThemedFlatList,
  AnimatedFlatList as ThemedAnimatedFlatList,
} from '../theme/native';
import { HeaderHeightContext, HEADER_CORNER_RADIUS } from './headerLayoutContext';

/** Only page viewports opt in. Modal/nested scroll views retain their normal layout. */
export const HEADER_CORNER_OVERLAP = HEADER_CORNER_RADIUS;

function pageViewport(Component: any, list = false) {
  return forwardRef<any, any>((props, ref) => {
    const sharedHeader = useContext(HeaderHeightContext);
    if (!sharedHeader) return <Component {...props} ref={ref} />;
    const style = StyleSheet.flatten(props.style) || {};
    const content = StyleSheet.flatten(props.contentContainerStyle) || {};
    const margin = style.marginTop ?? style.marginVertical ?? style.margin ?? 0;
    const padding = content.paddingTop ?? content.paddingVertical ?? content.padding ?? 0;
    if (typeof margin !== 'number' || typeof padding !== 'number') return <Component {...props} ref={ref} />;
    const overlap = HEADER_CORNER_OVERLAP;
    // Move the viewport, then compensate inside its scrollable content. Initial tile
    // positions stay unchanged, but scrolling tiles can pass behind the rounded edge.
    return <Component
      {...props}
      ref={ref}
      style={[props.style, { marginTop: margin - overlap }]}
      contentContainerStyle={[props.contentContainerStyle, { paddingTop: padding + overlap }]}
      scrollIndicatorInsets={{ ...props.scrollIndicatorInsets, top: (props.scrollIndicatorInsets?.top ?? 0) + overlap }}
      {...(list ? { progressViewOffset: (props.progressViewOffset ?? 0) + overlap } : {})}
    />;
  });
}

export const ScrollView = pageViewport(ThemedScrollView) as unknown as typeof ThemedScrollView;
export type ScrollView = import('react-native').ScrollView;
export const FlatList = pageViewport(ThemedFlatList, true) as unknown as typeof ThemedFlatList;
export type FlatList<T> = import('react-native').FlatList<T>;
export const AnimatedFlatList = pageViewport(ThemedAnimatedFlatList, true) as unknown as typeof ThemedAnimatedFlatList;

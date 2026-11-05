import React from 'react';
import { View, StyleSheet } from '../theme/native';
import { useAppTheme } from '../theme/ThemeContext';
import LinearGradient from '../theme/Gradient';
import MaskedView from '../theme/MaskedView';

/** Translucent panel top, solid halfway down, with the dark glass colour gradient. */
export default function PlantDescriptionSurface({
  solid = false,
  fadeHeight,
  opaqueAt = 0.5,
}: {
  solid?: boolean;
  fadeHeight?: number;
  opaqueAt?: number;
}) {
  const { isLight } = useAppTheme();
  if (fadeHeight != null && !solid) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: fadeHeight,
          }}
        >
          <PlantDescriptionSurface opaqueAt={1} />
        </View>
        <View style={[StyleSheet.absoluteFill, { top: fadeHeight }]}>
          <PlantDescriptionSurface solid />
        </View>
      </View>
    );
  }
  if (solid) {
    return (
      <LinearGradient
        themeRole="photo"
        pointerEvents="none"
        colors={isLight ? ['#F8FCFA', '#F8FCFA'] : ['#31695A', '#28443B']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    );
  }
  return isLight ? (
    <LinearGradient
      themeRole="photo"
      pointerEvents="none"
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      colors={[
        'rgba(248,252,250,0.80)',
        'rgba(248,252,250,0.92)',
        '#F8FCFA',
        '#F8FCFA',
      ]}
      locations={[0, opaqueAt / 2, opaqueAt, 1]}
      style={StyleSheet.absoluteFill}
    />
  ) : (
    <MaskedView
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      maskElement={
        <LinearGradient
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.92)', '#000000', '#000000']}
          locations={[0, opaqueAt / 2, opaqueAt, 1]}
          style={StyleSheet.absoluteFill}
        />
      }
    >
      <LinearGradient
        pointerEvents="none"
        colors={['#31695A', '#28443B']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </MaskedView>
  );
}

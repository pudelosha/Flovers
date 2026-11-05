import React from 'react';
import { StyleSheet } from '../theme/native';
import { useAppTheme } from '../theme/ThemeContext';
import LinearGradient from '../theme/Gradient';
import MaskedView from '../theme/MaskedView';

/** Translucent panel top, solid halfway down, with the dark glass colour gradient. */
export default function PlantDescriptionSurface({
  solid = false,
}: {
  solid?: boolean;
}) {
  const { isLight } = useAppTheme();
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
      locations={[0, 0.25, 0.5, 1]}
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
          locations={[0, 0.25, 0.5, 1]}
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

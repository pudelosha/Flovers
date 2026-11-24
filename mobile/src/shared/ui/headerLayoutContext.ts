import { createContext } from 'react';
import type { Animated } from 'react-native';

export const HEADER_CORNER_RADIUS = 28;
export const HeaderHeightContext = createContext<Animated.Value | null>(null);

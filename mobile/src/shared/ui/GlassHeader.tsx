import React from 'react';
import {
  Animated,
  AnimatedView,
  Easing,
  View,
  Text,
  Pressable,
  StyleSheet,
} from '../theme/native';
import {
  NavigationContext,
  NavigationRouteContext,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '../theme/Icon';
import LinearGradientView from '../theme/Gradient';
import { useModalNavigationBackdropVisible } from './modalNavigationBackdrop';
import {
  HeaderContentReadyContext,
  HeaderHeightContext as HeightContext,
  HeaderStartupCompleteContext,
  HeaderTargetHeightContext,
} from './HeaderPresentation';

type Props = {
  title: string;
  gradientColors: string[];
  solidFallback: string;
  rightIconName?: string;
  onPressRight?: () => void;
  showSeparator?: boolean;
  children?: React.ReactNode;
  segment?: React.ReactNode;
};
type HeaderOwner = symbol | string;
type HeaderEntry = { owner: HeaderOwner; props: Props };
type Controller = {
  publish: (entry: HeaderEntry) => void;
  release: (owner: HeaderOwner) => void;
};
const ControllerContext = React.createContext<Controller | null>(null);
const NavigationContextOrFallback =
  NavigationContext ?? React.createContext<any>(undefined);
const RouteContextOrFallback =
  NavigationRouteContext ?? React.createContext<any>(undefined);

/** One surface survives route changes; screen-local headers reserve its animated height. */
export function SharedHeaderProvider({
  children,
  inputsReady = true,
}: {
  children: React.ReactNode;
  inputsReady?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const modalVisible = useModalNavigationBackdropVisible();
  const height = React.useRef(new Animated.Value(insets.top + 59)).current;
  const [entry, setEntry] = React.useState<HeaderEntry | null>(null);
  const [initialPrepared, setInitialPrepared] = React.useState(false);
  const [startupComplete, setStartupComplete] = React.useState(false);
  const [targetHeight, setTargetHeight] = React.useState(insets.top + 59);
  const onTargetHeight = React.useCallback(
    (target: number) => setTargetHeight(target),
    [],
  );
  const [completed, setCompleted] = React.useState<{
    owner: HeaderOwner;
    expanded: boolean;
  } | null>(null);
  const onPrepared = React.useCallback(() => setInitialPrepared(true), []);
  const onEntered = React.useCallback(
    (owner: HeaderOwner, expanded: boolean) => {
      setCompleted({ owner, expanded });
      setStartupComplete(true);
    },
    [],
  );
  const expanded =
    entry?.props.segment != null && entry.props.segment !== false;
  const contentReady =
    inputsReady &&
    completed?.owner === entry?.owner &&
    completed?.expanded === expanded;
  const controller = React.useMemo<Controller>(
    () => ({
      publish: next => setEntry(next),
      // Keep the outgoing surface alive until the next focused screen publishes.
      release: () => {},
    }),
    [],
  );
  return (
    <ControllerContext.Provider value={controller}>
      <HeightContext.Provider value={height}>
        <HeaderTargetHeightContext.Provider value={targetHeight}>
          <HeaderContentReadyContext.Provider value={contentReady}>
            <HeaderStartupCompleteContext.Provider value={startupComplete}>
              <View
                testID="prepared-app-ui"
                style={{
                  flex: 1,
                  opacity: initialPrepared && inputsReady ? 1 : 0,
                }}
                pointerEvents={initialPrepared && inputsReady ? 'auto' : 'none'}
                accessibilityElementsHidden={!initialPrepared || !inputsReady}
                importantForAccessibility={
                  initialPrepared && inputsReady
                    ? 'auto'
                    : 'no-hide-descendants'
                }
              >
                {children}
              </View>
            </HeaderStartupCompleteContext.Provider>
          </HeaderContentReadyContext.Provider>
          {entry && (
            <View
              testID="shared-header-layer"
              pointerEvents={modalVisible ? 'none' : 'box-none'}
              accessibilityElementsHidden={modalVisible}
              importantForAccessibility={
                modalVisible ? 'no-hide-descendants' : 'auto'
              }
              style={[styles.sharedPosition, { opacity: modalVisible ? 0 : 1 }]}
            >
              <HeaderSurface
                {...entry.props}
                height={height}
                owner={entry.owner}
                inputsReady={inputsReady}
                onPrepared={onPrepared}
                onEntered={onEntered}
                onTargetHeight={onTargetHeight}
              />
            </View>
          )}
        </HeaderTargetHeightContext.Provider>
      </HeightContext.Provider>
    </ControllerContext.Provider>
  );
}

export default function GlassHeader(props: Props) {
  const controller = React.useContext(ControllerContext);
  const sharedHeight = React.useContext(HeightContext);
  const navigation = React.useContext(NavigationContextOrFallback);
  const localOwner = React.useRef(Symbol('header')).current;
  const route = React.useContext(RouteContextOrFallback);
  const owner: HeaderOwner = route?.key ?? localOwner;
  const insets = useSafeAreaInsets();
  const localHeight = React.useRef(new Animated.Value(insets.top + 59)).current;
  const subscribeFocus = React.useCallback(
    (listener: () => void) => {
      if (!navigation?.addListener) return () => {};
      const focus = navigation.addListener('focus', listener);
      const blur = navigation.addListener('blur', listener);
      return () => {
        focus();
        blur();
      };
    },
    [navigation],
  );
  const focusSnapshot = React.useCallback(
    () => navigation?.isFocused?.() ?? true,
    [navigation],
  );
  const focused = React.useSyncExternalStore(
    subscribeFocus,
    focusSnapshot,
    focusSnapshot,
  );
  // Publish changed labels, callbacks and segment state without restarting the height animation.
  React.useLayoutEffect(() => {
    if (controller && focused) controller.publish({ owner, props });
  }, [
    controller,
    focused,
    owner,
    props.title,
    props.gradientColors,
    props.solidFallback,
    props.rightIconName,
    props.onPressRight,
    props.showSeparator,
    props.children,
    props.segment,
  ]);
  React.useLayoutEffect(() => {
    if (!controller || !focused) return;
    return () => controller.release(owner);
  }, [controller, focused, owner]);
  if (controller && sharedHeight)
    return (
      <AnimatedView testID="header-space" style={{ height: sharedHeight }} />
    );
  return <HeaderSurface {...props} height={localHeight} owner={owner} />;
}

function HeaderSurface({
  title,
  gradientColors,
  solidFallback,
  rightIconName,
  onPressRight,
  showSeparator = true,
  children,
  segment,
  height,
  owner,
  inputsReady = true,
  onPrepared,
  onEntered,
  onTargetHeight,
}: Props & {
  height: Animated.Value;
  owner: HeaderOwner;
  inputsReady?: boolean;
  onPrepared?: () => void;
  onEntered?: (owner: HeaderOwner, expanded: boolean) => void;
  onTargetHeight?: (target: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const [baseHeight, setBaseHeight] = React.useState(insets.top + 59);
  const [segmentHeight, setSegmentHeight] = React.useState(44);
  const opacity = React.useRef(new Animated.Value(0)).current;
  const [baseMeasured, setBaseMeasured] = React.useState(false);
  const [segmentMeasured, setSegmentMeasured] = React.useState(false);
  const previousTarget = React.useRef(insets.top + 59);
  const hasSegment = segment != null && segment !== false;
  const prepared =
    inputsReady &&
    !!title.trim() &&
    baseMeasured &&
    (!hasSegment || segmentMeasured);
  React.useLayoutEffect(() => {
    if (prepared) onPrepared?.();
  }, [prepared, onPrepared]);
  React.useLayoutEffect(() => {
    if (prepared)
      onTargetHeight?.(baseHeight + (hasSegment ? segmentHeight : 0));
  }, [prepared, baseHeight, hasSegment, segmentHeight, onTargetHeight]);
  React.useEffect(() => {
    opacity.stopAnimation();
    opacity.setValue(0);
    if (!prepared) return;
    const target = baseHeight + (hasSegment ? segmentHeight : 0);
    const heightChanges = previousTarget.current !== target;
    previousTarget.current = target;
    const transitions = [
      Animated.timing(height, {
        toValue: target,
        duration: heightChanges ? 250 : 0,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ];
    // A removed segment has no native opacity view. Animating that detached
    // value can interrupt the whole group and leave page readiness unresolved.
    if (hasSegment)
      transitions.push(
        Animated.timing(opacity, {
          toValue: 1,
          delay: hasSegment && heightChanges ? 200 : 0,
          duration: 150,
          useNativeDriver: true,
        }),
      );
    const animation = Animated.parallel(transitions);
    let superseded = false;
    animation.start(({ finished }) => {
      if (superseded) return;
      if (!finished) {
        height.setValue(target);
        if (hasSegment) opacity.setValue(1);
      }
      onEntered?.(owner, hasSegment);
    });
    return () => {
      superseded = true;
      animation.stop();
    };
  }, [
    height,
    baseHeight,
    hasSegment,
    segmentHeight,
    opacity,
    owner,
    prepared,
    onEntered,
  ]);
  return (
    <AnimatedView
      testID="glass-header"
      style={[styles.headerClip, { height, opacity: prepared ? 1 : 0 }]}
    >
      <LinearGradientView
        themeRole="header"
        colors={gradientColors}
        locations={[0, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[StyleSheet.absoluteFill, { backgroundColor: solidFallback }]}
      />
      <View
        testID="header-base-layout"
        style={[styles.headerBar, { paddingTop: insets.top + 10 }]}
        onLayout={event => {
          const measured = Math.ceil(event.nativeEvent.layout.height);
          if (measured > 0) {
            setBaseHeight(measured);
            setBaseMeasured(true);
          }
        }}
      >
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>{title}</Text>
          {rightIconName ? (
            <Pressable
              onPress={onPressRight}
              style={styles.scanBtn}
              android_ripple={{
                color: 'rgba(255,255,255,0.15)',
                borderless: true,
              }}
            >
              <MaterialCommunityIcons
                name={rightIconName}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>
          ) : (
            <View style={{ width: 36, height: 36 }} />
          )}
        </View>
        {showSeparator && <View style={styles.separator} />}
        {children}
      </View>
      {hasSegment && (
        <AnimatedView
          testID="header-segment"
          style={[
            styles.segmentSlot,
            {
              top: baseHeight,
              opacity,
              transform: [
                {
                  translateY: opacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [6, 0],
                  }),
                },
              ],
            },
          ]}
          onLayout={event => {
            const measured = Math.ceil(event.nativeEvent.layout.height);
            if (measured > 0) {
              setSegmentHeight(measured);
              setSegmentMeasured(true);
            }
          }}
        >
          {segment}
        </AnimatedView>
      )}
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  sharedPosition: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 500,
    elevation: 500,
  },
  headerClip: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerBar: { paddingBottom: 8, paddingHorizontal: 16 },
  segmentSlot: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingTop: 2,
    paddingBottom: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  scanBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
});

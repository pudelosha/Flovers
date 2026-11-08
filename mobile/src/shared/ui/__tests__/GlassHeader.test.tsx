import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import {
  NavigationContext,
  NavigationRouteContext,
} from '@react-navigation/native';
import GlassHeader, { SharedHeaderProvider } from '../GlassHeader';
import { HeaderContentGate } from '../HeaderPresentation';
import CenteredSpinner from '../CenteredSpinner';
import AppModalFrame from '../AppModalFrame';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }),
}));
const colors = ['rgba(5,31,24,0.7)', 'rgba(16,80,63,0.7)'];
const common = {
  gradientColors: colors,
  solidFallback: '#103D32',
  showSeparator: false,
};
beforeEach(() => {
  jest
    .spyOn(Animated, 'timing')
    .mockImplementation((value: any, config: any) => ({
      start: (completion?: any) => {
        value.setValue(config.toValue);
        completion?.({ finished: true });
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }));
});
afterEach(() => jest.restoreAllMocks());

it('lets modals cover and disable the shared header without remounting or replaying it', () => {
  const screen = (visible: boolean) => (
    <SharedHeaderProvider>
      <GlassHeader {...common} title="Home" segment={<Text>All Today</Text>} />
      <AppModalFrame visible={visible} onClose={jest.fn()} title="Filter">
        <Text>Filter options</Text>
      </AppModalFrame>
    </SharedHeaderProvider>
  );
  const view = render(screen(false));
  prepare(view);
  const header = view.getByTestId('glass-header');
  const count = (Animated.timing as jest.Mock).mock.calls.length;
  view.rerender(screen(true));
  const layer = view.getByTestId('shared-header-layer', {
    includeHiddenElements: true,
  });
  expect(StyleSheet.flatten(layer.props.style).opacity).toBe(0);
  expect(layer.props.pointerEvents).toBe('none');
  expect(layer.props.accessibilityElementsHidden).toBe(true);
  expect(view.getByText('Filter options')).toBeVisible();
  view.rerender(screen(false));
  expect(
    StyleSheet.flatten(view.getByTestId('shared-header-layer').props.style)
      .opacity,
  ).toBe(1);
  expect(view.getByTestId('glass-header')).toBe(header);
  expect(Animated.timing).toHaveBeenCalledTimes(count);
});
function prepare(view: ReturnType<typeof render>, segment = true) {
  fireEvent(view.getByTestId('header-base-layout'), 'layout', {
    nativeEvent: { layout: { height: 83 } },
  });
  if (segment)
    fireEvent(view.getByTestId('header-segment'), 'layout', {
      nativeEvent: { layout: { height: 44 } },
    });
}

it('keeps one header surface while animating between expanded and normal routes', () => {
  const screen = (expanded: boolean) => (
    <SharedHeaderProvider>
      <GlassHeader
        {...common}
        title={expanded ? 'Home' : 'Plants'}
        segment={expanded ? <Text>All Today Upcoming</Text> : undefined}
      />
    </SharedHeaderProvider>
  );
  const view = render(screen(true));
  prepare(view);
  expect(view.getAllByTestId('glass-header')).toHaveLength(1);
  expect(view.getByTestId('header-segment')).toBeTruthy();
  expect(Animated.timing).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      toValue: 127,
      duration: 250,
      useNativeDriver: false,
    }),
  );
  const surface = view.getByTestId('glass-header');
  view.rerender(screen(false));
  expect(view.getByTestId('glass-header')).toBe(surface);
  expect(view.queryByTestId('header-segment')).toBeNull();
  expect(Animated.timing).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      toValue: 83,
      duration: 250,
      useNativeDriver: false,
    }),
  );
  expect(StyleSheet.flatten(surface.props.style)).toMatchObject({
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  });
});

it('updates segment content without restarting expansion or fading on selection', () => {
  const screen = (selection: string) => (
    <SharedHeaderProvider>
      <GlassHeader
        {...common}
        title="Profile"
        segment={<Text>{selection}</Text>}
      />
    </SharedHeaderProvider>
  );
  const view = render(screen('Account'));
  prepare(view);
  const count = (Animated.timing as jest.Mock).mock.calls.length;
  view.rerender(screen('Settings'));
  expect(view.getByText('Settings')).toBeTruthy();
  expect(Animated.timing).toHaveBeenCalledTimes(count);
});

it('also supports standalone screens outside the logged-in shared host', () => {
  const view = render(<GlassHeader {...common} title="Standalone" />);
  expect(view.getByText('Standalone')).toBeTruthy();
  expect(view.queryByTestId('header-space')).toBeNull();
});

it('ignores hidden-screen updates and transfers the same surface to the focused route', () => {
  let active = 'Home';
  const events: Array<() => void> = [];
  const navigation = (name: string) => ({
    isFocused: () => active === name,
    addListener: (_event: string, listener: () => void) => {
      events.push(listener);
      return () => {
        const i = events.indexOf(listener);
        if (i >= 0) events.splice(i, 1);
      };
    },
  });
  const home = navigation('Home'),
    plants = navigation('Plants');
  const screen = (plantTitle: string) => (
    <SharedHeaderProvider>
      <NavigationContext.Provider value={home as any}>
        <GlassHeader {...common} title="Home" segment={<Text>Today</Text>} />
      </NavigationContext.Provider>
      <NavigationContext.Provider value={plants as any}>
        <GlassHeader {...common} title={plantTitle} />
      </NavigationContext.Provider>
    </SharedHeaderProvider>
  );
  const view = render(screen('Plants'));
  prepare(view);
  const surface = view.getByTestId('glass-header');
  view.rerender(screen('Plants updated'));
  expect(view.getByText('Home')).toBeTruthy();
  expect(view.queryByText('Plants updated')).toBeNull();
  act(() => {
    active = 'Plants';
    [...events].forEach(listener => listener());
  });
  expect(view.getByText('Plants updated')).toBeTruthy();
  expect(view.getByTestId('glass-header')).toBe(surface);
  expect(view.getAllByTestId('glass-header')).toHaveLength(1);
  expect(view.queryByTestId('header-segment')).toBeNull();
});

it('prepares labels and native layout before revealing UI, then waits for the header before showing the page', () => {
  const completions: Array<() => void> = [];
  (Animated.timing as jest.Mock).mockImplementation(
    (value: any, config: any) => ({
      start: (done?: any) =>
        completions.push(() => {
          value.setValue(config.toValue);
          done?.({ finished: true });
        }),
      stop: jest.fn(),
      reset: jest.fn(),
    }),
  );
  const screen = (inputsReady: boolean) => (
    <SharedHeaderProvider inputsReady={inputsReady}>
      <GlassHeader
        {...common}
        title="Home"
        segment={<Text>All Today Upcoming</Text>}
      />
      <HeaderContentGate>
        <Text>Loading tiles</Text>
      </HeaderContentGate>
    </SharedHeaderProvider>
  );
  const view = render(screen(false));
  const style = (id: string) =>
    StyleSheet.flatten(
      view.getByTestId(id, { includeHiddenElements: true }).props.style,
    );
  fireEvent(view.getByTestId('header-base-layout'), 'layout', {
    nativeEvent: { layout: { height: 83 } },
  });
  view.rerender(screen(true));
  expect(style('prepared-app-ui').opacity).toBe(0);
  expect(Animated.timing).not.toHaveBeenCalled();
  fireEvent(view.getByTestId('header-segment'), 'layout', {
    nativeEvent: { layout: { height: 44 } },
  });
  expect(style('prepared-app-ui').opacity).toBe(1);
  expect(style('glass-header').opacity).toBe(1);
  expect(style('header-content-gate').opacity).toBe(0);
  act(() => completions.forEach(complete => complete()));
  expect(style('header-content-gate').opacity).toBe(1);
});

it('does not restart the header when loading UI is replaced by ready UI for the same route', () => {
  const screen = (loading: boolean) => (
    <SharedHeaderProvider>
      <NavigationRouteContext.Provider
        value={{ key: 'home-route', name: 'Home' }}
      >
        <GlassHeader
          key={loading ? 'loading' : 'ready'}
          {...common}
          title="Home"
          segment={<Text>All Today</Text>}
        />
      </NavigationRouteContext.Provider>
    </SharedHeaderProvider>
  );
  const view = render(screen(true));
  prepare(view);
  const count = (Animated.timing as jest.Mock).mock.calls.length;
  view.rerender(screen(false));
  expect(Animated.timing).toHaveBeenCalledTimes(count);
});

it('reveals Plants after Home without animating the detached native segment', () => {
  (Animated.timing as jest.Mock).mockImplementation(
    (value: any, config: any) => ({
      start: (done?: any) => {
        value.setValue(config.toValue);
        done?.({ finished: !(config.useNativeDriver && config.toValue === 0) });
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }),
  );
  const screen = (expanded: boolean) => (
    <SharedHeaderProvider>
      <GlassHeader
        {...common}
        title={expanded ? 'Home' : 'Plants'}
        segment={expanded ? <Text>Today</Text> : undefined}
      />
      <HeaderContentGate>
        <Text>Page tiles</Text>
      </HeaderContentGate>
    </SharedHeaderProvider>
  );
  const view = render(screen(true));
  prepare(view);
  (Animated.timing as jest.Mock).mockClear();
  view.rerender(screen(false));
  expect(Animated.timing).not.toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ useNativeDriver: true }),
  );
  expect(
    StyleSheet.flatten(view.getByTestId('header-content-gate').props.style)
      .opacity,
  ).toBe(1);
});

it('settles an interrupted current transition instead of keeping the page hidden', () => {
  (Animated.timing as jest.Mock).mockImplementation(() => ({
    start: (done?: any) => done?.({ finished: false }),
    stop: jest.fn(),
    reset: jest.fn(),
  }));
  const view = render(
    <SharedHeaderProvider>
      <GlassHeader {...common} title="Plants" />
      <HeaderContentGate>
        <Text>Plants ready</Text>
      </HeaderContentGate>
    </SharedHeaderProvider>,
  );
  prepare(view, false);
  expect(
    StyleSheet.flatten(view.getByTestId('header-content-gate').props.style)
      .opacity,
  ).toBe(1);
  expect(
    StyleSheet.flatten(view.getByTestId('glass-header').props.style).height,
  ).toBe(83);
});

it('keeps cold launch hidden but shows a spinner across navigation and pending data', () => {
  const completions: Array<() => void> = [];
  (Animated.timing as jest.Mock).mockImplementation(
    (value: any, config: any) => ({
      start: (done?: any) =>
        completions.push(() => {
          value.setValue(config.toValue);
          done?.({ finished: true });
        }),
      stop: jest.fn(),
      reset: jest.fn(),
    }),
  );
  const screen = (expanded: boolean, loading: boolean) => (
    <SharedHeaderProvider>
      <GlassHeader
        {...common}
        title={expanded ? 'Home' : 'Plants'}
        segment={expanded ? <Text>All Today</Text> : undefined}
      />
      <HeaderContentGate>
        {loading ? (
          <View testID="page-data-loading">
            <CenteredSpinner />
          </View>
        ) : (
          <Text>Loaded tiles</Text>
        )}
      </HeaderContentGate>
    </SharedHeaderProvider>
  );
  const view = render(screen(false, true));
  prepare(view, false);
  expect(view.queryByTestId('header-transition-spinner')).toBeNull();
  act(() => completions.splice(0).forEach(complete => complete()));
  expect(view.getByTestId('page-data-loading')).toBeVisible();
  view.rerender(screen(true, true));
  fireEvent(view.getByTestId('header-segment'), 'layout', {
    nativeEvent: { layout: { height: 44 } },
  });
  expect(view.getByTestId('header-transition-spinner')).toBeVisible();
  const spinnerStyle = () =>
    StyleSheet.flatten(
      view.getByTestId('header-transition-spinner').props.style,
    );
  expect(spinnerStyle()).toMatchObject({ top: 127, bottom: 0 });
  const heightAnimation = [...(Animated.timing as jest.Mock).mock.calls]
    .reverse()
    .find(([, config]) => config.useNativeDriver === false)!;
  act(() => heightAnimation[0].setValue(105));
  expect(spinnerStyle().top).toBe(127);
  act(() => completions.splice(0).forEach(complete => complete()));
  expect(view.queryByTestId('header-transition-spinner')).toBeNull();
  expect(view.getByTestId('page-data-loading')).toBeVisible();
  view.rerender(screen(true, false));
  expect(view.queryByTestId('page-data-loading')).toBeNull();
  expect(view.getByText('Loaded tiles')).toBeVisible();
});

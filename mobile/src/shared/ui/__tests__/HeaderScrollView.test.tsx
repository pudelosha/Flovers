import React from 'react';
import { Animated, StyleSheet, Text, ScrollView as NativeScrollView } from 'react-native';
import { render } from '@testing-library/react-native';
import { ScrollView, FlatList, HEADER_CORNER_OVERLAP } from '../HeaderScrollView';
import { HeaderHeightContext } from '../HeaderPresentation';

it('extends a page viewport behind the header while preserving its initial content position', () => {
  const view = render(<HeaderHeightContext.Provider value={new Animated.Value(127)}>
    <ScrollView testID="page" style={{ marginTop: 6 }} contentContainerStyle={{ paddingTop: 21 }}>
      <Text>First tile</Text>
    </ScrollView>
  </HeaderHeightContext.Provider>);
  const page = view.getByTestId('page');
  const margin = StyleSheet.flatten(page.props.style).marginTop as number;
  const padding = StyleSheet.flatten(page.props.contentContainerStyle).paddingTop as number;
  expect(margin).toBeLessThan(0);
  expect(margin + padding).toBe(6 + 21);
  expect(page.props.scrollIndicatorInsets.top).toBe(HEADER_CORNER_OVERLAP);
});

it('preserves list content position and pull-to-refresh offset', () => {
  const view = render(<HeaderHeightContext.Provider value={new Animated.Value(83)}>
    <FlatList testID="list" data={[{ id: '1' }]} keyExtractor={item => item.id}
      renderItem={() => <Text>Plant</Text>} progressViewOffset={12} contentContainerStyle={{ paddingVertical: 16 }} />
  </HeaderHeightContext.Provider>);
  const list = view.getByTestId('list');
  expect(StyleSheet.flatten(list.props.contentContainerStyle).paddingTop).toBe(16 + HEADER_CORNER_OVERLAP);
  expect(list.props.progressViewOffset).toBe(12 + HEADER_CORNER_OVERLAP);
});

it('leaves non-page and modal scrolling unchanged', () => {
  const view = render(<HeaderHeightContext.Provider value={new Animated.Value(127)}>
    <NativeScrollView testID="modal" contentContainerStyle={{ paddingTop: 16 }}><Text>Modal controls</Text></NativeScrollView>
    <HeaderHeightContext.Provider value={null}>
      <ScrollView testID="standalone" contentContainerStyle={{ paddingTop: 21 }}><Text>Standalone</Text></ScrollView>
    </HeaderHeightContext.Provider>
  </HeaderHeightContext.Provider>);
  expect(StyleSheet.flatten(view.getByTestId('modal').props.contentContainerStyle).paddingTop).toBe(16);
  expect(StyleSheet.flatten(view.getByTestId('standalone').props.contentContainerStyle).paddingTop).toBe(21);
});

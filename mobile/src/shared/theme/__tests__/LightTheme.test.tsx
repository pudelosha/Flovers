import React from 'react';
import {
  StyleSheet,
  Text as RawText,
  View as RawView,
  TextInput as RawInput,
  ActivityIndicator as RawSpinner,
} from 'react-native';
import { render } from '@testing-library/react-native';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  resolveStyle,
} from '../native';
import { ThemeContext, ThemeContrastScope } from '../ThemeContext';
import { LIGHT_COLORS, themeColor, contrastRatio } from '../palette';
import Gradient from '../Gradient';
import RawGradient from 'react-native-linear-gradient';
import MaskedView from '../MaskedView';
jest.mock(
  '@react-native-masked-view/masked-view',
  () => (props: any) =>
    require('react').createElement(
      require('react-native').View,
      props,
      props.maskElement,
      props.children,
    ),
);
const light = (children: React.ReactNode) => (
  <ThemeContext.Provider value={{ isLight: true, colors: LIGHT_COLORS }}>
    {children}
  </ThemeContext.Provider>
);
it('keeps Dark style identity, animated values and geometry', () => {
  const style = { color: '#fff', padding: 16, transform: [{ translateX: 2 }] };
  expect(resolveStyle(style, false, 'surface')).toBe(style);
  expect(resolveStyle(style, true, 'surface')).toMatchObject({
    padding: 16,
    transform: style.transform,
  });
});
it('provides readable light text while preserving warning and task hues', () => {
  for (const color of ['#FFFFFF', '#20C997', '#FF6B6B', '#64B5F6']) {
    expect(
      contrastRatio(
        themeColor(color, 'foreground', true),
        LIGHT_COLORS.surface,
      ),
    ).toBeGreaterThanOrEqual(4.5);
  }
  expect(themeColor('#FF0000', 'border', true)).toBe('#FF0000');
  expect(themeColor('#0000FF', 'border', true)).toBe('#0000FF');
});
it('renders light cards, input hints and loading indicators with unchanged sizing', () => {
  const ui = render(
    light(
      <View testID="card" style={{ backgroundColor: '#183D33', padding: 18 }}>
        <Text style={{ color: '#FFFFFF' }}>Name</Text>
        <TextInput testID="input" placeholder="Email" />
        <ActivityIndicator testID="spinner" color="#FFFFFF" />
      </View>,
    ),
  );
  expect(StyleSheet.flatten(ui.getByTestId('card').props.style)).toMatchObject({
    backgroundColor: LIGHT_COLORS.surface,
    padding: 18,
  });
  expect(StyleSheet.flatten(ui.getByText('Name').props.style).color).toBe(
    'rgba(16,61,50,1)',
  );
  expect(ui.getByTestId('input').props.keyboardAppearance).toBe('light');
  expect(ui.getByTestId('spinner').props.color).toBe('rgba(16,61,50,1)');
});
it('keeps white button labels, dark menus and photo captions in separate contrast scopes', () => {
  const ui = render(
    light(
      <View>
        <Pressable style={{ backgroundColor: '#0B7285' }}>
          <Text style={{ color: '#FFFFFF' }}>Save</Text>
        </Pressable>
        <ThemeContrastScope kind="dark">
          <View testID="menu" style={{ backgroundColor: '#000000' }}>
            <Text style={{ color: '#FFFFFF' }}>Edit</Text>
          </View>
        </ThemeContrastScope>
        <ThemeContrastScope kind="photo">
          <Text style={{ color: '#FFFFFF' }}>Bird</Text>
        </ThemeContrastScope>
      </View>,
    ),
  );
  for (const label of ['Save', 'Edit', 'Bird'])
    expect(StyleSheet.flatten(ui.getByText(label).props.style).color).toBe(
      '#FFFFFF',
    );
  expect(
    StyleSheet.flatten(ui.getByTestId('menu').props.style).backgroundColor,
  ).toBe('#000000');
});
it('retains image-mask alpha and photo scrims while lightening card gradients', () => {
  const original = ['rgba(0,0,0,1)', 'rgba(0,0,0,0)'];
  const ui = render(
    light(
      <View>
        <MaskedView testID="mask" maskElement={<Gradient colors={original} />}>
          <View />
        </MaskedView>
        <Gradient testID="card-gradient" colors={['#183D33', '#244C40']} />
        <Gradient testID="scrim" themeRole="photo" colors={original} />
      </View>,
    ),
  );
  expect(ui.getByTestId('mask').props.maskElement).toBeTruthy();
  const gradients = ui.UNSAFE_getAllByType(RawGradient);
  expect(gradients[0].props.colors).toEqual(original);
  expect(ui.getByTestId('scrim').props.colors).toEqual(original);
  expect(ui.getByTestId('card-gradient').props.colors[0]).toBe(
    '#FFFFFF',
  );
});

it("uses a task-colour-to-white gradient only in Light",()=>{
 const original=["#20c997","#05261f"];
 const ui=render(light(<Gradient testID="task" taskAccent="#4dabf7" colors={original}/>));
 expect(ui.getByTestId("task").props.colors).toEqual(["rgba(180,220,252,1)","rgba(216,237,253,1)","rgba(243,249,254,1)","#F8FCFA"]);
 ui.rerender(<ThemeContext.Provider value={{isLight:false,colors:LIGHT_COLORS}}><Gradient testID="task" taskAccent="#4dabf7" colors={original}/></ThemeContext.Provider>);
 expect(ui.getByTestId("task").props.colors).toEqual(original);
});

it("keeps large cards free of transient elevation frames and tint layers",()=>{
 expect(resolveStyle({position:"absolute",top:0,right:0,bottom:0,left:0,backgroundColor:"rgba(255,255,255,0.14)"},true,"surface").backgroundColor).toBe("transparent");
 expect(resolveStyle({borderRadius:28,overflow:"visible",position:"relative"},true,"surface")).not.toHaveProperty("elevation");
});

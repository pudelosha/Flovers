/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('../src/app/navigation/RootNavigator', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    __esModule: true,
    default: () => React.createElement(Text, null, 'RootNavigator'),
  };
});

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

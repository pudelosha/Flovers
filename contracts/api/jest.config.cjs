const path = require('path');
const mobile = path.resolve(__dirname, '../../mobile');
module.exports = {
  rootDir: mobile,
  roots: [path.resolve(__dirname)],
  testMatch: ['**/consumer.test.cjs', '**/guards.test.cjs'],
  testEnvironment: 'node',
  modulePaths: [path.join(mobile, 'node_modules')],
  transform: {'^.+\\.[jt]sx?$': [require.resolve('babel-jest', {paths: [mobile]}), {
    babelrc: false, configFile: false,
    presets: [require.resolve('@react-native/babel-preset', {paths: [mobile]})],
  }]},
  moduleNameMapper: {'^(?:\\.\\./)+config$': path.join(__dirname, 'test-config.cjs')},
  globals: {__DEV__: false},
};

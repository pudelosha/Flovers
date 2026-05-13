require("react-native-gesture-handler/jestSetup");

jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock")
);

jest.mock("react-native-config", () => ({
  __esModule: true,
  default: {
    API_BASE: "http://localhost:8000",
    PUBLIC_BASE_URL: "http://localhost:8000",
  },
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("@react-native-firebase/messaging", () => {
  const messaging = () => ({
    requestPermission: jest.fn(async () => 1),
    getToken: jest.fn(async () => "test-push-token"),
    getInitialNotification: jest.fn(async () => null),
    onNotificationOpenedApp: jest.fn(() => jest.fn()),
    onMessage: jest.fn(() => jest.fn()),
    onTokenRefresh: jest.fn(() => jest.fn()),
  });

  return {
    __esModule: true,
    default: messaging,
    AuthorizationStatus: {
      NOT_DETERMINED: -1,
      DENIED: 0,
      AUTHORIZED: 1,
      PROVISIONAL: 2,
    },
  };
});

jest.mock("@notifee/react-native", () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(async () => "default"),
    displayNotification: jest.fn(async () => undefined),
    onBackgroundEvent: jest.fn(),
    onForegroundEvent: jest.fn(() => jest.fn()),
  },
  AndroidImportance: {
    HIGH: 4,
  },
  EventType: {
    PRESS: 1,
  },
}));

jest.mock("react-i18next", () => ({
  I18nextProvider: ({ children }: any) => {
    const React = require("react");
    return React.createElement(React.Fragment, null, children);
  },
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const interpolate = (text: string, values?: Record<string, unknown>) => {
        if (!values) return text;

        return Object.entries(values).reduce(
          (next, [name, value]) =>
            next.replace(
              new RegExp(`{{\\s*${name}\\s*}}`, "g"),
              String(value ?? "")
            ),
          text
        );
      };

      const fallback =
        options && typeof options.defaultValue === "string"
          ? options.defaultValue
          : key;

      return interpolate(fallback, options);
    },
    i18n: {
      language: "en",
      changeLanguage: jest.fn(),
    },
  }),
  initReactI18next: {
    type: "3rdParty",
    init: jest.fn(),
  },
}));

jest.mock("@react-native-community/blur", () => ({
  BlurView: ({ children, ...props }: any) => {
    const React = require("react");
    const { View } = require("react-native");
    return React.createElement(View, props, children);
  },
}));

jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return ({ name, ...props }: any) =>
    React.createElement(Text, props, name ?? "icon");
});

jest.mock("react-native-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");

  return ({ children, ...props }: any) =>
    React.createElement(View, props, children);
});

jest.mock("./src/app/providers/LanguageProvider", () => ({
  LanguageProvider: ({ children }: any) => {
    const React = require("react");
    return React.createElement(React.Fragment, null, children);
  },
  useLanguage: () => ({
    currentLanguage: "en",
    changeAppLanguage: jest.fn(),
  }),
}));

jest.mock("./src/app/providers/SettingsProvider", () => ({
  SettingsProvider: ({ children }: any) => {
    const React = require("react");
    return React.createElement(React.Fragment, null, children);
  },
  useSettings: () => ({
    settings: {
      dateFormat: "DD.MM.YYYY",
      fabPosition: "right",
      language: "en",
      temperatureUnit: "C",
      measureUnit: "metric",
    },
  }),
}));

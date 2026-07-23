module.exports = {
  preset: "jest-expo",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^lucide-react-native$":
      "<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js",
    "^react-native-worklets$":
      "<rootDir>/node_modules/react-native-worklets/src/mock.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testPathIgnorePatterns: ["<rootDir>/android/", "<rootDir>/ios/"],
  transformIgnorePatterns: [
    "node_modules/(?!(.pnpm|(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|lucide-react-native|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-gesture-handler|react-native-reanimated|react-native-svg|react-native-worklets))",
  ],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/test/**",
    "../../packages/mobile-ui/src/**/*.{ts,tsx}",
  ],
  coverageDirectory: "coverage",
};

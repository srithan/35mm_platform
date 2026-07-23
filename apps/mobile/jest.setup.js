jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
  },
}));

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: jest.fn(async (_algorithm, value) =>
    `${String(value).length.toString(16).padStart(2, "0")}${"a".repeat(62)}`,
  ),
  randomUUID: jest.fn(() => "00000000-0000-4000-8000-000000000000"),
}));

require("react-native-gesture-handler/jestSetup");
require("react-native-reanimated").setUpTests();

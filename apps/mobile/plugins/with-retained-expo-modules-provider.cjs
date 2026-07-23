const {
  createRunOncePlugin,
  withAppDelegate,
} = require("expo/config-plugins");

const PLUGIN_NAME = "@35mm/with-retained-expo-modules-provider";
const PLUGIN_VERSION = "1.0.0";
const APP_DELEGATE_ANCHOR = "class AppDelegate: ExpoAppDelegate {";
const RETENTION_PROPERTY =
  "  private let retainedExpoModulesProvider = ExpoModulesProvider()";

function withRetainedExpoModulesProvider(config) {
  return withAppDelegate(config, (modConfig) => {
    if (modConfig.modResults.language !== "swift") {
      throw new Error(`${PLUGIN_NAME} requires a Swift AppDelegate.`);
    }

    const source = modConfig.modResults.contents;
    if (source.includes(RETENTION_PROPERTY)) {
      return modConfig;
    }

    if (!source.includes(APP_DELEGATE_ANCHOR)) {
      throw new Error(
        `${PLUGIN_NAME} could not find the reviewed AppDelegate anchor.`,
      );
    }

    modConfig.modResults.contents = source.replace(
      APP_DELEGATE_ANCHOR,
      `${APP_DELEGATE_ANCHOR}\n${RETENTION_PROPERTY}`,
    );

    return modConfig;
  });
}

module.exports = createRunOncePlugin(
  withRetainedExpoModulesProvider,
  PLUGIN_NAME,
  PLUGIN_VERSION,
);

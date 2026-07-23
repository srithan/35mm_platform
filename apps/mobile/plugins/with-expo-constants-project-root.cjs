const { readFile, writeFile } = require("node:fs/promises");
const { join } = require("node:path");
const {
  createRunOncePlugin,
  withDangerousMod,
} = require("expo/config-plugins");

const PLUGIN_NAME = "@35mm/with-expo-constants-project-root";
const PLUGIN_VERSION = "1.0.0";
const PODFILE_ANCHOR = "require 'json'\n";
const PROJECT_ROOT_LINE =
  "ENV['PROJECT_ROOT'] ||= File.expand_path('..', __dir__)\n";

function withExpoConstantsProjectRoot(config) {
  return withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const podfilePath = join(
        modConfig.modRequest.platformProjectRoot,
        "Podfile",
      );
      const source = await readFile(podfilePath, "utf8");

      if (source.includes(PROJECT_ROOT_LINE)) {
        return modConfig;
      }
      if (!source.includes(PODFILE_ANCHOR)) {
        throw new Error(
          `${PLUGIN_NAME} could not find the reviewed Podfile anchor.`,
        );
      }

      await writeFile(
        podfilePath,
        source.replace(
          PODFILE_ANCHOR,
          `${PODFILE_ANCHOR}${PROJECT_ROOT_LINE}`,
        ),
      );
      return modConfig;
    },
  ]);
}

module.exports = createRunOncePlugin(
  withExpoConstantsProjectRoot,
  PLUGIN_NAME,
  PLUGIN_VERSION,
);

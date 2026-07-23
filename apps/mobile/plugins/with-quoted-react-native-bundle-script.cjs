const {
  createRunOncePlugin,
  withXcodeProject,
} = require("expo/config-plugins");

const PLUGIN_NAME = "@35mm/with-quoted-react-native-bundle-script";
const PLUGIN_VERSION = "1.0.0";
const BUILD_PHASE_NAME = '"Bundle React Native code and images"';
const UNSAFE_INVOCATION =
  '`"$NODE_BINARY" --print "require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'"`';
const SAFE_INVOCATION = [
  'REACT_NATIVE_XCODE_SCRIPT="$("$NODE_BINARY" --print "require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'")"',
  '"$REACT_NATIVE_XCODE_SCRIPT"',
].join("\n");

function withQuotedReactNativeBundleScript(config) {
  return withXcodeProject(config, (modConfig) => {
    const buildPhases =
      modConfig.modResults.hash.project.objects.PBXShellScriptBuildPhase ?? {};
    const bundlePhases = Object.values(buildPhases).filter(
      (phase) => phase?.name === BUILD_PHASE_NAME,
    );

    if (bundlePhases.length !== 1) {
      throw new Error(
        `${PLUGIN_NAME} expected one ${BUILD_PHASE_NAME} phase; found ${bundlePhases.length}.`,
      );
    }

    const bundlePhase = bundlePhases[0];
    const shellScript = JSON.parse(bundlePhase.shellScript);

    if (!shellScript.includes(UNSAFE_INVOCATION)) {
      if (shellScript.includes(SAFE_INVOCATION)) {
        return modConfig;
      }

      throw new Error(
        `${PLUGIN_NAME} could not find the reviewed React Native bundle invocation.`,
      );
    }

    bundlePhase.shellScript = JSON.stringify(
      shellScript.replace(UNSAFE_INVOCATION, SAFE_INVOCATION),
    );
    return modConfig;
  });
}

module.exports = createRunOncePlugin(
  withQuotedReactNativeBundleScript,
  PLUGIN_NAME,
  PLUGIN_VERSION,
);

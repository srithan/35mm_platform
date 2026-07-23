# React Native native-generation policy

`apps/mobile` uses Expo Continuous Native Generation (CNG). `app.config.ts`,
`package.json`, the pnpm lockfile, Expo modules, and reviewed config plugins are
the source of truth for its iOS and Android projects.

This policy applies only to `apps/mobile/ios` and `apps/mobile/android`.
`apps/ios` is the independently tracked SwiftUI app and must never be generated,
cleaned, renamed, or otherwise changed by mobile CNG commands.

## Source-control policy

- `apps/mobile/ios` and `apps/mobile/android` are generated, ignored, disposable
  build output. Never stage or commit files under either directory.
- EAS Build receives no committed mobile native directories, so it runs Prebuild
  from the reviewed configuration and lockfile.
- Do not add an `apps/mobile/.easignore` unless it carries every required
  `.gitignore` exclusion, including both generated native directories. Without
  that file, EAS uses `.gitignore`.
- Local signing keys, certificates, provisioning profiles, and keystores stay
  ignored and outside committed app configuration.

## Native-change policy

- Express settings through Expo app config or maintained package config plugins.
- Declare every direct config plugin explicitly in `app.config.ts`. Installing a
  native dependency without reviewing its plugin, permissions, entitlements,
  privacy, minimum-OS, and binary-size impact is not allowed.
- Put a required 35mm-owned plugin under `apps/mobile/plugins`, keep it
  synchronous and serializable, import config-plugin APIs through Expo's
  re-export, prefer safe structured mods, and wrap it with `createRunOncePlugin`.
- Dangerous mods, regex edits to generated source, custom native templates, and
  long-running/networked/interactive plugin work require a documented exception,
  cross-platform fixture coverage, and clean-generation proof. Direct edits to
  generated native files are valid only for local diagnosis; move any retained
  behavior into a reviewed plugin or native module before committing.
- Native modules live outside generated directories and use Expo Modules or a
  maintained React Native library. Never treat generated Xcode/Gradle source as
  module source of truth.
- A dependency/plugin change must update the reviewed plugin/autolinking baseline
  in `scripts/native-generation-policy.mjs`, then pass isolated generation for
  both development and preview variants.
- The repository path may contain spaces. `expo-constants@57.0.7` is pinned to
  the reviewed pnpm patch at `patches/expo-constants@57.0.7.patch`, and the
  35mm-owned quoted-bundle-script plugin safely rewrites Expo's generated Xcode
  bundle-phase invocation. The dependency patch preserves both the CocoaPods
  script path and `PROJECT_DIR` as single shell arguments; without the latter,
  Expo silently skips `app.config` generation when any parent directory
  contains spaces. Native policy and isolated generation fail if these
  path-safety guards drift; never edit the generated Xcode project to retain
  them.
- Xcode 26 Release dead-code stripping removes Expo's string-discovered
  `ExpoModulesProvider` unless the app references its type directly. The
  retained-provider plugin uses a synchronous AppDelegate mod with one exact
  reviewed Swift anchor to retain a provider instance for the AppDelegate
  lifetime. Isolated generation verifies it for both variants. This narrow
  source-mod exception prevents Release runtime from losing every Expo native
  module while avoiding broad linker retention flags and binary-size growth.
- CocoaPods must receive the application root when it evaluates
  `EXConstants.podspec`; otherwise its build phase creates an empty
  `EXConstants.bundle` and Expo Router crashes because no embedded app config is
  available. The retained Podfile plugin derives `PROJECT_ROOT` from the
  generated iOS directory, and the pinned Expo Constants patch safely quotes
  that path when it contains spaces.

## Physical iOS Release startup regression guard

Three independent defects produced the same black or crashing startup:

1. Debug startup supplied React Native a null script URL before Expo launcher
   UI. Physical-iOS validation therefore uses Release with embedded JavaScript.
2. Release dead-code stripping removed string-discovered
   `ExpoModulesProvider`. The retained-provider plugin creates a direct,
   lifetime-held `AppDelegate` reference.
3. Expo Constants split the repository path at spaces and silently skipped
   `app.config`. The Podfile plugin supplies `PROJECT_ROOT`; the pinned
   dependency patch quotes both the script path and `PROJECT_DIR`.

Prebuild checks alone cannot prove final packaging. Every physical-iOS Release
artifact must pass `native:ios:artifact:check` before install or distribution.
The command fails unless all of these are true:

- `main.jsbundle` exists and is non-empty.
- `EXConstants.bundle/app.config` exists, parses, and matches the selected
  variant name, scheme, and bundle identifier.
- The final executable contains `_OBJC_CLASS_$_ExpoModulesProvider`.
- `Info.plist` carries the selected variant bundle identifier.
- `codesign --verify --deep --strict` succeeds.

`native:expo-constants:check` also executes Expo's real manifest generator for
development and preview using a synthetic project path containing spaces. This
turns the original silent shell failure into a deterministic CI failure.

## Variant capability boundary

The development variant disables Clerk's Sign in with Apple entitlement so an
Apple Personal Team can provision `com.thirtyfivemm.mobile.dev` on physical
devices. The preview variant retains Sign in with Apple and requires a paid
Apple Developer team for device provisioning. `extra.appleSignInEnabled`
mirrors this native capability; authentication UI must not offer Apple Sign-In
when the value is false.

Development also configures Expo Dev Client with `launchMode: "launcher"`.
This disables automatic recent-bundle launch, but physical-iOS verification on
Expo SDK 57 showed that it does not prevent the generated Debug app from
requesting a null React Native bundle URL before launcher UI appears. Do not
claim a Local Network permission flow or successful Debug startup without
direct device evidence. Physical-iOS smoke builds use an embedded Release
`main.jsbundle` until that Expo development-client path is replaced or fixed.
CoreDevice's supported app argument remains `--initialUrl <url>`;
`devicectl --payload-url` is unrelated. Do not retain a workstation IP address
in app config or generated native source.

## Commands

```bash
# Non-mutating policy plus isolated two-variant clean Prebuild verification.
pnpm mobile:native:check

# Required after every physical-iOS Release build.
pnpm mobile:ios:artifact:check -- /absolute/path/35mmDev.app development

# Regenerate disposable local projects. Variant and platform are mandatory.
pnpm mobile:native:regenerate development all
pnpm mobile:native:regenerate preview ios
```

`native:regenerate` always uses clean Prebuild, refuses symbolic-link targets,
and resolves targets only beneath `apps/mobile`. Clean generation deletes local
changes inside selected generated directories. Preserve experiments elsewhere
before running it.

`native:check` verifies ignore boundaries, rejects tracked generated files,
confirms the SwiftUI project and `com.35mm.app` remain protected, reviews exact
config-plugin/autolinking resolution, verifies the pinned Expo Constants patch,
executes Expo Constants generation through a path containing spaces, and
generates both internal variants in isolated OS scratch directories. It
validates their distinct identifiers, display names, New Architecture, Hermes,
iOS deployment target, recent-bundle auto-launch preference, and quoted React
Native bundle phase, and Release-safe Expo modules-provider retention without
writing `apps/mobile/ios`, `apps/mobile/android`, or `apps/ios`.

## Review checklist for native dependencies or plugins

1. Confirm maintained Expo SDK 57 / React Native 0.86 / New Architecture support.
2. Confirm Android API 24 and iOS 17.0 compatibility.
3. Review permissions, entitlements, privacy manifests/disclosures, background
   modes, deep-link ownership, binary size, and low-memory Android impact.
4. Add the dependency through Expo-compatible package resolution and declare its
   direct plugin explicitly.
5. Update policy baselines and add focused config/plugin tests.
6. Run `pnpm mobile:check`, Expo Doctor, and platform builds appropriate to the
   change. Native dependency/config changes require new store binaries; they
   cannot ship as JavaScript-only OTA updates.

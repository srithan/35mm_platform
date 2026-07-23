# Mobile quality harnesses

Phase 1.8 establishes executable accessibility, visual-regression, end-to-end,
and performance contracts around one deterministic internal foundation gallery.
Only development and preview native identities exist. No production profile or
product behavior is synthesized by this surface. Phase 2 replaces the root
gallery with the production bootstrap state machine while retaining these
quality runners for feature-owned scenarios.

## Deterministic foundation surface

`src/harness/FoundationGallery.tsx` renders controls and explicit loading,
offline, and error states with local content only. It starts in light theme,
forces Reduce Motion, exposes stable accessibility/test identifiers, and can
switch to dark theme and state coverage without depending on device settings.
This makes screenshot input repeatable while component tests still verify
native roles, names, selected/disabled states, and the 44-point target floor.

Run deterministic contract and component checks:

```bash
pnpm --filter @35mm/mobile quality:check
pnpm --filter @35mm/mobile test
```

These checks are part of root `pnpm mobile:check` and require no native binary.

## Maestro E2E smoke

The smoke flow launches a clean installed build, verifies the gallery, moves
between controls and states, and changes theme using stable element IDs. Use a
named simulator, emulator, or physical device and an installed development or
preview build:

```bash
MOBILE_TEST_PLATFORM=ios \
MOBILE_TEST_APP_ID=com.thirtyfivemm.mobile.preview \
MOBILE_TEST_DEVICE="iPhone 15 / iOS 17.5" \
MOBILE_TEST_DEVICE_ID="simulator-UDID" \
pnpm --filter @35mm/mobile e2e:foundation
```

Android uses `MOBILE_TEST_PLATFORM=android` and the installed Android package
ID. Runner rejects unknown app identities, missing device names/IDs, and missing
Maestro CLI, then passes the exact ID through Maestro’s global `--device` flag.
When testing the development client, also set `MOBILE_TEST_START_URL` to the
full `exp+thirtyfivemm-mobile://expo-development-client/?url=...` value printed
by the running Expo server. The runner validates the reviewed scheme and nested
HTTP(S) Metro URL, clears app state, reopens that URL, and selects the matching
development server plus the development-menu first-run confirmation when the
Android launcher requires them.
Preview builds are self-contained and reject this variable.
Reports and recordings stay under ignored `artifacts/maestro/`.
Flow retries are not enabled: a flaky pass remains a defect rather than hidden
success. Each run writes ignored metadata containing app ID, exact device name
and ID, platform, Maestro version, commit, and start time.

## Visual regression

Fixed profiles live in `quality/visual/manifest.json`:

- iPhone 15, iOS 17.5, `en-US`, font scale 1.
- Pixel 6, Android 16/API 36, `en-US`, font scale 1, gesture navigation.

Run `visual:test` with the same environment variables as E2E. Maestro crops to
the 35mm-owned gallery canvas, excluding status-bar variability, and captures
light controls plus dark state surfaces. PNG comparison enforces equal geometry,
an 8-channel noise threshold, and at most 0.1% changed pixels. Failed diffs are
written to ignored `artifacts/visual/diff/`.

Reviewed PNGs belong under
`quality/visual/baselines/<platform>/<capture>.png`. Baselines are intentionally
absent until both fixed native targets can render the app. A missing baseline
fails `visual:test`; it is never converted into an automatic approval. Baseline
addition requires reviewing actual and diff images, recording device/runtime,
and describing visual intent in the mobile work log.

## Performance evidence

`quality/performance/protocol.json` requires release-build evidence for cold and
warm launch, steady memory, slow-frame percentage, and Hermes bundle bytes.
Each result needs at least five runs, exact app/build/commit/device/tool metadata,
and non-negative finite samples. iOS evidence comes from Xcode Instruments App
Launch/Core Animation. Android evidence comes from Perfetto plus
`adb am start -W`, `dumpsys meminfo`, and `gfxinfo`.

Store raw traces outside Git and provide a measured JSON path:

```bash
MOBILE_PERFORMANCE_RESULT=/absolute/path/to/measured-result.json \
pnpm --filter @35mm/mobile performance:verify
```

Result JSON shape:

```json
{
  "schemaVersion": 1,
  "platform": "ios",
  "appId": "com.thirtyfivemm.mobile.preview",
  "buildType": "release",
  "commit": "git-commit-sha",
  "capturedAt": "ISO-8601 timestamp",
  "device": { "name": "physical device name", "os": "OS version" },
  "tool": { "name": "measurement tool", "version": "tool version" },
  "hermesBundleBytes": "positive integer",
  "runs": [
    {
      "coldLaunchMs": "number",
      "warmLaunchMs": "number",
      "steadyMemoryMb": "number",
      "slowFramePercent": "number from 0 through 100"
    }
  ]
}
```

Strings above document value types; measured files must contain JSON numbers.
Validator computes p50 and p95 without inventing release budgets. Approved
thresholds require Phase 1.9 device measurements and a recorded decision.

## Architecture and scale

Harness follows existing client-only provider/design-system boundaries. It adds
no API request, database/Redis operation, queue job, server mutation, schema,
cache, or index. At 1M+ DAU, backend volume remains unchanged because gallery
and quality runners execute only inside internal builds and test jobs. All
collections are fixed-size; screenshot and trace artifacts remain local/CI
artifacts rather than runtime app storage.

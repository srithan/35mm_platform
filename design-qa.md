# Discover streaming services — design QA

## Evidence

- Source visual truth: `/Users/srithan/.codex/generated_images/01a06adc-7e05-73a0-873f-3cd63f060535/exec-bf4d4600-8f76-4412-98ae-f5be25e24634.png`
- Browser-rendered modal implementation: `/Users/srithan/Documents/20-29 Coding/22 - Startup Projects/22.6 35mm_Prod.async/35mm_platform/design-qa-implementation.png`
- Browser-rendered shelf implementation after user clarification: `/Users/srithan/Documents/20-29 Coding/22 - Startup Projects/22.6 35mm_Prod.async/35mm_platform/design-qa-shelf-implementation.png`
- Route and state: authenticated `http://localhost:3000/discover`, light theme, streaming-service modal open with the default four-service lineup.
- Viewport: Chrome content viewport approximately 1728 × 1026 CSS px on a 2× display. The saved full-display implementation capture is 3456 × 2234 px; source is 1487 × 1058 px. The comparison input rendered both at a common display width and judged the shared modal crop, avoiding false differences from density and browser chrome.
- Primary interactions tested: open/close, initial focus, search filtering, add, remove, unchanged disabled save, optimistic shelf refresh, server rollback, visible failed-save recovery, per-service shelf filtering, and return to the combined lineup.
- Console checked: no feature-owned runtime errors. Remaining console noise comes from installed browser extensions, the existing chat no-op transport, Clerk development-key warning, and an existing hero-image LCP warning.

## Full-view comparison

The implementation preserves the source hierarchy: editorial heading, full-width search, compact selected lineup, restrained hairline separation, logo-led service grid, count, and paired footer actions. It intentionally uses the product's semantic light-theme tokens and warm-red action color. Following user clarification, the Discover shelf keeps a compact row of logo-only pills beneath the heading; text-heavy provider labels remain removed.

## Focused comparison

The modal is the dominant readable region in both captures, so the shared modal crop was sufficient without a second crop. Typography uses the product's display serif and mono labels; spacing follows the source's broad horizontal rhythm; colors use `bg`, `elevated`, `border`, `fg`, and `film-red` tokens; provider imagery uses real TMDB logo assets rather than drawn approximations; copy matches the approved direction. Square provider marks are an intentional compact adaptation of the source wordmarks and avoid the label-heavy layout the user rejected.

## Findings

- No actionable P0, P1, or P2 visual differences remain.
- P3: the implementation close control is quieter than the source's boxed oversized close control. This better matches the existing 35mm dialog system and avoids adding another visually dominant shape.

## Comparison history

1. Initial browser interaction found a P1 recovery issue: when a save failed because the local database migration was not applied, optimistic rollback reset the modal draft and cleared its error message.
2. Fixed the modal so draft initialization happens only on the closed-to-open transition. Parent preference updates while open no longer erase the draft or error.
3. Post-fix browser evidence confirmed the selected draft remains visible and `Services could not be saved. Try again.` appears after rollback. The clean modal was then reopened and captured at the same desktop state for the final visual comparison.
4. User clarified that service pills should remain visible on the shelf. Restored them as 64 × 48 CSS-pixel light-mode capsules containing only 32 × 32 provider marks. Post-fix browser evidence confirms all four default services remain legible without reintroducing space-heavy labels.
5. Made those pills functional shelf filters. A compact grid control represents all saved services; each provider mark switches only the streaming shelf to that provider, exposes a pressed state, and leaves the persisted lineup untouched. Live browser evidence confirmed Netflix returned a distinct eight-title set and the grid control restored the combined results.

## Implementation checklist

- [x] Keep compact logo-only service pills; remove their visible text labels.
- [x] Make each service pill selectable, with an accessible active state and an all-services reset.
- [x] Add `Edit your services` in the shelf header.
- [x] Use a light-theme, searchable, logo-only selector.
- [x] Support add, remove, cancel, save, empty search, loading, and error states.
- [x] Persist a bounded per-user preference and refetch only the provider-keyed streaming query.
- [x] Verify keyboard focus and modal semantics.
- [x] Verify focused component tests and cross-package type checks.

final result: passed

---

# Focused navigation — design QA

**Comparison Target**

- Source visual truth: `/var/folders/l7/51db3s7s7rq62syqfh92v8yw0000gn/T/codex-clipboard-34c6188d-12bc-4874-9931-74cec2caebd3.png` (3456 × 2166 pixels; supplied screenshot).
- Implementation evidence: Codex in-app browser, tab `2`, `http://localhost:3000/lists`, captured 2026-09-15 after enabling `NEXT_PUBLIC_FOCUSED_NAVIGATION=true`. Browser capture: 1265 × 886 CSS pixels at device scale factor 1. The browser tool retains this capture in task output rather than exposing a filesystem path.
- State: signed-in desktop, dark theme, `/lists`; focused navigation enabled; `More` open for menu verification.

**Findings**

- No actionable P0, P1, or P2 differences in the scoped navigation work.
- The source is a Substack reference and the implementation deliberately retains 35mm’s logo, typography, theme tokens, routes, and post-composer terminology. Both place one fixed left rail at viewport edge, put primary navigation below brand, keep an obvious selected state, and anchor `More` at rail bottom.
- `More` was opened in the browser. It exposes Profile, Bookmarks, Drafts, Contribute, Appearance, Privacy, Settings, and Log out — every existing profile-dropdown action.

**Required Fidelity Surfaces**

- Fonts and typography: 35mm’s existing DM Sans / DM Serif system remains intact. Sidebar labels use the app’s compact, semibold UI treatment and stay single-line.
- Spacing and layout rhythm: 248px fixed rail, 14px inner gutter, 46px navigation rows, 46px post action, and bottom-anchored `More` create a stable vertical rhythm without covering main content.
- Colors and visual tokens: rail uses existing `--bg`, `--border`, `--sunken`, and accent tokens, preserving light and dark themes.
- Image and asset fidelity: existing 35mm brand asset is used. Navigation uses the repository’s established icon library; no generated imagery or placeholder asset was introduced.
- Copy and content: labels map to current product routes. `More` preserves existing account-menu copy and subviews.

**Focused Region Comparison**

- Left navigation rail was inspected in the source and implementation captures. A second focused capture verified the open bottom `More` menu. No separate crop was required because both elements are clear at the browser capture scale.

**Primary Interactions Tested**

- Active Discover state at `/lists`.
- Bottom `More` expands to the full reused profile menu.
- Existing menu links and submenu entries are present in the browser accessibility tree.

**Implementation Checklist**

- [x] Flag defaults off, retaining current header/mobile navigation.
- [x] Flag replaces desktop header with fixed left rail.
- [x] Bottom `More` reuses full existing profile menu.
- [x] Main content offsets past rail.
- [x] Typecheck, targeted shell tests, and production build pass.

**Follow-up Polish**

- [P3] Review final light-theme typography against production content once the rollout flag is enabled in a shared environment.

**Comparison History**

- Initial implementation review found no actionable P0/P1/P2 issue; no visual-fix iteration was required.

final result: passed

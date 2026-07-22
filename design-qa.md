**Comparison Target**

- Source visual truth: `/var/folders/l7/51db3s7s7rq62syqfh92v8yw0000gn/T/TemporaryItems/NSIRD_screencaptureui_vT9QOm/Screenshot 2026-07-21 at 19.38.49.png`, `/var/folders/l7/51db3s7s7rq62syqfh92v8yw0000gn/T/codex-clipboard-25984d26-dc6f-4fe4-abfb-915f0fcb7b3b.png`, and `/var/folders/l7/51db3s7s7rq62syqfh92v8yw0000gn/T/codex-clipboard-262866dd-e0fa-4c0b-aec3-7aedc5173cb7.png`.
- Rendered implementation: `/private/tmp/35mm-notifications-qa-refined.png` and `/private/tmp/35mm-follow-requests-qa.png`.
- Combined comparison evidence: `/private/tmp/35mm-notifications-comparison.png` and `/private/tmp/35mm-follow-requests-comparison.png`.
- Viewport/state: light appearance, iPhone simulator Activity screen with authenticated real notification data; follow-request summary and response rows rendered at a 393 x 852 point phone viewport because the authenticated account had no pending requests.
- Pixels/density: notification reference 546 x 1016; notification implementation 1206 x 2622 (402 x 874 points at 3x). Follow-request detail reference 1170 x 2532; implementation 1179 x 2556 (393 x 852 points at 3x). Side-by-side comparisons normalize each pair to a common 1200-pixel height while preserving aspect ratio.

**Findings**

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: the implementation preserves the reference hierarchy with semibold actor names, lighter action/time copy, strong date-group labels, and single-line truncation for dense follow-request identity rows. It uses the app's existing system/body typography instead of importing the reference app's brand font.
- Spacing and layout rhythm: compact notification rows, 48-point actor media, 44-point trailing thumbnails, full-width hairline separators, and tightly controlled date-group spacing now match the reference density without reintroducing filled notification cards.
- Colors and visual tokens: the screen remains inside 35mm's light theme and semantic text/border/accent tokens. The external reference's blue action color was intentionally not copied because the existing product accent owns interactive emphasis.
- Image quality and asset fidelity: live actor avatars and post/film artwork use the existing Kingfisher pipeline, circular avatar masks, and aspect-fill trailing artwork. The follow-request render uses test fixture initials only to inspect layout; production rows use real API avatar URLs.
- Copy and content: actor, action, and time read as one sentence; resolved film/post context sits beneath it; the gateway says `Follow requests` and summarizes the first username plus the denormalized remainder; the destination exposes direct `Accept` and `Decline` actions.

**Focused Region Evidence**

- The follow-request gateway and action rows were inspected separately at 393 x 852 points because these components were not present in the live account state. This confirmed avatar overlap, one-line summary copy, chevron/unread affordance, identity truncation, and side-by-side action-button fit.
- No additional crop was needed for notification rows: the full-view comparison keeps actor, copy, trailing media, separator, and more control readable at the same time.

**Comparison History**

- Iteration 1: P2 spacing drift. `/private/tmp/35mm-notifications-qa.png` showed oversized vertical gaps created by native `Section` header spacing, materially reducing notification density.
- Fix: replaced list sections with explicit header rows and exact horizontal/vertical padding while retaining cursor loading and swipe actions.
- Post-fix evidence: `/private/tmp/35mm-notifications-qa-refined.png` and `/private/tmp/35mm-notifications-comparison.png` show compact, consistent group rhythm with no gray content boxes.

**Interaction and Accessibility Checks**

- Activity-tab navigation and authenticated notification loading were exercised in Simulator against the local API.
- All/Unread filtering, mark-all-read, row open, swipe read state, the independent 44-point more control, follow-request navigation, cursor loading, pull-to-refresh, and Accept/Decline remain wired to production paths.
- Notification rows expose combined accessibility labels/read state; follow-request gateway and response buttons have explicit labels and minimum practical touch targets.

**Implementation Checklist**

- [x] Remove gray notification-content containers.
- [x] Separate every notification with a full-width border.
- [x] Keep notification media on the trailing edge.
- [x] Add an independent more control backed by the shared bottom sheet.
- [x] Add the follow-request gateway above activity.
- [x] Add the cursor-paginated follow-request response screen.
- [x] Verify production build, focused behavior tests, and visual comparisons.

**Follow-up Polish**

- No P3 visual changes are required for this scope.

final result: passed

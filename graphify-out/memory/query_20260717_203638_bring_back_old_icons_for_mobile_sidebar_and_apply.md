---
type: "query"
date: "2026-07-17T20:36:38.554555+00:00"
question: "Bring back old icons for mobile sidebar and apply the mobile web push animation to apps/ios"
contributor: "graphify"
outcome: "useful"
source_nodes: ["MobileSidebar", "MobileTabBar", "ShellGrid"]
---

# Q: Bring back old icons for mobile sidebar and apply the mobile web push animation to apps/ios

## Answer

Expanded the query vocabulary around mobile sidebar, shell, grid, navigation, push, drawer, motion, spring, and icons. The graph located MobileSidebar, MobileTabBar, and ShellGrid; direct source and design QA confirmed a fixed sidebar underlay with the full mobile shell translating by the drawer width. Restored the established shared icon glyphs for existing web sidebar destinations and matched the full-width horizontal push in MainTabView with the web timing curve and Reduce Motion handling.

## Outcome

- Signal: useful

## Source Nodes

- MobileSidebar
- MobileTabBar
- ShellGrid
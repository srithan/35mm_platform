---
type: "query"
date: "2026-07-17T21:19:36.399803+00:00"
question: "Fix iOS sidebar tab bar rectangular container vertical shift and top overlay"
contributor: "graphify"
outcome: "dead_end"
source_nodes: ["Tab"]
---

# Q: Fix iOS sidebar tab bar rectangular container vertical shift and top overlay

## Answer

Existing graph query was a dead end because the current web graph does not index apps/ios Swift sources; it matched an unrelated web Tab node. Direct SwiftUI source inspection and iOS 26.5 Simulator visual QA identified the clipped safe-area-sized TabView wrapper and opaque UITabBar backdrop as the composition defects.

## Outcome

- Signal: dead_end

## Source Nodes

- Tab
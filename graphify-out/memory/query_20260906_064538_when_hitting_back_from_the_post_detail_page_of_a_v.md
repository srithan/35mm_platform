---
type: "query"
date: "2026-09-06T06:45:38.848478+00:00"
question: "When hitting back from the post detail page of a video post page, the home feed scroll position is slightly different"
contributor: "graphify"
outcome: "useful"
source_nodes: ["ScrollRestore()", "PostPageBackButton()"]
---

# Q: When hitting back from the post detail page of a video post page, the home feed scroll position is slightly different

## Answer

Expanded graph vocabulary: scroll, restore. Graph identifies ScrollRestore and PostPageBackButton. Source verification shows one-frame absolute restoration; changed to bounded event-driven post-anchor restoration to handle late video layout.

## Outcome

- Signal: useful

## Source Nodes

- ScrollRestore()
- PostPageBackButton()
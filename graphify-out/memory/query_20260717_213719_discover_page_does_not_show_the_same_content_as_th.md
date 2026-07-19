---
type: "architecture"
date: "2026-07-17T21:37:19.194489+00:00"
question: "Discover page does not show the same content as the Web version"
contributor: "graphify"
outcome: "corrected"
correction: "Graph results were structurally useful but incomplete; direct source inspection was required to enumerate DiscoverContent, ExploreTabContent, TVShowsTabContent, and NowPlayingTabContent behavior."
source_nodes: ["TrendingFilms()", "DiscoverRightPanel()"]
---

# Q: Discover page does not show the same content as the Web version

## Answer

Expanded discover into discovery, hero, featured, carousel, section, popular, trending, streaming, provider, genres, and films. The graph located web Discover shelf nodes; source verification showed the web page composes hero, streaming, trending, ranked, now-playing, popular, mood, TV, and current-release shelves from the cached TMDB proxy. iOS was a generic canonical catalog grid and also hardcoded a non-running deployed web origin. Corrected iOS to consume the configurable shared web proxy, mirror the default shelf hierarchy, refresh only provider content, and resolve TMDB selections through canonical catalog external IDs.

## Outcome

- Signal: corrected
- Correction: Graph results were structurally useful but incomplete; direct source inspection was required to enumerate DiscoverContent, ExploreTabContent, TVShowsTabContent, and NowPlayingTabContent behavior.

## Source Nodes

- TrendingFilms()
- DiscoverRightPanel()
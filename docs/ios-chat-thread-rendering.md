# iOS Chat Thread Rendering

Retained SwiftUI chat thread rendering uses a UIKit `UICollectionView` bridge for the message surface. The collection view is vertically flipped with `CGAffineTransform(scaleX: 1, y: -1)`, and each cell content view is flipped back. The data source order is newest first, so `contentOffset == .zero` is the bottom/newest edge and older-message pagination happens near the geometric far edge.

Diffable item identity is stable and message-id based: `.message(message.id)`. Message edits, reaction changes, local send state, read-receipt summaries, typing state, and bottom-anchor cells are reconfigured through `reconfigureItems` when item identity is unchanged. Typing and bottom-anchor rows are always-present data-source items, not headers or footers, because supplementary semantics invert poorly in the flipped coordinate space.

Known flipped-layout edges are handled in the bridge:

- Accessibility: visible message cells are exposed to VoiceOver in logical message order, oldest to newest, instead of flipped geometric order.
- Context menus: message actions are owned by the collection-view delegate with targeted previews against the unflipped cell content view, so long-press menus anchor to the correct bubble geometry.
- Keyboard avoidance: the SwiftUI composer remains outside the collection view in a bottom safe-area inset; the collection view uses interactive keyboard dismissal and treats offset zero as the bottom anchor.
- Scroll-to-message: replied-to jumps resolve the message-id diffable item and call `scrollToItem` in collection-view coordinates, rather than relying on SwiftUI `ScrollViewReader`.
- Pagination and media prefetch: collection-view prefetching loads older messages as the user nears the oldest edge and starts Kingfisher image prefetches for image/GIF/link preview rows, cancelling those prefetches when rows scroll past.

The surface intentionally keeps text and image messages as the first production cut while preserving the existing model/API content-type enum for `file`, `link`, and `gif`. Additional renderers can be added as new cell/content registrations without changing the flipped collection-view, diffable, or pagination architecture.

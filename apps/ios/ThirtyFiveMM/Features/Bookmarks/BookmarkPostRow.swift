import SwiftUI

struct BookmarkPostRow: View {
  let post: FeedPost
  let folderName: String
  let interactor: any PostInteracting
  let isPending: Bool
  let onOpenPost: () -> Void
  let onOpenImage: (PostImageDestination) -> Void
  let onShowActions: () -> Void

  var body: some View {
    VStack(spacing: 0) {
      HStack(spacing: 8) {
        Label(folderName, systemImage: "bookmark.fill")
          .font(.caption.bold())
          .foregroundStyle(.secondary)
          .lineLimit(1)

        Spacer(minLength: 8)

        Button("Saved post actions", systemImage: "ellipsis", action: onShowActions)
          .labelStyle(.iconOnly)
          .font(.body.bold())
          .foregroundStyle(.secondary)
          .frame(minWidth: 44, minHeight: 44)
          .disabled(isPending)
      }
      .padding(.leading, 68)
      .padding(.trailing, 8)

      PostCard(
        post: post,
        interactor: interactor,
        onOpenPost: onOpenPost,
        onOpenImage: onOpenImage
      )
      .allowsHitTesting(!isPending)
    }
    .background(Color(uiColor: .systemBackground))
    .opacity(isPending ? 0.72 : 1)
    .animation(.easeInOut(duration: 0.16), value: isPending)
  }
}

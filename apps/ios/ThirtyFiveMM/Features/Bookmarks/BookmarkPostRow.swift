import SwiftUI

struct BookmarkPostRow: View {
  let post: FeedPost
  let folderName: String?
  let interactor: any PostInteracting
  let isPending: Bool
  let onOpenPost: () -> Void
  let onOpenImage: (PostImageDestination) -> Void
  let postActions: [BottomActionSheetAction]
  let onDismissPostActions: () -> Void

  var body: some View {
    VStack(spacing: 0) {
      if let folderName {
        Label(folderName, systemImage: "bookmark.fill")
          .font(.caption.bold())
          .foregroundStyle(.secondary)
          .lineLimit(1)
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.leading, 68)
          .padding(.trailing, 16)
          .padding(.top, 10)
      }

      PostCard(
        post: post,
        interactor: interactor,
        onOpenPost: onOpenPost,
        onOpenImage: onOpenImage,
        postActionSheetTitle: "Saved post",
        postActionSheetActions: postActions,
        onDismissPostActions: onDismissPostActions
      )
      .allowsHitTesting(!isPending)
    }
    .background(Color(uiColor: .systemBackground))
    .opacity(isPending ? 0.72 : 1)
    .animation(.easeInOut(duration: 0.16), value: isPending)
  }
}

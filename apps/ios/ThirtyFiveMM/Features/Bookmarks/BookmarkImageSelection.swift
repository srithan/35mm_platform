import Foundation

struct BookmarkImageSelection: Identifiable, Equatable {
  let destination: PostImageDestination
  let post: FeedPost
  let transitionSource: PostImageTransitionSource?

  var id: String {
    "\(post.id)-\(destination.url)"
  }

  static func == (lhs: BookmarkImageSelection, rhs: BookmarkImageSelection) -> Bool {
    lhs.id == rhs.id
  }
}

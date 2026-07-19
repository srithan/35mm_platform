import Foundation

struct BookmarkImageSelection: Identifiable, Equatable {
  let destination: PostImageDestination
  let post: FeedPost

  var id: String {
    "\(post.id)-\(destination.url)"
  }

  static func == (lhs: BookmarkImageSelection, rhs: BookmarkImageSelection) -> Bool {
    lhs.id == rhs.id
  }
}

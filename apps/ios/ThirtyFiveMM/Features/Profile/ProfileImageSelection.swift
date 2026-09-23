import Foundation

struct ProfileImageSelection: Identifiable, Equatable {
  let destination: PostImageDestination
  let post: FeedPost
  let transitionSource: PostImageTransitionSource?

  var id: String { "\(post.id)-\(destination.url)" }

  static func == (lhs: ProfileImageSelection, rhs: ProfileImageSelection) -> Bool {
    lhs.id == rhs.id
  }
}

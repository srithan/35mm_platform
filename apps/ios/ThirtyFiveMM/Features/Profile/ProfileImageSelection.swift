import Foundation

struct ProfileImageSelection: Identifiable, Equatable {
  let destination: PostImageDestination
  let post: FeedPost

  var id: String { "\(post.id)-\(destination.url)" }
}

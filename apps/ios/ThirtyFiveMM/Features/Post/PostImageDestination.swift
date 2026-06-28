import Foundation

struct PostImageDestination: Hashable, Identifiable {
  let url: String
  let postId: String

  var id: String {
    "\(postId)-\(url)"
  }
}

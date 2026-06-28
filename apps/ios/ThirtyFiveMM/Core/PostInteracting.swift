import Foundation

@MainActor
protocol PostInteracting: AnyObject {
  func toggleLike(postId: String) async
  func toggleRepost(postId: String) async
  func toggleBookmark(postId: String) async
}

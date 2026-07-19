import Foundation

struct PostImageDestination: Hashable, Identifiable {
  let urls: [String]
  let initialIndex: Int
  let postId: String

  init(url: String, postId: String) {
    self.init(urls: [url], selectedURL: url, postId: postId)
  }

  init(urls: [String], selectedURL: String, postId: String) {
    let availableURLs = urls.filter { !$0.isEmpty }
    self.urls = availableURLs.isEmpty ? [selectedURL] : availableURLs
    self.initialIndex = self.urls.firstIndex(of: selectedURL) ?? 0
    self.postId = postId
  }

  var url: String {
    urls[initialIndex]
  }

  var id: String {
    "\(postId)-\(url)"
  }
}

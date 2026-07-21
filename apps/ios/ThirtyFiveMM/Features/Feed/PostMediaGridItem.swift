import SwiftUI

struct PostMediaGridItem: Hashable {
  let url: String
  let width: Int?
  let height: Int?

  var aspectRatio: CGFloat? {
    guard let width, let height, width > 0, height > 0 else { return nil }
    return CGFloat(width) / CGFloat(height)
  }

  static func imageItems(
    from media: [PostMedia]?,
    fallbackURLs: [String]? = nil
  ) -> [PostMediaGridItem] {
    if let media, !media.isEmpty {
      return
        media
        .filter { $0.type == nil || $0.type == "image" }
        .map {
          PostMediaGridItem(url: $0.url, width: $0.width, height: $0.height)
        }
        .filter { !$0.url.isEmpty }
    }

    return (fallbackURLs ?? [])
      .filter { !$0.isEmpty }
      .map { PostMediaGridItem(url: $0, width: nil, height: nil) }
  }
}

import Kingfisher
import SwiftUI

struct PostMediaImageButton: View {
  let item: PostMediaGridItem
  let index: Int
  let count: Int
  let displaySize: CGSize
  let clipCornerRadius: CGFloat
  let transitionCornerRadius: CGFloat
  let onSelectImage: (String, PostImageTransitionSource?) -> Void

  @StateObject private var transitionAnchor = PostImageTransitionAnchor()

  var body: some View {
    Button(action: openImage) {
      KFImage(URL(string: item.url))
        .setProcessor(FeedImagePipeline.processor(forDisplaySize: displaySize))
        .placeholder {
          Rectangle()
            .fill(Color(.tertiarySystemFill))
        }
        .fade(duration: 0.15)
        .resizable()
        .scaledToFill()
        .frame(width: displaySize.width, height: displaySize.height)
        .clipShape(.rect(cornerRadius: clipCornerRadius))
        .overlay {
          PostImageTransitionAnchorView(anchor: transitionAnchor)
            .allowsHitTesting(false)
        }
    }
    .buttonStyle(.plain)
    .accessibilityLabel("View image \(index + 1) of \(count)")
  }

  private func openImage() {
    onSelectImage(
      item.url,
      transitionAnchor.capture(
        url: item.url,
        displaySize: displaySize,
        cornerRadius: transitionCornerRadius
      )
    )
  }
}

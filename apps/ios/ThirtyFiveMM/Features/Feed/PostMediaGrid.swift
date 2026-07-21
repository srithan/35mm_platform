import Kingfisher
import SwiftUI

struct PostMediaGrid: View {
  let items: [PostMediaGridItem]
  let onSelectImage: ((String) -> Void)?

  init(
    items: [PostMediaGridItem],
    onSelectImage: ((String) -> Void)? = nil
  ) {
    self.items = Array(items.prefix(4))
    self.onSelectImage = onSelectImage
  }

  var body: some View {
    if items.isEmpty {
      EmptyView()
    } else {
      GeometryReader { proxy in
        let width = proxy.size.width
        grid(width: width)
      }
      .aspectRatio(containerAspectRatio, contentMode: .fit)
      .frame(maxWidth: .infinity)
    }
  }

  private var containerAspectRatio: CGFloat {
    switch items.count {
    case 1:
      return min(max(items[0].aspectRatio ?? 4.0 / 3.0, 0.72), 1.8)
    case 2:
      return 2.0
    case 3:
      return 0.8
    default:
      return 1.0
    }
  }

  @ViewBuilder
  private func grid(width: CGFloat) -> some View {
    let spacing: CGFloat = 2
    let halfWidth = (width - spacing) / 2

    switch items.count {
    case 1:
      mediaImage(items[0], index: 0, width: width, height: width / containerAspectRatio)
    case 2:
      HStack(spacing: spacing) {
        ForEach(items.indices, id: \.self) { index in
          mediaImage(items[index], index: index, width: halfWidth, height: halfWidth)
        }
      }
    case 3:
      VStack(spacing: spacing) {
        mediaImage(items[0], index: 0, width: width, height: width * 0.75)

        HStack(spacing: spacing) {
          mediaImage(items[1], index: 1, width: halfWidth, height: halfWidth)
          mediaImage(items[2], index: 2, width: halfWidth, height: halfWidth)
        }
      }
    default:
      VStack(spacing: spacing) {
        HStack(spacing: spacing) {
          mediaImage(items[0], index: 0, width: halfWidth, height: halfWidth)
          mediaImage(items[1], index: 1, width: halfWidth, height: halfWidth)
        }

        HStack(spacing: spacing) {
          mediaImage(items[2], index: 2, width: halfWidth, height: halfWidth)
          mediaImage(items[3], index: 3, width: halfWidth, height: halfWidth)
        }
      }
    }
  }

  @ViewBuilder
  private func mediaImage(
    _ item: PostMediaGridItem,
    index: Int,
    width: CGFloat,
    height: CGFloat
  ) -> some View {
    if let onSelectImage {
      Button {
        onSelectImage(item.url)
      } label: {
        remoteImage(item.url, width: width, height: height)
      }
      .buttonStyle(.plain)
      .accessibilityLabel("View image \(index + 1) of \(items.count)")
    } else {
      remoteImage(item.url, width: width, height: height)
        .accessibilityHidden(true)
    }
  }

  private func remoteImage(_ url: String, width: CGFloat, height: CGFloat) -> some View {
    KFImage(URL(string: url))
      .placeholder {
        Rectangle()
          .fill(Color(.tertiarySystemFill))
      }
      .resizable()
      .scaledToFill()
      .frame(width: width, height: height)
      .clipped()
  }
}

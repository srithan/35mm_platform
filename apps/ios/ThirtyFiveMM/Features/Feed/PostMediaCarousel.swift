import Kingfisher
import SwiftUI

struct PostMediaCarousel: View {
  let items: [PostMediaGridItem]
  let onSelectImage: (String) -> Void

  @Environment(\.theme) private var theme
  @State private var activeIndex = 0

  init(
    items: [PostMediaGridItem],
    onSelectImage: @escaping (String) -> Void
  ) {
    self.items = Array(items.prefix(4))
    self.onSelectImage = onSelectImage
  }

  var body: some View {
    if items.isEmpty {
      EmptyView()
    } else {
      VStack(alignment: .leading, spacing: 8) {
        PostMediaCarouselDots(count: items.count, activeIndex: activeIndex)

        GeometryReader { proxy in
          let cardWidth = max(132, proxy.size.width * 0.44)
          let trailingInset = max(0, proxy.size.width - cardWidth)

          ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: 8) {
              ForEach(items.indices, id: \.self) { index in
                PostMediaCarouselCell(
                  item: items[index],
                  index: index,
                  count: items.count,
                  width: cardWidth,
                  onSelectImage: onSelectImage
                )
                .background(
                  GeometryReader { itemProxy in
                    Color.clear.preference(
                      key: PostMediaCarouselOffsetPreferenceKey.self,
                      value: [index: itemProxy.frame(in: .named("post-media-carousel")).minX]
                    )
                  }
                )
              }

              Color.clear
                .frame(width: trailingInset, height: 1)
            }
          }
          .coordinateSpace(name: "post-media-carousel")
          .onPreferenceChange(PostMediaCarouselOffsetPreferenceKey.self) { offsets in
            updateActiveIndex(offsets)
          }
        }
        .aspectRatio(1.82, contentMode: .fit)
      }
    }
  }

  private func updateActiveIndex(_ offsets: [Int: CGFloat]) {
    guard let next = offsets.min(by: { abs($0.value) < abs($1.value) })?.key else {
      return
    }
    activeIndex = next
  }
}

private struct PostMediaCarouselCell: View {
  let item: PostMediaGridItem
  let index: Int
  let count: Int
  let width: CGFloat
  let onSelectImage: (String) -> Void

  var body: some View {
    Button {
      onSelectImage(item.url)
    } label: {
      KFImage(URL(string: item.url))
        .placeholder {
          Rectangle()
            .fill(Color(.tertiarySystemFill))
        }
        .resizable()
        .scaledToFill()
        .frame(width: width, height: width * 1.25)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
    .buttonStyle(.plain)
    .accessibilityLabel("View image \(index + 1) of \(count)")
  }
}

private struct PostMediaCarouselDots: View {
  let count: Int
  let activeIndex: Int

  @Environment(\.theme) private var theme

  var body: some View {
    HStack(spacing: 4) {
      ForEach(0..<count, id: \.self) { index in
        Capsule()
          .fill(index == activeIndex ? theme.text : theme.textSecondary)
          .frame(width: index == activeIndex ? 16 : 6, height: 6)
      }
    }
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
    .background(theme.bgSunken, in: Capsule())
    .accessibilityLabel("Image \(activeIndex + 1) of \(count)")
  }
}

private struct PostMediaCarouselOffsetPreferenceKey: PreferenceKey {
  static let defaultValue: [Int: CGFloat] = [:]

  static func reduce(value: inout [Int: CGFloat], nextValue: () -> [Int: CGFloat]) {
    value.merge(nextValue(), uniquingKeysWith: { _, new in new })
  }
}

import Kingfisher
import SwiftUI
import UIKit

struct PostMediaCarousel: View {
  let items: [PostMediaGridItem]
  let onSelectImage: (String, PostImageTransitionSource?) -> Void

  @Environment(\.theme) private var theme
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var activeIndex = 0

  init(
    items: [PostMediaGridItem],
    onSelectImage: @escaping (String, PostImageTransitionSource?) -> Void
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
          let cardWidth = Self.cardWidth(forViewportWidth: proxy.size.width)

          ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: Self.cellSpacing) {
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
            }
          }
          .background(PostMediaCarouselVerticalPanShield())
          .coordinateSpace(name: "post-media-carousel")
          .onPreferenceChange(PostMediaCarouselOffsetPreferenceKey.self) { offsets in
            let scrollOffset = max(0, -(offsets[0] ?? 0))
            updateActiveIndex(
              Self.activeIndex(
                forScrollOffset: scrollOffset,
                viewportWidth: proxy.size.width,
                cardWidth: cardWidth,
                itemCount: items.count
              )
            )
          }
        }
        .aspectRatio(Self.carouselAspectRatio, contentMode: .fit)
      }
    }
  }

  private func updateActiveIndex(_ next: Int) {
    guard next != activeIndex else { return }

    if reduceMotion {
      activeIndex = next
    } else {
      withAnimation(Self.indicatorAnimation) {
        activeIndex = next
      }
    }
  }

  private static let indicatorAnimation = Animation.spring(
    response: 0.24,
    dampingFraction: 0.86,
    blendDuration: 0.04
  )

  static let cellSpacing: CGFloat = 8
  private static let cardScale: CGFloat = 1.6
  private static let cardHeightRatio: CGFloat = 1.25
  static let cellCornerRadius: CGFloat = 16
  static let carouselAspectRatio: CGFloat = 1 / (0.44 * cardScale * cardHeightRatio)

  static func cardWidth(forViewportWidth viewportWidth: CGFloat) -> CGFloat {
    max(132, viewportWidth * 0.44) * cardScale
  }

  static func cardHeight(forCardWidth cardWidth: CGFloat) -> CGFloat {
    cardWidth * cardHeightRatio
  }

  static func contentWidth(
    itemCount: Int,
    cardWidth: CGFloat,
    spacing: CGFloat = cellSpacing
  ) -> CGFloat {
    guard itemCount > 0 else { return 0 }
    return CGFloat(itemCount) * cardWidth + CGFloat(itemCount - 1) * spacing
  }

  static func activeIndex(
    forScrollOffset scrollOffset: CGFloat,
    viewportWidth: CGFloat,
    cardWidth: CGFloat,
    itemCount: Int,
    spacing: CGFloat = cellSpacing
  ) -> Int {
    guard itemCount > 1 else { return 0 }

    let maxScrollOffset = max(
      0,
      contentWidth(itemCount: itemCount, cardWidth: cardWidth, spacing: spacing) - viewportWidth
    )
    guard maxScrollOffset > 0 else { return 0 }

    let clampedProgress = min(max(scrollOffset / maxScrollOffset, 0), 1)
    let rawIndex = (clampedProgress * CGFloat(itemCount - 1)).rounded()
    return min(max(Int(rawIndex), 0), itemCount - 1)
  }

  static func shouldShieldParentVerticalPan(
    translation: CGPoint,
    velocity: CGPoint
  ) -> Bool {
    let horizontalIntent = max(abs(translation.x), abs(velocity.x) / 30)
    let verticalIntent = max(translation.y, velocity.y / 30)
    return verticalIntent > 6 && verticalIntent > horizontalIntent * 1.15
  }
}

private struct PostMediaCarouselCell: View {
  let item: PostMediaGridItem
  let index: Int
  let count: Int
  let width: CGFloat
  let onSelectImage: (String, PostImageTransitionSource?) -> Void

  var body: some View {
    PostMediaImageButton(
      item: item,
      index: index,
      count: count,
      displaySize: CGSize(
        width: width,
        height: PostMediaCarousel.cardHeight(forCardWidth: width)
      ),
      clipCornerRadius: PostMediaCarousel.cellCornerRadius,
      transitionCornerRadius: PostMediaCarousel.cellCornerRadius,
      onSelectImage: onSelectImage
    )
  }
}

private struct PostMediaCarouselDots: View {
  let count: Int
  let activeIndex: Int

  @Environment(\.theme) private var theme

  var body: some View {
    HStack(spacing: 4) {
      ForEach(0..<count, id: \.self) { index in
        let isActive = index == activeIndex
        Capsule()
          .fill(isActive ? theme.text : theme.textSecondary)
          .frame(width: isActive ? 16 : 6, height: 6)
          .opacity(isActive ? 1 : 0.72)
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

private struct PostMediaCarouselVerticalPanShield: UIViewRepresentable {
  func makeCoordinator() -> Coordinator {
    Coordinator()
  }

  func makeUIView(context: Context) -> UIView {
    let view = UIView(frame: .zero)
    view.isUserInteractionEnabled = false
    return view
  }

  func updateUIView(_ uiView: UIView, context: Context) {
    DispatchQueue.main.async { [weak uiView, coordinator = context.coordinator] in
      guard let uiView else { return }
      coordinator.attach(to: uiView.enclosingHorizontalScrollView)
    }
  }

  final class Coordinator: NSObject, UIGestureRecognizerDelegate {
    private weak var scrollView: UIScrollView?
    private lazy var recognizer: UIPanGestureRecognizer = {
      let recognizer = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
      recognizer.cancelsTouchesInView = false
      recognizer.delegate = self
      return recognizer
    }()

    func attach(to scrollView: UIScrollView?) {
      guard self.scrollView !== scrollView else { return }
      if let current = self.scrollView {
        current.removeGestureRecognizer(recognizer)
      }
      self.scrollView = scrollView
      scrollView?.addGestureRecognizer(recognizer)
    }

    @objc private func handlePan(_ recognizer: UIPanGestureRecognizer) {}

    func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
      guard let pan = gestureRecognizer as? UIPanGestureRecognizer,
            let view = pan.view else {
        return false
      }
      return PostMediaCarousel.shouldShieldParentVerticalPan(
        translation: pan.translation(in: view),
        velocity: pan.velocity(in: view)
      )
    }

    func gestureRecognizer(
      _ gestureRecognizer: UIGestureRecognizer,
      shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
    ) -> Bool {
      false
    }
  }
}

private extension UIView {
  var enclosingHorizontalScrollView: UIScrollView? {
    var candidate = superview
    while let view = candidate {
      if let scrollView = view as? UIScrollView,
         scrollView.alwaysBounceHorizontal || scrollView.contentSize.width > scrollView.bounds.width {
        return scrollView
      }
      candidate = view.superview
    }
    return nil
  }
}

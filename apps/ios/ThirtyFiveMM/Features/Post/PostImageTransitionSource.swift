import Kingfisher
import SwiftUI
import UIKit

@MainActor
final class PostImageTransitionAnchor: ObservableObject {
  weak var view: UIView?

  func capture(
    url: String,
    displaySize: CGSize,
    cornerRadius: CGFloat
  ) -> PostImageTransitionSource? {
    guard let view, let window = view.window else { return nil }

    let frame = view.convert(view.bounds, to: window)
    guard Self.isUsable(frame) else { return nil }

    let image = ImageCache.default.retrieveImageInMemoryCache(
      forKey: url,
      options: FeedImagePipeline.options(forDisplaySize: displaySize)
    ) ?? ImageCache.default.retrieveImageInMemoryCache(forKey: url)

    return PostImageTransitionSource(
      url: url,
      initialFrameInWindow: frame,
      image: image,
      cornerRadius: cornerRadius,
      anchor: self,
      sourceWindow: window
    )
  }

  func resolvedFrame(in containerView: UIView) -> CGRect? {
    guard let view, let window = view.window, window === containerView.window else { return nil }

    let frameInWindow = view.convert(view.bounds, to: window)
    guard Self.isUsable(frameInWindow) else { return nil }

    let visibleFrame = frameInWindow.intersection(window.bounds)
    guard !visibleFrame.isNull,
          visibleFrame.width >= 1,
          visibleFrame.height >= 1 else {
      return nil
    }

    return view.convert(view.bounds, to: containerView)
  }

  private static func isUsable(_ frame: CGRect) -> Bool {
    frame.width.isFinite
      && frame.height.isFinite
      && frame.minX.isFinite
      && frame.minY.isFinite
      && frame.width > 0
      && frame.height > 0
  }
}

struct PostImageTransitionSource {
  let url: String
  let initialFrameInWindow: CGRect
  let image: UIImage?
  let cornerRadius: CGFloat

  private let anchor: PostImageTransitionAnchor
  private weak var sourceWindow: UIWindow?

  fileprivate init(
    url: String,
    initialFrameInWindow: CGRect,
    image: UIImage?,
    cornerRadius: CGFloat,
    anchor: PostImageTransitionAnchor,
    sourceWindow: UIWindow
  ) {
    self.url = url
    self.initialFrameInWindow = initialFrameInWindow
    self.image = image
    self.cornerRadius = cornerRadius
    self.anchor = anchor
    self.sourceWindow = sourceWindow
  }

  @MainActor
  func presentationFrame(in containerView: UIView) -> CGRect? {
    if let current = anchor.resolvedFrame(in: containerView) {
      return current
    }

    guard let sourceWindow, sourceWindow === containerView.window else { return nil }
    return containerView.convert(initialFrameInWindow, from: sourceWindow)
  }

  @MainActor
  func dismissalFrame(in containerView: UIView) -> CGRect? {
    anchor.resolvedFrame(in: containerView)
  }
}

struct PostImageOpenContext {
  let destination: PostImageDestination
  let transitionSource: PostImageTransitionSource?
}

struct PostImageTransitionAnchorView: UIViewRepresentable {
  let anchor: PostImageTransitionAnchor

  func makeUIView(context: Context) -> UIView {
    let view = UIView(frame: .zero)
    view.backgroundColor = .clear
    view.isUserInteractionEnabled = false
    anchor.view = view
    return view
  }

  func updateUIView(_ uiView: UIView, context: Context) {
    anchor.view = uiView
  }

  static func dismantleUIView(_ uiView: UIView, coordinator: ()) {
    uiView.removeFromSuperview()
  }
}

import Kingfisher
import UIKit

@MainActor
final class PostImageTransitionSession {
  let destination: PostImageDestination
  let source: PostImageTransitionSource?

  private(set) var currentURL: String
  private(set) var isZoomed = false
  private(set) var dragImageView: UIImageView?
  private var dragImageCover: UIView?
  private var viewerAnchors: [String: PostImageTransitionAnchor] = [:]
  private var dismissHandler: (() -> Void)?
  private var dismissalCompletion: (() -> Void)?

  init(destination: PostImageDestination, source: PostImageTransitionSource?) {
    self.destination = destination
    self.source = source
    currentURL = destination.url
  }

  func updateCurrentURL(_ url: String) {
    currentURL = url
  }

  func updateZoomed(_ isZoomed: Bool) {
    self.isZoomed = isZoomed
  }

  func cachedImage(for url: String) -> UIImage? {
    if source?.url == url, let sourceImage = source?.image {
      return sourceImage
    }

    return ImageCache.default.retrieveImageInMemoryCache(forKey: url)
  }

  func viewerAnchor(for url: String) -> PostImageTransitionAnchor {
    if let anchor = viewerAnchors[url] { return anchor }
    let anchor = PostImageTransitionAnchor()
    viewerAnchors[url] = anchor
    return anchor
  }

  func viewerFrame(in view: UIView) -> CGRect? {
    if let dragImageView {
      return dragImageView.convert(dragImageView.bounds, to: view)
    }
    return viewerAnchors[currentURL]?.resolvedFrame(in: view)
  }

  func beginImageDrag(in viewer: UIView) {
    guard dragImageView == nil, let container = viewer.superview,
          let image = transitionImage(), let frame = viewerFrame(in: container) else { return }
    let cover = UIView(frame: viewer.convert(frame, from: container))
    cover.backgroundColor = .black
    cover.isUserInteractionEnabled = false
    viewer.addSubview(cover)
    dragImageCover = cover

    let snapshot = UIImageView(image: image)
    snapshot.frame = frame
    snapshot.contentMode = .scaleAspectFill
    snapshot.clipsToBounds = true
    snapshot.isUserInteractionEnabled = false
    container.addSubview(snapshot)
    dragImageView = snapshot
  }

  func removeDragSnapshot() {
    dragImageView?.removeFromSuperview()
    dragImageView = nil
  }

  func endImageDrag() {
    removeDragSnapshot()
    dragImageCover?.removeFromSuperview()
    dragImageCover = nil
  }

  func transitionImage() -> UIImage? {
    cachedImage(for: currentURL)
  }

  func installDismissHandler(_ handler: @escaping () -> Void) {
    dismissHandler = handler
  }

  func dismiss() {
    dismissHandler?()
  }

  func dismiss(after completion: @escaping () -> Void) {
    dismissalCompletion = completion
    dismiss()
  }

  func completeDismissal() {
    endImageDrag()
    let completion = dismissalCompletion
    dismissalCompletion = nil
    completion?()
  }
}

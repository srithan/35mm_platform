import SwiftUI
import UIKit

struct ProfilePagingPanGesture: UIViewRepresentable {
  let isEnabled: Bool
  let shouldBegin: (CGFloat) -> Bool
  let onChanged: (CGFloat) -> Void
  let onEnded: (CGFloat, CGFloat) -> Void
  let onCancelled: () -> Void

  func makeCoordinator() -> Coordinator {
    Coordinator()
  }

  func makeUIView(context: Context) -> AttachmentView {
    let view = AttachmentView()
    view.isUserInteractionEnabled = false
    view.isAccessibilityElement = false
    view.onWindowChange = { [weak coordinator = context.coordinator] marker in
      coordinator?.attach(to: marker.window, marker: marker)
    }
    return view
  }

  func updateUIView(_ uiView: AttachmentView, context: Context) {
    context.coordinator.configure(
      isEnabled: isEnabled,
      shouldBegin: shouldBegin,
      onChanged: onChanged,
      onEnded: onEnded,
      onCancelled: onCancelled
    )
    context.coordinator.attach(to: uiView.window, marker: uiView)
  }

  static func dismantleUIView(_ uiView: AttachmentView, coordinator: Coordinator) {
    uiView.onWindowChange = nil
    coordinator.detach()
  }

  final class AttachmentView: UIView {
    var onWindowChange: ((AttachmentView) -> Void)?

    override func didMoveToWindow() {
      super.didMoveToWindow()
      onWindowChange?(self)
    }
  }

  @MainActor
  final class Coordinator: NSObject, UIGestureRecognizerDelegate {
    private weak var marker: AttachmentView?
    private weak var attachmentView: UIView?

    private var shouldBegin: (CGFloat) -> Bool = { _ in false }
    private var onChanged: (CGFloat) -> Void = { _ in }
    private var onEnded: (CGFloat, CGFloat) -> Void = { _, _ in }
    private var onCancelled: () -> Void = {}

    private lazy var recognizer: UIPanGestureRecognizer = {
      let recognizer = UIPanGestureRecognizer(target: self, action: #selector(handlePan))
      recognizer.delegate = self
      recognizer.maximumNumberOfTouches = 1
      recognizer.cancelsTouchesInView = true
      recognizer.delaysTouchesBegan = false
      recognizer.delaysTouchesEnded = false
      return recognizer
    }()

    func configure(
      isEnabled: Bool,
      shouldBegin: @escaping (CGFloat) -> Bool,
      onChanged: @escaping (CGFloat) -> Void,
      onEnded: @escaping (CGFloat, CGFloat) -> Void,
      onCancelled: @escaping () -> Void
    ) {
      self.shouldBegin = shouldBegin
      self.onChanged = onChanged
      self.onEnded = onEnded
      self.onCancelled = onCancelled
      recognizer.isEnabled = isEnabled
    }

    func attach(to view: UIView?, marker: AttachmentView) {
      self.marker = marker
      guard attachmentView !== view else { return }

      detachRecognizer()
      attachmentView = view
      view?.addGestureRecognizer(recognizer)
    }

    func detach() {
      detachRecognizer()
      marker = nil
      shouldBegin = { _ in false }
      onChanged = { _ in }
      onEnded = { _, _ in }
      onCancelled = {}
    }

    func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
      guard gestureRecognizer === recognizer,
            let marker,
            marker.window != nil,
            marker.bounds.contains(recognizer.location(in: marker)) else {
        return false
      }

      let velocity = recognizer.velocity(in: attachmentView)
      guard ProfileTab.hasHorizontalIntent(
        horizontalVelocity: velocity.x,
        verticalVelocity: velocity.y
      ) else {
        return false
      }

      return shouldBegin(velocity.x)
    }

    func gestureRecognizer(
      _ gestureRecognizer: UIGestureRecognizer,
      shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
    ) -> Bool {
      guard let scrollView = otherGestureRecognizer.view as? UIScrollView else {
        return false
      }

      let verticalRange = max(
        scrollView.contentSize.height
          + scrollView.adjustedContentInset.top
          + scrollView.adjustedContentInset.bottom
          - scrollView.bounds.height,
        0
      )
      let horizontalRange = max(
        scrollView.contentSize.width
          + scrollView.adjustedContentInset.left
          + scrollView.adjustedContentInset.right
          - scrollView.bounds.width,
        0
      )

      return scrollView.alwaysBounceVertical || verticalRange > horizontalRange
    }

    func gestureRecognizer(
      _ gestureRecognizer: UIGestureRecognizer,
      shouldBeRequiredToFailBy otherGestureRecognizer: UIGestureRecognizer
    ) -> Bool {
      otherGestureRecognizer is UIScreenEdgePanGestureRecognizer
    }

    @objc
    private func handlePan(_ recognizer: UIPanGestureRecognizer) {
      let translation = recognizer.translation(in: attachmentView).x

      switch recognizer.state {
      case .began, .changed:
        onChanged(translation)
      case .ended:
        onEnded(translation, recognizer.velocity(in: attachmentView).x)
      case .cancelled, .failed:
        onCancelled()
      case .possible:
        break
      @unknown default:
        onCancelled()
      }
    }

    private func detachRecognizer() {
      attachmentView?.removeGestureRecognizer(recognizer)
      attachmentView = nil
    }
  }
}

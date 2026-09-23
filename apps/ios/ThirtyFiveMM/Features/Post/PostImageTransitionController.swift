import UIKit

enum PostImageTransitionMath {
  static func dismissalProgress(translationY: CGFloat, containerHeight: CGFloat) -> CGFloat {
    guard containerHeight > 0 else { return 0 }
    let normalizedDistance = max(0, translationY) / max(containerHeight * 0.62, 1)
    return min(1 - exp(-normalizedDistance * 1.35), 0.99)
  }

  static func shouldFinishDismissal(
    progress: CGFloat,
    translationY: CGFloat,
    velocityY: CGFloat,
    containerHeight: CGFloat
  ) -> Bool {
    guard containerHeight > 0, translationY > 0, velocityY > -300 else { return false }
    let projectedDistance = max(0, translationY + velocityY * 0.2)
    return progress >= 0.42
      || projectedDistance >= containerHeight * 0.34
      || (velocityY >= 1_000 && progress >= 0.08)
  }
}

@MainActor
final class PostImageTransitioningDelegate: NSObject, UIViewControllerTransitioningDelegate {
  private let session: PostImageTransitionSession
  private let reduceMotion: Bool
  private let onDismissed: () -> Void
  private lazy var interactiveDismissal = PostImageInteractiveDismissalController(session: session)

  init(
    session: PostImageTransitionSession,
    reduceMotion: Bool,
    onDismissed: @escaping () -> Void
  ) {
    self.session = session
    self.reduceMotion = reduceMotion
    self.onDismissed = onDismissed
  }

  func attach(to viewController: UIViewController) {
    interactiveDismissal.attach(to: viewController)
  }

  func animationController(
    forPresented presented: UIViewController,
    presenting: UIViewController,
    source: UIViewController
  ) -> (any UIViewControllerAnimatedTransitioning)? {
    PostImageTransitionAnimator(
      operation: .presentation,
      session: session,
      reduceMotion: reduceMotion
    )
  }

  func animationController(
    forDismissed dismissed: UIViewController
  ) -> (any UIViewControllerAnimatedTransitioning)? {
    PostImageTransitionAnimator(
      operation: .dismissal,
      session: session,
      reduceMotion: reduceMotion,
      onCompleted: onDismissed
    )
  }
}

@MainActor
private final class PostImageTransitionAnimator: NSObject, UIViewControllerAnimatedTransitioning {
  enum Operation {
    case presentation
    case dismissal
  }

  private let operation: Operation
  private let session: PostImageTransitionSession
  private let reduceMotion: Bool
  private let onCompleted: (() -> Void)?
  private var propertyAnimator: UIViewPropertyAnimator?

  init(
    operation: Operation,
    session: PostImageTransitionSession,
    reduceMotion: Bool,
    onCompleted: (() -> Void)? = nil
  ) {
    self.operation = operation
    self.session = session
    self.reduceMotion = reduceMotion
    self.onCompleted = onCompleted
  }

  func transitionDuration(using transitionContext: (any UIViewControllerContextTransitioning)?) -> TimeInterval {
    reduceMotion ? 0.16 : 0.48
  }

  func animateTransition(using transitionContext: any UIViewControllerContextTransitioning) {
    interruptibleAnimator(using: transitionContext).startAnimation()
  }

  func interruptibleAnimator(
    using transitionContext: any UIViewControllerContextTransitioning
  ) -> any UIViewImplicitlyAnimating {
    if let propertyAnimator {
      return propertyAnimator
    }

    let animator: UIViewPropertyAnimator
    switch operation {
    case .presentation:
      animator = makePresentationAnimator(using: transitionContext)
    case .dismissal:
      animator = makeDismissalAnimator(using: transitionContext)
    }
    propertyAnimator = animator
    return animator
  }

  private func makePresentationAnimator(
    using transitionContext: any UIViewControllerContextTransitioning
  ) -> UIViewPropertyAnimator {
    guard let toViewController = transitionContext.viewController(forKey: .to) else {
      return completedNoopAnimator(using: transitionContext)
    }

    let containerView = transitionContext.containerView
    let toView = transitionContext.view(forKey: .to) ?? toViewController.view!
    toView.frame = transitionContext.finalFrame(for: toViewController)
    containerView.addSubview(toView)
    toView.layoutIfNeeded()

    guard !reduceMotion,
          let image = session.transitionImage(),
          let source = session.source,
          let sourceFrame = source.presentationFrame(in: containerView) else {
      return fadeAnimator(
        appearingView: toView,
        disappearingView: nil,
        transitionContext: transitionContext,
        completion: nil
      )
    }

    let targetFrame = session.viewerFrame(in: containerView) ?? PostImageViewerLayout.fittedImageFrame(
      imageSize: image.size,
      in: containerView.bounds.size
    )
    let imageCoverView = UIView(frame: toView.convert(targetFrame, from: containerView))
    imageCoverView.backgroundColor = .black
    imageCoverView.isUserInteractionEnabled = false
    toView.addSubview(imageCoverView)

    let transitionImageView = makeTransitionImageView(image: image, frame: sourceFrame)
    transitionImageView.layer.cornerRadius = source.cornerRadius
    toView.alpha = 0
    containerView.addSubview(transitionImageView)

    let animator = UIViewPropertyAnimator(duration: transitionDuration(using: transitionContext), dampingRatio: 0.88)
    animator.addAnimations {
      toView.alpha = 1
      transitionImageView.frame = targetFrame
      transitionImageView.layer.cornerRadius = 0
    }
    animator.addCompletion { [weak self] _ in
      let completed = !transitionContext.transitionWasCancelled
      toView.alpha = completed ? 1 : 0
      imageCoverView.removeFromSuperview()
      transitionImageView.removeFromSuperview()
      transitionContext.completeTransition(completed)
      self?.propertyAnimator = nil
    }
    return animator
  }

  private func makeDismissalAnimator(
    using transitionContext: any UIViewControllerContextTransitioning
  ) -> UIViewPropertyAnimator {
    guard let fromView = transitionContext.view(forKey: .from) else {
      return completedNoopAnimator(using: transitionContext)
    }

    let containerView = transitionContext.containerView
    if let toView = transitionContext.view(forKey: .to) {
      containerView.insertSubview(toView, belowSubview: fromView)
    }

    guard !reduceMotion,
          let image = session.transitionImage() else {
      return fadeAnimator(
        appearingView: nil,
        disappearingView: fromView,
        transitionContext: transitionContext,
        completion: onCompleted
      )
    }

    let startFrame = session.viewerFrame(in: containerView) ?? fromView.convert(PostImageViewerLayout.fittedImageFrame(
      imageSize: image.size,
      in: fromView.bounds.size
    ), to: containerView)
    let hasMatchingLiveSource = session.source?.url == session.currentURL
    let targetFrame = hasMatchingLiveSource
      ? session.source?.dismissalFrame(in: containerView)
      : nil
    let resolvedTargetFrame = targetFrame ?? offscreenDismissalFrame(
      from: startFrame,
      in: containerView.bounds
    )
    let targetCornerRadius = targetFrame == nil ? 0 : session.source?.cornerRadius ?? 0

    let imageCoverView = UIView(frame: fromView.convert(startFrame, from: containerView))
    imageCoverView.backgroundColor = .black
    imageCoverView.isUserInteractionEnabled = false
    fromView.addSubview(imageCoverView)

    let transitionImageView = makeTransitionImageView(image: image, frame: startFrame)
    transitionImageView.alpha = session.dragImageView == nil ? fromView.alpha : 1
    containerView.addSubview(transitionImageView)
    session.removeDragSnapshot()
    let dismissalCompletion = onCompleted

    let animator = UIViewPropertyAnimator(duration: transitionDuration(using: transitionContext), dampingRatio: 0.9)
    animator.addAnimations {
      fromView.alpha = 0
      transitionImageView.alpha = 1
      transitionImageView.frame = resolvedTargetFrame
      transitionImageView.layer.cornerRadius = targetCornerRadius
    }
    animator.addCompletion { [weak self] _ in
      let completed = !transitionContext.transitionWasCancelled
      fromView.alpha = 1
      imageCoverView.removeFromSuperview()
      fromView.transform = .identity
      transitionImageView.removeFromSuperview()
      transitionContext.completeTransition(completed)
      if completed {
        dismissalCompletion?()
      }
      self?.propertyAnimator = nil
    }
    return animator
  }

  private func offscreenDismissalFrame(from startFrame: CGRect, in containerBounds: CGRect) -> CGRect {
    let scale: CGFloat = 0.86
    let size = CGSize(width: startFrame.width * scale, height: startFrame.height * scale)
    return CGRect(
      x: startFrame.midX - size.width / 2,
      y: containerBounds.maxY + 24,
      width: size.width,
      height: size.height
    )
  }

  private func fadeAnimator(
    appearingView: UIView?,
    disappearingView: UIView?,
    transitionContext: any UIViewControllerContextTransitioning,
    completion: (() -> Void)?
  ) -> UIViewPropertyAnimator {
    appearingView?.alpha = 0

    let animator = UIViewPropertyAnimator(
      duration: reduceMotion ? 0.12 : 0.2,
      curve: .easeOut
    ) {
      appearingView?.alpha = 1
      disappearingView?.alpha = 0
    }
    animator.addCompletion { [weak self] _ in
      let completed = !transitionContext.transitionWasCancelled
      disappearingView?.alpha = 1
      disappearingView?.transform = .identity
      transitionContext.completeTransition(completed)
      if completed {
        completion?()
      }
      self?.propertyAnimator = nil
    }
    return animator
  }

  private func completedNoopAnimator(
    using transitionContext: any UIViewControllerContextTransitioning
  ) -> UIViewPropertyAnimator {
    let animator = UIViewPropertyAnimator(duration: 0, curve: .linear)
    animator.addCompletion { [weak self] _ in
      transitionContext.completeTransition(!transitionContext.transitionWasCancelled)
      self?.propertyAnimator = nil
    }
    return animator
  }

  private func makeTransitionImageView(image: UIImage, frame: CGRect) -> UIImageView {
    let imageView = UIImageView(image: image)
    imageView.frame = frame
    imageView.contentMode = .scaleAspectFill
    imageView.clipsToBounds = true
    imageView.backgroundColor = .black
    return imageView
  }
}

@MainActor
private final class PostImageInteractiveDismissalController: NSObject, UIGestureRecognizerDelegate {
  private let session: PostImageTransitionSession
  private weak var viewController: UIViewController?
  private var isSettling = false

  init(session: PostImageTransitionSession) {
    self.session = session
    super.init()
  }

  private lazy var panGesture: UIPanGestureRecognizer = {
    let gesture = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
    gesture.maximumNumberOfTouches = 1
    gesture.delegate = self
    return gesture
  }()

  func attach(to viewController: UIViewController) {
    self.viewController = viewController
    viewController.view.addGestureRecognizer(panGesture)
  }

  func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
    guard !session.isZoomed, !isSettling,
          let controller = viewController,
          !controller.isBeingPresented, !controller.isBeingDismissed,
          controller.presentedViewController == nil,
          let pan = gestureRecognizer as? UIPanGestureRecognizer,
          let view = pan.view else { return false }
    let velocity = pan.velocity(in: view)
    return velocity.y > 0 && velocity.y > abs(velocity.x) * 1.12
  }

  func gestureRecognizer(
    _ gestureRecognizer: UIGestureRecognizer,
    shouldBeRequiredToFailBy otherGestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    // Resolve direction before a lazily installed page scroll recognizer takes ownership.
    guard let scrollView = otherGestureRecognizer.view as? UIScrollView else { return false }
    return otherGestureRecognizer === scrollView.panGestureRecognizer
  }

  @objc private func handlePan(_ gesture: UIPanGestureRecognizer) {
    guard let view = gesture.view, let container = view.superview else { return }
    // Measure in the stationary container, never in the view being transformed.
    let translation = gesture.translation(in: container)
    let velocity = gesture.velocity(in: container)
    let progress = PostImageTransitionMath.dismissalProgress(
      translationY: translation.y,
      containerHeight: container.bounds.height
    )

    switch gesture.state {
    case .began, .changed:
      if gesture.state == .began {
        session.beginImageDrag(in: view)
      }
      if !UIAccessibility.isReduceMotionEnabled {
        let scale = 1 - progress * 0.18
        session.dragImageView?.transform = CGAffineTransform(translationX: translation.x, y: max(0, translation.y))
          .scaledBy(x: scale, y: scale)
      }
      view.alpha = max(0, 1 - progress * 5)
    case .ended:
      let shouldFinish = PostImageTransitionMath.shouldFinishDismissal(
        progress: progress,
        translationY: translation.y,
        velocityY: velocity.y,
        containerHeight: container.bounds.height
      )
      if shouldFinish {
        isSettling = true
        // The hero animator reads the live transformed image frame at this point.
        session.dismiss()
      } else {
        restore(view)
      }
    case .cancelled, .failed:
      restore(view)
    default:
      break
    }
  }

  private func restore(_ view: UIView) {
    isSettling = true
    UIView.animate(
      withDuration: UIAccessibility.isReduceMotionEnabled ? 0.12 : 0.3,
      delay: 0,
      usingSpringWithDamping: 1,
      initialSpringVelocity: 0,
      options: [.beginFromCurrentState, .allowUserInteraction]
    ) {
      self.session.dragImageView?.transform = .identity
      view.alpha = 1
    } completion: { [weak self] _ in
      self?.session.endImageDrag()
      self?.isSettling = false
    }
  }
}

import SwiftUI
import UIKit

struct PostImagePresentationLifecycle<ID: Hashable> {
  private(set) var activeID: ID?

  mutating func beginPresentation(for id: ID) -> Bool {
    guard activeID != id else { return false }
    activeID = id
    return true
  }

  @discardableResult
  mutating func finishPresentation(for id: ID) -> Bool {
    guard activeID == id else { return false }
    activeID = nil
    return true
  }

  mutating func reset() {
    activeID = nil
  }
}

struct PostImageViewerPresenter<Item: Identifiable, Viewer: View>: UIViewControllerRepresentable {
  @Binding var item: Item?

  let destination: (Item) -> PostImageDestination
  let transitionSource: (Item) -> PostImageTransitionSource?
  let content: (Item, PostImageTransitionSession) -> Viewer

  init(
    item: Binding<Item?>,
    destination: @escaping (Item) -> PostImageDestination,
    transitionSource: @escaping (Item) -> PostImageTransitionSource?,
    @ViewBuilder content: @escaping (Item, PostImageTransitionSession) -> Viewer
  ) {
    _item = item
    self.destination = destination
    self.transitionSource = transitionSource
    self.content = content
  }

  func makeCoordinator() -> Coordinator {
    Coordinator(item: $item)
  }

  func makeUIViewController(context: Context) -> PostImagePresentationHostController {
    PostImagePresentationHostController()
  }

  func updateUIViewController(
    _ hostController: PostImagePresentationHostController,
    context: Context
  ) {
    context.coordinator.item = $item

    guard let item else {
      context.coordinator.dismissIfNeeded()
      return
    }

    context.coordinator.present(
      item: item,
      destination: destination(item),
      source: transitionSource(item),
      content: content,
      from: hostController
    )
  }

  static func dismantleUIViewController(
    _ uiViewController: PostImagePresentationHostController,
    coordinator: Coordinator
  ) {
    coordinator.dismissImmediately()
  }

  @MainActor
  final class Coordinator {
    var item: Binding<Item?>

    private var lifecycle = PostImagePresentationLifecycle<Item.ID>()
    private weak var presentedController: UIViewController?
    private var transitionDelegate: PostImageTransitioningDelegate?

    init(item: Binding<Item?>) {
      self.item = item
    }

    func present(
      item: Item,
      destination: PostImageDestination,
      source: PostImageTransitionSource?,
      content: @escaping (Item, PostImageTransitionSession) -> Viewer,
      from hostController: PostImagePresentationHostController
    ) {
      guard presentedController == nil else { return }
      guard lifecycle.beginPresentation(for: item.id) else { return }

      hostController.performWhenAttached { [weak self, weak hostController] in
        guard let self, let hostController, self.presentedController == nil else { return }

        let session = PostImageTransitionSession(destination: destination, source: source)
        let viewerController = UIHostingController(rootView: content(item, session))
        viewerController.view.backgroundColor = .clear
        viewerController.modalPresentationStyle = .custom
        viewerController.modalPresentationCapturesStatusBarAppearance = true
        viewerController.isModalInPresentation = true

        let delegate = PostImageTransitioningDelegate(
          session: session,
          reduceMotion: UIAccessibility.isReduceMotionEnabled
        ) { [weak self] in
          self?.finishDismissal(for: item.id)
          session.completeDismissal()
        }
        viewerController.transitioningDelegate = delegate
        delegate.attach(to: viewerController)
        session.installDismissHandler { [weak viewerController] in
          viewerController?.dismiss(animated: true)
        }

        self.transitionDelegate = delegate
        self.presentedController = viewerController
        hostController.present(viewerController, animated: true)
      }
    }

    func dismissIfNeeded() {
      presentedController?.dismiss(animated: true)
    }

    func dismissImmediately() {
      presentedController?.dismiss(animated: false)
      clearPresentationState()
    }

    private func finishDismissal(for id: Item.ID) {
      guard lifecycle.finishPresentation(for: id) else { return }
      clearPresentationState()
      item.wrappedValue = nil
    }

    private func clearPresentationState() {
      lifecycle.reset()
      presentedController = nil
      transitionDelegate = nil
    }
  }
}

@MainActor
final class PostImagePresentationHostController: UIViewController {
  private var pendingAction: (() -> Void)?

  override func loadView() {
    let view = UIView(frame: .zero)
    view.backgroundColor = .clear
    view.isUserInteractionEnabled = false
    self.view = view
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    runPendingActionIfPossible()
  }

  func performWhenAttached(_ action: @escaping () -> Void) {
    pendingAction = action
    runPendingActionIfPossible()
  }

  private func runPendingActionIfPossible() {
    guard viewIfLoaded?.window != nil, let pendingAction else { return }
    self.pendingAction = nil
    pendingAction()
  }
}

extension View {
  func postImageViewer<Item: Identifiable, Viewer: View>(
    item: Binding<Item?>,
    destination: @escaping (Item) -> PostImageDestination,
    transitionSource: @escaping (Item) -> PostImageTransitionSource?,
    @ViewBuilder content: @escaping (Item, PostImageTransitionSession) -> Viewer
  ) -> some View {
    background {
      PostImageViewerPresenter(
        item: item,
        destination: destination,
        transitionSource: transitionSource,
        content: content
      )
      .frame(width: 0, height: 0)
      .accessibilityHidden(true)
    }
  }
}

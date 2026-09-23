import SwiftUI
import UIKit

/// Restores UIKit's native interactive pop gesture when a pushed SwiftUI
/// destination replaces the system navigation bar with app-owned chrome.
struct InteractivePopGestureEnabler: UIViewControllerRepresentable {
  func makeUIViewController(context: Context) -> Controller {
    Controller()
  }

  func updateUIViewController(_ uiViewController: Controller, context: Context) {
    uiViewController.scheduleInstall()
  }

  static func dismantleUIViewController(_ uiViewController: Controller, coordinator: Void) {
    uiViewController.uninstall()
  }

  @MainActor
  final class Controller: UIViewController, UIGestureRecognizerDelegate {
    private weak var installedGesture: UIGestureRecognizer?
    private weak var previousDelegate: (any UIGestureRecognizerDelegate)?
    private var installTask: Task<Void, Never>?

    override func viewWillAppear(_ animated: Bool) {
      super.viewWillAppear(animated)
      scheduleInstall()
    }

    override func viewDidDisappear(_ animated: Bool) {
      super.viewDidDisappear(animated)
      uninstall()
    }

    func scheduleInstall() {
      installTask?.cancel()
      installTask = Task { @MainActor [weak self] in
        await Task.yield()
        guard !Task.isCancelled else { return }
        self?.install()
      }
    }

    func uninstall() {
      installTask?.cancel()
      installTask = nil

      if installedGesture?.delegate === self {
        installedGesture?.delegate = previousDelegate
      }

      installedGesture = nil
      previousDelegate = nil
    }

    func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
      guard gestureRecognizer === installedGesture,
            let navigationController,
            navigationController.viewControllers.count > 1,
            navigationController.transitionCoordinator == nil else {
        return false
      }

      return true
    }

    private func install() {
      guard let navigationController,
            navigationController.viewControllers.count > 1,
            let gesture = navigationController.interactivePopGestureRecognizer else {
        return
      }

      guard installedGesture !== gesture || gesture.delegate !== self else {
        gesture.isEnabled = true
        return
      }

      uninstall()
      installedGesture = gesture
      previousDelegate = gesture.delegate
      gesture.delegate = self
      gesture.isEnabled = true
    }
  }
}

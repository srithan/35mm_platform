import SwiftUI

struct ProfileMediaViewerModifier: ViewModifier {
  @Binding var selection: ProfileMediaSelection?
  @State private var presentedSelection: ProfileMediaSelection?

  func body(content: Content) -> some View {
    content
      .onAppear {
        synchronizePresentation(with: selection)
      }
      .onChange(of: selection?.id) { _, _ in
        synchronizePresentation(with: selection)
      }
      .fullScreenCover(item: $presentedSelection, onDismiss: finishDismissal) { selectedMedia in
        ImageViewerView(
          url: selectedMedia.url,
          accessibilityLabel: selectedMedia.accessibilityLabel,
          footerText: "@\(selectedMedia.username)",
          isCircular: selectedMedia.isProfilePhoto,
          onClose: { selection = nil }
        )
        .presentationBackground(.black)
      }
  }

  private func synchronizePresentation(with newSelection: ProfileMediaSelection?) {
    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction) {
      presentedSelection = newSelection
    }
  }

  private func finishDismissal() {
    selection = nil
  }
}

extension View {
  func profileMediaViewer(selection: Binding<ProfileMediaSelection?>) -> some View {
    modifier(ProfileMediaViewerModifier(selection: selection))
  }
}

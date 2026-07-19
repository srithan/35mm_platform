import SwiftUI

struct ProfileCoverPreviewView: View {
  let url: String?
  let displayName: String
  let onOpen: (() -> Void)?

  var body: some View {
    if let onOpen {
      Button(action: onOpen) {
        ProfileCoverView(url: url)
      }
      .buttonStyle(.plain)
      .accessibilityLabel("View \(displayName)'s cover photo")
      .accessibilityIdentifier("profile.cover.preview")
    } else {
      ProfileCoverView(url: url)
    }
  }
}

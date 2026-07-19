import SwiftUI

struct ProfileEditErrorText: View {
  let message: String?

  var body: some View {
    if let message {
      Label(message, systemImage: "exclamationmark.circle.fill")
        .font(.caption)
        .foregroundStyle(ProfileDesign.accent)
        .accessibilityLabel("Error: \(message)")
    }
  }
}

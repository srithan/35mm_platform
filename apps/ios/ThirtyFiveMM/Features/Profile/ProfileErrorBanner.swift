import SwiftUI

struct ProfileErrorBanner: View {
  let message: String
  let onDismiss: () -> Void

  var body: some View {
    HStack(spacing: 10) {
      Image(systemName: "exclamationmark.triangle.fill")
        .foregroundStyle(ProfileDesign.accent)
      Text(message)
        .font(.footnote)
        .lineLimit(3)
      Spacer(minLength: 4)
      Button("Dismiss", systemImage: "xmark", action: onDismiss)
        .labelStyle(.iconOnly)
        .frame(minWidth: 44, minHeight: 44)
    }
    .padding(.leading, 14)
    .padding(.trailing, 6)
    .background(.regularMaterial, in: .rect(cornerRadius: 12))
    .shadow(color: .black.opacity(0.12), radius: 10, y: 4)
    .accessibilityElement(children: .contain)
  }
}

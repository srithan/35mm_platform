import SwiftUI

struct BookmarkErrorBanner: View {
  @Environment(\.theme) private var theme
  let message: String
  let dismiss: () -> Void

  var body: some View {
    HStack(spacing: 10) {
      Image(systemName: "exclamationmark.triangle.fill")
        .foregroundStyle(.orange)
        .accessibilityHidden(true)

      Text(message)
        .font(.footnote)
        .foregroundStyle(theme.text)
        .lineLimit(3)

      Spacer(minLength: 8)

      Button("Dismiss error", systemImage: "xmark", action: dismiss)
        .labelStyle(.iconOnly)
        .foregroundStyle(theme.textSecondary)
        .frame(minWidth: 44, minHeight: 44)
    }
    .padding(.leading, 12)
    .padding(.trailing, 4)
    .padding(.vertical, 4)
    .background(.regularMaterial, in: .rect(cornerRadius: 10))
    .shadow(color: .black.opacity(0.12), radius: 12, y: 4)
    .accessibilityElement(children: .combine)
  }
}

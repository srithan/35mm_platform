import SwiftUI

struct NotificationContentPreview: View {
  @Environment(\.theme) private var theme
  let title: String?
  let preview: String?

  var body: some View {
    VStack(alignment: .leading, spacing: DesignSystem.Spacing.xxs) {
      if let title {
        Text(title)
          .font(.footnote.weight(.semibold))
          .foregroundStyle(theme.text)
          .lineLimit(2)
      }

      if let preview {
        Text(preview)
          .font(.footnote)
          .foregroundStyle(theme.textSecondary)
          .lineSpacing(1)
          .lineLimit(2)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

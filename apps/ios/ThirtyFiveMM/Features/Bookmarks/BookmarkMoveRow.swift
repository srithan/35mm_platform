import SwiftUI

struct BookmarkMoveRow: View {
  @Environment(\.theme) private var theme
  let title: String
  let subtitle: String
  let systemImage: String
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 12) {
        Image(systemName: systemImage)
          .font(.title3.bold())
          .frame(width: 30)

        VStack(alignment: .leading, spacing: 2) {
          Text(title)
            .font(.body.bold())
          Text(subtitle)
            .font(.subheadline)
            .foregroundStyle(theme.textSecondary)
        }

        Spacer()

        if isSelected {
          Image(systemName: "checkmark.circle.fill")
            .font(.title3.bold())
            .accessibilityLabel("Selected")
        }
      }
      .foregroundStyle(theme.text)
      .padding(.vertical, 4)
    }
  }
}

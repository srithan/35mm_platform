import SwiftUI

struct ProfileInlineCount: View {
  @Environment(\.theme) private var theme
  let value: Int
  let label: String

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 4) {
      Text(value.compactFormatted)
        .font(.subheadline)
        .bold()
        .monospacedDigit()
        .foregroundStyle(theme.text)
      Text(label)
        .font(.subheadline)
        .foregroundStyle(theme.textSecondary)
    }
  }
}

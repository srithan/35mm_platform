import SwiftUI

struct ProfileMetricCard: View {
  @Environment(\.theme) private var theme
  let value: String
  let label: String
  let detail: String

  var body: some View {
    VStack(alignment: .leading, spacing: 7) {
      Text(value)
        .font(.title2)
        .bold()
        .monospacedDigit()
        .foregroundStyle(theme.text)
      Text(label)
        .font(.subheadline)
        .bold()
      Text(detail)
        .font(.caption)
        .foregroundStyle(theme.textSecondary)
        .lineLimit(2)
    }
    .frame(maxWidth: .infinity, minHeight: 110, alignment: .topLeading)
    .padding(14)
    .background(theme.bgSunken, in: .rect(cornerRadius: ProfileDesign.cardRadius))
    .accessibilityElement(children: .combine)
  }
}

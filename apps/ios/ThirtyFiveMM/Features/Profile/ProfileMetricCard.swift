import SwiftUI

struct ProfileMetricCard: View {
  let value: String
  let label: String
  let detail: String

  var body: some View {
    VStack(alignment: .leading, spacing: 7) {
      Text(value)
        .font(.title2)
        .bold()
        .monospacedDigit()
        .foregroundStyle(.primary)
      Text(label)
        .font(.subheadline)
        .bold()
      Text(detail)
        .font(.caption)
        .foregroundStyle(.secondary)
        .lineLimit(2)
    }
    .frame(maxWidth: .infinity, minHeight: 110, alignment: .topLeading)
    .padding(14)
    .background(Color(.secondarySystemBackground), in: .rect(cornerRadius: ProfileDesign.cardRadius))
    .accessibilityElement(children: .combine)
  }
}

import SwiftUI

struct ProfileInlineCount: View {
  let value: Int
  let label: String

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 4) {
      Text(value.compactFormatted)
        .font(.subheadline)
        .bold()
        .monospacedDigit()
      Text(label)
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
  }
}

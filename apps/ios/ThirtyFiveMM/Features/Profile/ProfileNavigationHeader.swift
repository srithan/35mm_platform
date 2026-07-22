import SwiftUI

struct ProfileNavigationHeader: View {
  @Environment(\.theme) private var theme
  let onBack: () -> Void

  var body: some View {
    ZStack {
      Text("Profile")
        .font(.headline)
        .foregroundStyle(theme.text)
        .accessibilityAddTraits(.isHeader)

      HStack {
        Button("Back", systemImage: "chevron.left", action: onBack)
          .labelStyle(.iconOnly)
          .font(.system(.title3, weight: .semibold))
          .foregroundStyle(theme.text)
          .frame(width: 44, height: 44)
          .contentShape(Rectangle())
          .buttonStyle(.plain)

        Spacer()
      }
      .padding(.horizontal, 8)
    }
    .frame(height: 56)
    .background(theme.bg)
    .overlay(alignment: .bottom) {
      Divider()
    }
  }
}

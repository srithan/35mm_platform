import SwiftUI

struct ProfileNavigationHeader: View {
  @Environment(\.theme) private var theme
  let title: String
  var showsBackButton = true
  let onBack: () -> Void

  var body: some View {
    ZStack {
      Text(title)
        .font(.headline)
        .foregroundStyle(theme.text)
        .lineLimit(1)
        .minimumScaleFactor(0.82)
        .accessibilityAddTraits(.isHeader)

      HStack {
        if showsBackButton {
          Button("Back", systemImage: "chevron.left", action: onBack)
            .labelStyle(.iconOnly)
            .font(.system(.title3, weight: .semibold))
            .foregroundStyle(theme.text)
            .frame(width: 44, height: 44)
            .contentShape(Rectangle())
            .buttonStyle(.plain)
        }

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

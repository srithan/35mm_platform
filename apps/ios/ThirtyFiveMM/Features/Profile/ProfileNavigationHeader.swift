import SwiftUI

struct ProfileNavigationHeader: View {
  let onBack: () -> Void

  var body: some View {
    ZStack {
      Text("Profile")
        .font(.headline)
        .accessibilityAddTraits(.isHeader)

      HStack {
        Button("Back", systemImage: "chevron.left", action: onBack)
          .labelStyle(.iconOnly)
          .font(.system(.title3, weight: .semibold))
          .foregroundStyle(Color(.label))
          .frame(width: 44, height: 44)
          .contentShape(Rectangle())
          .buttonStyle(.plain)

        Spacer()
      }
      .padding(.horizontal, 8)
    }
    .frame(height: 56)
    .background(Color(.systemBackground))
    .overlay(alignment: .bottom) {
      Divider()
    }
  }
}

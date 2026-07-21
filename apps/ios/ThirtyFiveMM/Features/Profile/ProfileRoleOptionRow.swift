import SwiftUI

struct ProfileRoleOptionRow: View {
  @Environment(\.theme) private var theme
  let role: ProfileRole
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(alignment: .top, spacing: 12) {
        Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
          .foregroundStyle(isSelected ? ProfileDesign.accent : Color.secondary)
          .font(.title3)

        VStack(alignment: .leading, spacing: 3) {
          Text(role.rawValue)
            .font(.subheadline)
            .bold()
            .foregroundStyle(theme.text)
          Text(role.description)
            .font(.caption)
            .foregroundStyle(theme.textSecondary)
            .fixedSize(horizontal: false, vertical: true)
        }

        Spacer(minLength: 0)
      }
      .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
      .contentShape(.rect)
    }
    .buttonStyle(.plain)
    .accessibilityAddTraits(isSelected ? .isSelected : [])
  }
}

import SwiftUI

struct FollowRequestRow: View {
  @Environment(\.theme) private var theme
  let request: FollowRequest
  let onAccept: () -> Void
  let onDecline: () -> Void

  var body: some View {
    HStack(spacing: DesignSystem.Spacing.sm) {
      NotificationAvatar(
        id: request.id,
        label: request.resolvedDisplayName,
        url: request.avatarUrl ?? request.avatarUrlLg,
        size: 52
      )

      VStack(alignment: .leading, spacing: 3) {
        Text(request.resolvedDisplayName)
          .font(.headline)
          .foregroundStyle(theme.text)
          .lineLimit(1)

        Text(request.profileSubtitle)
          .font(.subheadline)
          .foregroundStyle(theme.textSecondary)
          .lineLimit(1)
      }

      Spacer(minLength: DesignSystem.Spacing.xxs)

      HStack(spacing: DesignSystem.Spacing.xs) {
        Button("Accept", action: onAccept)
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(.white)
          .frame(width: 76, height: 40)
          .background(theme.accent, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
          .accessibilityLabel("Accept \(request.resolvedDisplayName)")

        Button("Decline", action: onDecline)
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(theme.text)
          .frame(width: 76, height: 40)
          .background(theme.fillStrong, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
          .accessibilityLabel("Decline \(request.resolvedDisplayName)")
      }
      .buttonStyle(.plain)
    }
    .padding(.horizontal, DesignSystem.Spacing.screenHorizontal)
    .padding(.vertical, 12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(theme.bg)
    .overlay(alignment: .bottom) {
      Rectangle()
        .fill(theme.border)
        .frame(height: 0.5)
    }
  }
}

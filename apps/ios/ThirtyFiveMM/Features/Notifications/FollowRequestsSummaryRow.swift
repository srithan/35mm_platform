import SwiftUI

struct FollowRequestsSummaryRow: View {
  @Environment(\.theme) private var theme
  let requests: [FollowRequest]
  let total: Int
  let onOpen: () -> Void

  var body: some View {
    Button(action: onOpen) {
      HStack(spacing: DesignSystem.Spacing.sm) {
        FollowRequestAvatarStack(requests: requests)

        VStack(alignment: .leading, spacing: 2) {
          Text("Follow requests")
            .font(.headline)
            .foregroundStyle(theme.text)

          Text(FollowRequest.summarySubtitle(requests: requests, total: total))
            .font(.subheadline)
            .foregroundStyle(theme.textSecondary)
            .lineLimit(1)
        }

        Spacer(minLength: DesignSystem.Spacing.xs)

        if total > 0 {
          Circle()
            .fill(theme.accent)
            .frame(width: 8, height: 8)
            .accessibilityHidden(true)
        }

        Image(systemName: "chevron.right")
          .font(.body.weight(.semibold))
          .foregroundStyle(theme.textTertiary)
          .accessibilityHidden(true)
      }
      .padding(.horizontal, DesignSystem.Spacing.screenHorizontal)
      .padding(.vertical, 13)
      .frame(maxWidth: .infinity, alignment: .leading)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .background(theme.bg)
    .overlay(alignment: .bottom) {
      Rectangle()
        .fill(theme.border)
        .frame(height: 0.5)
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(
      total > 0 ? "Follow requests, \(total) pending" : "Follow requests, none pending"
    )
    .accessibilityHint("Opens your follow requests")
  }
}

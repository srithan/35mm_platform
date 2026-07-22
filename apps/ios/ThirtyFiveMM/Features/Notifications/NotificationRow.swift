import SwiftUI

struct NotificationRow: View {
  @Environment(\.accessibilityDifferentiateWithoutColor) private var differentiateWithoutColor
  @Environment(\.theme) private var theme
  let item: NotificationItem
  let isOpening: Bool
  let onOpen: () -> Void
  let onMore: () -> Void

  var body: some View {
    HStack(alignment: .top, spacing: DesignSystem.Spacing.xs) {
      Button(action: onOpen) {
        HStack(alignment: .top, spacing: DesignSystem.Spacing.sm) {
          NotificationAvatarStack(item: item)

          VStack(alignment: .leading, spacing: 5) {
            HStack(alignment: .top, spacing: 6) {
              if !item.isRead {
                if differentiateWithoutColor {
                  Text("New")
                    .font(.caption2.bold())
                    .foregroundStyle(theme.accent)
                } else {
                  Circle()
                    .fill(theme.accent)
                    .frame(width: 6, height: 6)
                    .padding(.top, 6)
                    .accessibilityHidden(true)
                }
              }

              notificationText
                .font(.subheadline)
                .lineSpacing(1)
                .fixedSize(horizontal: false, vertical: true)
            }

            if item.contextTitle != nil || item.contextPreview != nil {
              NotificationContentPreview(
                title: item.contextTitle,
                preview: item.contextPreview
              )
            }

            if item.type == .followRequest {
              Text("Open Follow requests to respond")
                .font(.caption.weight(.semibold))
                .foregroundStyle(theme.socialAccent)
            }
          }

          if let posterURL = item.contextPosterURL {
            NotificationThumbnail(url: posterURL)
              .accessibilityHidden(true)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
      }
      .buttonStyle(.plain)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(item.notificationAccessibilityLabel)
      .accessibilityValue(item.isRead ? "Read" : "Unread")
      .accessibilityHint(item.destinationPostId == nil ? "Marks notification as read" : "Opens related post")

      if isOpening {
        ProgressView()
          .controlSize(.small)
          .frame(width: 24, height: 44)
      }

      Button("More options", systemImage: "ellipsis", action: onMore)
        .labelStyle(.iconOnly)
        .font(.body.weight(.semibold))
        .foregroundStyle(theme.textSecondary)
        .frame(width: 44, height: 44)
        .contentShape(Rectangle())
        .buttonStyle(.plain)
    }
    .padding(.leading, DesignSystem.Spacing.screenHorizontal)
    .padding(.trailing, DesignSystem.Spacing.xs)
    .padding(.vertical, 11)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(theme.bg)
    .overlay(alignment: .bottom) {
      Rectangle()
        .fill(theme.border)
        .frame(height: 0.5)
    }
  }

  private var notificationText: Text {
    Text(item.actorDisplaySummary)
      .fontWeight(.semibold)
      .foregroundStyle(theme.text)
      + Text(" \(item.inlineActionSummary). ")
      .foregroundStyle(theme.textSecondary)
      + Text(item.createdAt.relativeShort)
      .foregroundStyle(theme.textTertiary)
  }
}

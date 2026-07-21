import SwiftUI

struct BookmarkCollectionHeader: View {
  @Environment(\.theme) private var theme
  let title: String
  let count: Int
  let isLoading: Bool
  let showsActions: Bool
  let onShowActions: () -> Void

  var body: some View {
    HStack(spacing: 8) {
      Text(title)
        .font(.headline)
        .foregroundStyle(theme.text)
        .lineLimit(1)

      Text(count, format: .number.notation(.compactName))
        .font(.subheadline)
        .foregroundStyle(theme.textSecondary)
        .contentTransition(.numericText())

      Spacer()

      if isLoading {
        ProgressView()
          .controlSize(.small)
          .accessibilityLabel("Updating bookmarks")
      }

      if showsActions {
        Button("Folder actions", systemImage: "ellipsis", action: onShowActions)
          .labelStyle(.iconOnly)
          .buttonStyle(.plain)
          .foregroundStyle(theme.textSecondary)
          .frame(minWidth: 44, minHeight: 44)
          .accessibilityIdentifier("bookmarks.folder-actions")
      }
    }
    .padding(.leading)
    .padding(.trailing, 6)
    .frame(minHeight: 52)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Color(uiColor: .systemBackground))
  }
}

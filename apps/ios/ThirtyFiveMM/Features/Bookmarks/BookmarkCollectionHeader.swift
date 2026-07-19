import SwiftUI

struct BookmarkCollectionHeader: View {
  let title: String
  let count: Int
  let isLoading: Bool
  let showsActions: Bool
  let onShowActions: () -> Void

  var body: some View {
    HStack(spacing: 8) {
      Text(title)
        .font(.headline)
        .foregroundStyle(.primary)
        .lineLimit(1)

      Text(count, format: .number.notation(.compactName))
        .font(.subheadline)
        .foregroundStyle(.secondary)
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
          .foregroundStyle(.secondary)
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

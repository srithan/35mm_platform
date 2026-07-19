import SwiftUI

struct BookmarksControls: View {
  @Binding var searchText: String
  let filters: [BookmarkFilter]
  let unsortedCount: Int
  let selectedFilter: BookmarkFilter
  let onClearSearch: () -> Void
  let onSelectFilter: (BookmarkFilter) -> Void
  let onCreateFolder: () -> Void

  var body: some View {
    VStack(spacing: 8) {
      HStack(spacing: 10) {
        HStack(spacing: 9) {
          Image(systemName: "magnifyingglass")
            .foregroundStyle(.secondary)
            .accessibilityHidden(true)

          TextField("Search saved posts", text: $searchText)
            .font(.body.bold())
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .submitLabel(.search)
            .accessibilityIdentifier("bookmarks.search")

          if !searchText.isEmpty {
            Button("Clear search", systemImage: "xmark.circle.fill", action: onClearSearch)
              .labelStyle(.iconOnly)
              .foregroundStyle(.tertiary)
              .frame(minWidth: 44, minHeight: 44)
          }
        }
        .padding(.leading, 13)
        .frame(minHeight: 44)
        .background(Color(uiColor: .secondarySystemBackground), in: .rect(cornerRadius: 10))

        Button("New folder", systemImage: "plus", action: onCreateFolder)
          .labelStyle(.iconOnly)
          .font(.title3.bold())
          .foregroundStyle(.primary)
          .frame(minWidth: 44, minHeight: 44)
          .background(Color(uiColor: .secondarySystemBackground), in: .circle)
          .accessibilityIdentifier("bookmarks.new-folder")
      }
      .padding(.horizontal)

      ScrollView(.horizontal) {
        LazyHStack(spacing: 8) {
          ForEach(filters) { filter in
            BookmarkFilterChip(
              filter: filter,
              unsortedCount: unsortedCount,
              isSelected: filter.id == selectedFilter.id,
              action: { onSelectFilter(filter) }
            )
          }
        }
        .padding(.horizontal)
      }
      .scrollIndicators(.hidden)
      .frame(height: 44)
    }
    .padding(.top, 8)
    .padding(.bottom, 6)
  }
}

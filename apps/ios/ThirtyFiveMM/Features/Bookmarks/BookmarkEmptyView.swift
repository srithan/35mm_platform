import SwiftUI

struct BookmarkEmptyView: View {
  let isSearching: Bool
  let hasMore: Bool
  let filter: BookmarkFilter
  let createFolder: () -> Void
  let searchMore: () -> Void

  var body: some View {
    VStack(spacing: 12) {
      ContentUnavailableView(title, systemImage: icon, description: Text(message))

      if isSearching && hasMore {
        Button("Search next page", systemImage: "magnifyingglass", action: searchMore)
          .buttonStyle(.borderedProminent)
          .tint(.primary)
          .frame(minHeight: 44)
      } else if !isSearching {
        Button("Create folder", systemImage: "folder.badge.plus", action: createFolder)
          .buttonStyle(.borderedProminent)
          .tint(.primary)
          .frame(minHeight: 44)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding()
  }

  private var icon: String {
    isSearching ? "magnifyingglass" : "bookmark"
  }

  private var title: String {
    if isSearching { return "No matches in loaded posts" }

    switch filter {
    case .all:
      return "Nothing saved yet"
    case .unsorted:
      return "Unsorted is empty"
    case .folder(let folder):
      return "\(folder.name) is empty"
    }
  }

  private var message: String {
    if isSearching {
      return hasMore
        ? "Search the next cursor page or try another film, creator, or phrase."
        : "Try another film, creator, or phrase."
    }

    switch filter {
    case .all:
      return "Use the bookmark action on posts to save them."
    case .unsorted:
      return "Saved posts without a folder appear here."
    case .folder:
      return "Move saved posts here from All or Unsorted."
    }
  }
}

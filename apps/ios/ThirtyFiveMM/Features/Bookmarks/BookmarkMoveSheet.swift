import SwiftUI

struct BookmarkMoveSheet: View {
  @Environment(\.dismiss) private var dismiss

  let folders: [BookmarkFolder]
  let currentFolderId: String?
  let onSelect: (String?) -> Void

  var body: some View {
    NavigationStack {
      List {
        BookmarkMoveRow(
          title: "Unsorted",
          subtitle: "Default saved posts",
          systemImage: "tray",
          isSelected: currentFolderId == nil,
          action: { select(nil) }
        )

        Section("Folders") {
          ForEach(folders) { folder in
            BookmarkMoveRow(
              title: folder.name,
              subtitle: "^[\(folder.itemCount) saved post](inflect: true)",
              systemImage: "folder.fill",
              isSelected: currentFolderId == folder.id,
              action: { select(folder.id) }
            )
          }
        }
      }
      .navigationTitle("Move bookmark")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel", action: dismiss.callAsFunction)
        }
      }
    }
  }

  private func select(_ folderId: String?) {
    onSelect(folderId)
    dismiss()
  }
}

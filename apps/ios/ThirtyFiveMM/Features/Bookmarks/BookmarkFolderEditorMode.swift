import Foundation

enum BookmarkFolderEditorMode: Identifiable {
  case create
  case rename(String)

  var id: String {
    switch self {
    case .create:
      "create"
    case .rename:
      "rename"
    }
  }
}

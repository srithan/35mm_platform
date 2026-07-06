import Foundation

struct BookmarkFolder: Codable, Identifiable, Hashable {
  let id: String
  let name: String
  let itemCount: Int
  let createdAt: Date
  let updatedAt: Date
}

struct BookmarkFoldersResponse: Decodable {
  let folders: [BookmarkFolder]
  let unsortedCount: Int
}

struct BookmarkFolderResponse: Decodable {
  let folder: BookmarkFolder
}

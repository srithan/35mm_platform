import Foundation

struct Film: Codable, Identifiable {
  let id: String
  let title: String
  let releaseYear: Int?
  let posterUrl: String?
}

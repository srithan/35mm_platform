import Foundation

struct Post: Codable, Identifiable {
  let id: String
  let userId: String
  let body: String?
  let createdAt: Date
}

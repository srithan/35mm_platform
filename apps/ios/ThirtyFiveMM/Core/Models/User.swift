import Foundation

struct User: Codable, Identifiable {
  let id: String
  let clerkId: String
  let email: String
  let createdAt: Date
}

import Foundation

struct Notification: Codable, Identifiable {
  let id: String
  let type: String
  let createdAt: Date
  let readAt: Date?
}

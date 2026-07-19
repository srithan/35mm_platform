import Foundation

enum ProfileRole: String, CaseIterable, Identifiable {
  case cinephile = "Cinephile"
  case creator = "Creator"
  case critic = "Critic"
  case filmStudent = "Film Student"
  case industry = "Industry"

  var id: String { rawValue }

  var description: String {
    switch self {
    case .cinephile: "You primarily watch, log, and talk about films."
    case .creator: "You make films, videos, or visual work."
    case .critic: "You review, write, podcast, or publish film criticism."
    case .filmStudent: "You are studying film or learning the craft."
    case .industry: "You work in production, distribution, festivals, or studios."
    }
  }

  static func normalized(_ value: String?) -> ProfileRole {
    switch value?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() {
    case "creator": .creator
    case "critic", "film critic": .critic
    case "film_student", "film student": .filmStudent
    case "industry": .industry
    default: .cinephile
    }
  }
}

import Foundation

enum ProfileFollowState: String, Codable, Equatable {
  case none
  case requested
  case following
  case selfProfile = "self"
}

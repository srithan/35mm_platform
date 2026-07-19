enum ProfileScreenPhase: Equatable {
  case loading
  case content(PublicProfile)
  case failure(String)
  case blocked
}

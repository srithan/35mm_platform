import Foundation

struct PublicProfile: Codable, Identifiable, Equatable {
  let userId: String
  let username: String
  let displayName: String
  let bio: String?
  let avatarUrl: String?
  let avatarUrlLg: String?
  let coverUrl: String?
  let location: String?
  let website: String?
  let dateOfBirth: String?
  let role: String?
  let roleContext: String?
  let headline: String?
  let headlineContext: String?
  let filmsLoggedCount: Int
  let followerCount: Int
  let followingCount: Int
  let followState: ProfileFollowState
  let isPrivate: Bool
  let hasIncomingFollowRequest: Bool?
  let hasPendingRequestToViewer: Bool?
  let isMutedByViewer: Bool?
  let isDeactivated: Bool
  let moderationStatus: String?
  let createdAt: Date?

  var id: String { userId }

  var isOwnProfile: Bool { followState == .selfProfile }

  var displayByline: String {
    let trimmedRole = role?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let trimmedContext = roleContext?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

    if !trimmedContext.isEmpty {
      return "\(trimmedRole) · \(trimmedContext)"
    }
    return trimmedRole.isEmpty ? "Cinephile" : trimmedRole
  }

  func applying(_ patch: ProfileMutation.PublicProfilePatch) -> PublicProfile {
    PublicProfile(
      userId: patch.userId,
      username: patch.username,
      displayName: patch.displayName,
      bio: patch.bio,
      avatarUrl: patch.avatarUrl,
      avatarUrlLg: patch.avatarUrlLg,
      coverUrl: patch.coverUrl,
      location: patch.location,
      website: patch.website,
      dateOfBirth: patch.dateOfBirth,
      role: patch.role,
      roleContext: patch.roleContext,
      headline: patch.headline,
      headlineContext: patch.headlineContext,
      filmsLoggedCount: filmsLoggedCount,
      followerCount: followerCount,
      followingCount: followingCount,
      followState: followState,
      isPrivate: isPrivate,
      hasIncomingFollowRequest: hasIncomingFollowRequest,
      hasPendingRequestToViewer: hasPendingRequestToViewer,
      isMutedByViewer: isMutedByViewer,
      isDeactivated: isDeactivated,
      moderationStatus: moderationStatus,
      createdAt: createdAt
    )
  }

  func updatingRelationship(
    followState: ProfileFollowState? = nil,
    followerCount: Int? = nil,
    isMutedByViewer: Bool? = nil
  ) -> PublicProfile {
    PublicProfile(
      userId: userId,
      username: username,
      displayName: displayName,
      bio: bio,
      avatarUrl: avatarUrl,
      avatarUrlLg: avatarUrlLg,
      coverUrl: coverUrl,
      location: location,
      website: website,
      dateOfBirth: dateOfBirth,
      role: role,
      roleContext: roleContext,
      headline: headline,
      headlineContext: headlineContext,
      filmsLoggedCount: filmsLoggedCount,
      followerCount: followerCount ?? self.followerCount,
      followingCount: followingCount,
      followState: followState ?? self.followState,
      isPrivate: isPrivate,
      hasIncomingFollowRequest: hasIncomingFollowRequest,
      hasPendingRequestToViewer: hasPendingRequestToViewer,
      isMutedByViewer: isMutedByViewer ?? self.isMutedByViewer,
      isDeactivated: isDeactivated,
      moderationStatus: moderationStatus,
      createdAt: createdAt
    )
  }
}

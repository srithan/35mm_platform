import Foundation
import Testing
@testable import ThirtyFiveMM

struct NotificationPresentationTests {
  @Test
  func bundledActorSummaryIncludesActorsMissingFromProfileSlice() {
    let item = makeNotification(
      actorProfiles: [makeProfile(id: "user-1", name: "Maya")],
      bundleCount: 4
    )

    #expect(item.actorDisplaySummary == "Maya and 3 others")
  }

  @Test
  func bundledActorSummaryNamesVisibleActorsBeforeRemainingCount() {
    let item = makeNotification(
      actorProfiles: [
        makeProfile(id: "user-1", name: "Maya"),
        makeProfile(id: "user-2", name: "Theo"),
      ],
      bundleCount: 5
    )

    #expect(item.actorDisplaySummary == "Maya, Theo and 3 others")
  }

  @Test
  func contextPresentationTrimsContentAndKeepsFilmIdentitySeparateFromAction() {
    let item = makeNotification(
      type: .comment,
      entity: NotificationEntity(
        type: .post,
        id: "post-1",
        title: "  In the Mood for Love  ",
        thumbnailUrl: "https://cdn.example/poster.jpg",
        contentPreview: "  Every hallway feels like a memory.  ",
        username: "maya",
        postId: nil
      )
    )

    #expect(item.actionSummary == "Commented on your post")
    #expect(item.inlineActionSummary == "commented on your post")
    #expect(item.contextTitle == "In the Mood for Love")
    #expect(item.contextPreview == "Every hallway feels like a memory.")
    #expect(item.hasDisplayContext)
  }

  @Test
  func followRequestSummaryUsesFirstUsernameAndRemainingTotal() {
    let request = FollowRequest(
      requesterId: "user-1",
      username: "maya.frames",
      displayName: "Maya Frames",
      avatarUrl: nil,
      avatarUrlLg: nil,
      mutualFollowerCount: 2,
      requestedAt: .distantPast
    )

    #expect(FollowRequest.summarySubtitle(requests: [request], total: 5) == "maya.frames + 4 others")
    #expect(request.resolvedDisplayName == "Maya Frames")
    #expect(request.profileSubtitle == "@maya.frames · 2 mutuals")
  }

  @Test
  func followRequestSummaryRemainsUsefulWhenNothingIsPending() {
    #expect(FollowRequest.summarySubtitle(requests: [], total: 0) == "No pending requests")
  }

  private func makeNotification(
    type: NotificationType = .like,
    entity: NotificationEntity? = nil,
    actorProfiles: [NotificationActorProfile] = [],
    bundleCount: Int = 1
  ) -> NotificationItem {
    NotificationItem(
      id: "notification-1",
      type: type,
      actor: nil,
      entity: entity,
      isRead: false,
      actorIds: actorProfiles.map(\.userId),
      actorProfiles: actorProfiles,
      bundleCount: bundleCount,
      createdAt: Date(timeIntervalSince1970: 1_700_000_000)
    )
  }

  private func makeProfile(id: String, name: String) -> NotificationActorProfile {
    NotificationActorProfile(
      userId: id,
      username: name.lowercased(),
      displayName: name,
      avatarUrl: nil,
      avatarUrlLg: nil
    )
  }
}

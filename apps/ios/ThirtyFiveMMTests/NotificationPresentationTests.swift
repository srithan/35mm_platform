import Foundation
import Testing
@testable import ThirtyFiveMM

struct NotificationPresentationTests {
  @Test
  func notificationFilterDragProgressTracksSwipeDirection() {
    #expect(
      NotificationFilter.dragProgress(
        from: .all,
        translation: -120,
        pageWidth: 240,
        isRightToLeft: false
      ) == 0.5
    )
    #expect(
      NotificationFilter.dragProgress(
        from: .unread,
        translation: 120,
        pageWidth: 240,
        isRightToLeft: false
      ) == 0.5
    )
    #expect(
      NotificationFilter.dragProgress(
        from: .all,
        translation: -600,
        pageWidth: 240,
        isRightToLeft: false
      ) == 1
    )
  }

  @Test
  func notificationFilterDragProgressMirrorsInRightToLeftLayout() {
    #expect(
      NotificationFilter.dragProgress(
        from: .all,
        translation: 120,
        pageWidth: 240,
        isRightToLeft: true
      ) == 0.5
    )
  }

  @Test
  func notificationFilterSettlingProgressUsesPredictedSwipe() {
    #expect(
      NotificationFilter.settlingProgress(
        from: .all,
        translation: -80,
        predictedTranslation: -180,
        pageWidth: 240,
        isRightToLeft: false
      ) == 1
    )
    #expect(
      NotificationFilter.settlingProgress(
        from: .unread,
        translation: 50,
        predictedTranslation: 60,
        pageWidth: 240,
        isRightToLeft: false
      ) == 1
    )
  }

  @Test
  func notificationPageDecodesCurrentServerNotificationTypes() throws {
    let payload = """
    {
      "items": [
        {
          "id": "notification-report",
          "type": "report_status_update",
          "actor": null,
          "entity": null,
          "metadata": { "outcome": "actioned" },
          "isRead": false,
          "actorIds": [],
          "actorProfiles": [],
          "bundleCount": 1,
          "createdAt": "2026-09-21T12:00:00.000Z"
        },
        {
          "id": "notification-moderated",
          "type": "content_moderated",
          "actor": null,
          "entity": { "type": "post", "id": "post-1", "title": "A review", "thumbnailUrl": null, "contentPreview": "Policy update", "username": null, "postId": null },
          "metadata": { "contentType": "post", "action": "hidden" },
          "isRead": true,
          "actorIds": [],
          "actorProfiles": [],
          "bundleCount": 1,
          "createdAt": "2026-09-21T12:01:00.000Z"
        },
        {
          "id": "notification-review",
          "type": "content_under_review",
          "actor": null,
          "entity": null,
          "metadata": {},
          "isRead": false,
          "actorIds": [],
          "actorProfiles": [],
          "bundleCount": 1,
          "createdAt": "2026-09-21T12:02:00.000Z"
        }
      ],
      "nextCursor": null,
      "hasMore": false
    }
    """.data(using: .utf8)!

    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    decoder.dateDecodingStrategy = .custom { decoder in
      let container = try decoder.singleValueContainer()
      let value = try container.decode(String.self)
      let formatter = ISO8601DateFormatter()
      formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
      guard let date = formatter.date(from: value) else {
        throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid test date.")
      }
      return date
    }

    let page = try decoder.decode(NotificationPage.self, from: payload)

    #expect(page.items.map(\.type) == [.reportStatusUpdate, .contentModerated, .contentUnderReview])
    #expect(page.items[0].actionSummary == "Your report was reviewed")
    #expect(page.items[0].notificationAccessibilityLabel.hasPrefix("Your report was reviewed, "))
    #expect(!page.items[0].notificationAccessibilityLabel.contains("Someone"))
    #expect(page.items[1].contextPreview == "Policy update")
    #expect(page.items[2].isSystemNotification)
  }

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
  func followRelationshipNotificationsDoNotExposeRightSideMedia() {
    for type in [NotificationType.follow, .followRequest, .followRequestApproved] {
      let item = makeNotification(
        type: type,
        entity: NotificationEntity(
          type: .user,
          id: "user-1",
          title: "Maya Frames",
          thumbnailUrl: "https://cdn.example/avatar.jpg",
          contentPreview: nil,
          username: "maya",
          postId: nil
        )
      )

      #expect(item.contextPosterURL == nil)
      #expect(!item.hasDisplayContext)
    }
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

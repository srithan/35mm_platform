import Kingfisher
import UIKit
import XCTest
@testable import ThirtyFiveMM

final class FeedPostDecodingTests: XCTestCase {
  func testDecodesRepostContextAndQuotedPost() throws {
    let data = Data(
      """
      {
        "id": "11111111-1111-4111-8111-111111111111",
        "type": "text",
        "headline": null,
        "body": "Quote commentary",
        "createdAt": "2026-07-19T19:00:00Z",
        "visibility": "public",
        "repostCount": 3,
        "isReposted": true,
        "author": {
          "id": "author-1",
          "username": "critic",
          "displayName": "Film Critic"
        },
        "repostContext": {
          "activityId": "22222222-2222-4222-8222-222222222222",
          "repostedAt": "2026-07-19T20:00:00Z",
          "user": {
            "id": "viewer-1",
            "username": "maya",
            "displayName": "Maya"
          },
          "users": [
            {
              "id": "viewer-1",
              "username": "maya",
              "displayName": "Maya"
            },
            {
              "id": "viewer-2",
              "username": "teju",
              "displayName": "Teju"
            }
          ],
          "totalCount": 3,
          "includesOriginal": true
        },
        "quotedPost": {
          "id": "33333333-3333-4333-8333-333333333333",
          "type": "text",
          "headline": "Original headline",
          "body": "Original body",
          "createdAt": "2026-07-18T19:00:00Z",
          "author": {
            "id": "source-author",
            "username": "source",
            "displayName": "Source Author"
          },
          "media": [
            { "type": "image", "url": "https://cdn.example.com/first.jpg", "width": 800, "height": 1000 },
            { "type": "image", "url": "https://cdn.example.com/second.jpg", "width": 800, "height": 1000 }
          ],
          "linkPreview": null,
          "film": null,
          "poll": null
        },
        "quotedPostUnavailable": false
      }
      """.utf8
    )

    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    let post = try decoder.decode(FeedPost.self, from: data)

    XCTAssertEqual(post.repostContext?.users.map(\.displayName), ["Maya", "Teju"])
    XCTAssertEqual(post.repostContext?.totalCount, 3)
    XCTAssertTrue(post.repostContext?.includesOriginal == true)
    XCTAssertEqual(post.quotedPost?.id, "33333333-3333-4333-8333-333333333333")
    XCTAssertEqual(post.quotedPost?.author.username, "source")
    XCTAssertEqual(
      PostMediaGridItem.imageItems(from: post.quotedPost?.media).map(\.url),
      ["https://cdn.example.com/first.jpg", "https://cdn.example.com/second.jpg"]
    )
    XCTAssertFalse(post.quotedPostUnavailable)
  }

  func testPostMediaCarouselFlagRequiresMoreThanTwoImages() {
    XCTAssertFalse(PostCard.usesCarouselMediaPresentation(isEnabled: false, itemCount: 4))
    XCTAssertFalse(PostCard.usesCarouselMediaPresentation(isEnabled: true, itemCount: 1))
    XCTAssertFalse(PostCard.usesCarouselMediaPresentation(isEnabled: true, itemCount: 2))
    XCTAssertTrue(PostCard.usesCarouselMediaPresentation(isEnabled: true, itemCount: 3))
  }

  func testPostMediaCarouselBundleFlagDefaultsOn() {
    XCTAssertEqual(
      Bundle.main.object(forInfoDictionaryKey: "PostMediaCarouselEnabled") as? Bool,
      true
    )
  }

  func testPostMediaCarouselCardWidthIsSixtyPercentLarger() {
    XCTAssertEqual(
      PostMediaCarousel.cardWidth(forViewportWidth: 350),
      246.4,
      accuracy: 0.001
    )
    XCTAssertEqual(
      PostMediaCarousel.cardHeight(forCardWidth: 246.4),
      308,
      accuracy: 0.001
    )
    XCTAssertEqual(
      PostMediaCarousel.carouselAspectRatio,
      1.136364,
      accuracy: 0.001
    )
    XCTAssertEqual(PostMediaCarousel.cellCornerRadius, 16)
  }

  func testPostMediaCarouselContentWidthDoesNotAddTrailingRunway() {
    XCTAssertEqual(
      PostMediaCarousel.contentWidth(itemCount: 4, cardWidth: 154, spacing: 8),
      640
    )
  }

  func testPostMediaCarouselActiveIndexUsesBoundedScrollProgress() {
    let viewportWidth: CGFloat = 350
    let cardWidth: CGFloat = 154
    let maxScrollOffset = PostMediaCarousel.contentWidth(
      itemCount: 4,
      cardWidth: cardWidth,
      spacing: 8
    ) - viewportWidth

    XCTAssertEqual(
      PostMediaCarousel.activeIndex(
        forScrollOffset: -24,
        viewportWidth: viewportWidth,
        cardWidth: cardWidth,
        itemCount: 4,
        spacing: 8
      ),
      0
    )
    XCTAssertEqual(
      PostMediaCarousel.activeIndex(
        forScrollOffset: maxScrollOffset * 0.34,
        viewportWidth: viewportWidth,
        cardWidth: cardWidth,
        itemCount: 4,
        spacing: 8
      ),
      1
    )
    XCTAssertEqual(
      PostMediaCarousel.activeIndex(
        forScrollOffset: maxScrollOffset * 0.67,
        viewportWidth: viewportWidth,
        cardWidth: cardWidth,
        itemCount: 4,
        spacing: 8
      ),
      2
    )
    XCTAssertEqual(
      PostMediaCarousel.activeIndex(
        forScrollOffset: maxScrollOffset + 40,
        viewportWidth: viewportWidth,
        cardWidth: cardWidth,
        itemCount: 4,
        spacing: 8
      ),
      3
    )
  }

  func testPostMediaCarouselShieldsOnlyDownwardVerticalParentPan() {
    XCTAssertTrue(
      PostMediaCarousel.shouldShieldParentVerticalPan(
        translation: CGPoint(x: 4, y: 32),
        velocity: CGPoint(x: 20, y: 540)
      )
    )
    XCTAssertFalse(
      PostMediaCarousel.shouldShieldParentVerticalPan(
        translation: CGPoint(x: 32, y: 18),
        velocity: CGPoint(x: 620, y: 240)
      )
    )
    XCTAssertFalse(
      PostMediaCarousel.shouldShieldParentVerticalPan(
        translation: CGPoint(x: 2, y: -30),
        velocity: CGPoint(x: 10, y: -520)
      )
    )
  }

  func testPostImageViewerFitsLoadedImageInsideViewport() {
    let fitted = PostImageViewerLayout.fittedImageSize(
      imageSize: CGSize(width: 800, height: 600),
      in: CGSize(width: 390, height: 844)
    )

    XCTAssertEqual(fitted.width, 390, accuracy: 0.001)
    XCTAssertEqual(fitted.height, 292.5, accuracy: 0.001)
  }

  func testPostImageViewerPortraitImagesFillViewportWidth() {
    let fitted = PostImageViewerLayout.fittedImageSize(
      imageSize: CGSize(width: 800, height: 1200),
      in: CGSize(width: 390, height: 626)
    )

    XCTAssertEqual(fitted.width, 390, accuracy: 0.001)
    XCTAssertEqual(fitted.height, 585, accuracy: 0.001)
  }

  func testPostImageDestinationKeepsAllCarouselURLs() {
    let destination = PostImageDestination(
      urls: [
        "https://cdn.example.com/one.jpg",
        "https://cdn.example.com/two.jpg",
        "https://cdn.example.com/three.jpg",
      ],
      selectedURL: "https://cdn.example.com/two.jpg",
      postId: "post-1"
    )

    XCTAssertEqual(destination.urls.count, 3)
    XCTAssertEqual(destination.initialIndex, 1)
    XCTAssertEqual(destination.url, "https://cdn.example.com/two.jpg")
  }

  func testPostImageViewerCentersShortImageBetweenControls() {
    let frame = PostImageViewerLayout.fittedImageFrame(
      imageSize: CGSize(width: 800, height: 600),
      in: CGSize(width: 390, height: 844)
    )

    XCTAssertEqual(frame.minX, 0, accuracy: 0.001)
    XCTAssertEqual(frame.midY, (70 + 844 - 132) / 2, accuracy: 0.001)
    XCTAssertEqual(frame.width, 390, accuracy: 0.001)
    XCTAssertEqual(frame.height, 292.5, accuracy: 0.001)
  }

  func testPostImageViewerTallImageKeepsFullWidthAndTopInset() {
    let frame = PostImageViewerLayout.fittedImageFrame(
      imageSize: CGSize(width: 800, height: 1800),
      in: CGSize(width: 390, height: 844)
    )
    XCTAssertEqual(frame.minY, 70, accuracy: 0.001)
    XCTAssertEqual(frame.width, 390, accuracy: 0.001)
    XCTAssertEqual(frame.height, 877.5, accuracy: 0.001)
  }

  func testPostImageViewerClampsPinchZoomScale() {
    XCTAssertEqual(PostImageViewerLayout.clampedZoomScale(0.4), 1, accuracy: 0.001)
    XCTAssertEqual(PostImageViewerLayout.clampedZoomScale(2.25), 2.25, accuracy: 0.001)
    XCTAssertEqual(PostImageViewerLayout.clampedZoomScale(8), 4, accuracy: 0.001)
  }

  func testPostImagePresentationLifecycleAllowsSameImageAfterDismissal() {
    var lifecycle = PostImagePresentationLifecycle<String>()

    XCTAssertTrue(lifecycle.beginPresentation(for: "image-1"))
    XCTAssertFalse(lifecycle.beginPresentation(for: "image-1"))
    XCTAssertTrue(lifecycle.finishPresentation(for: "image-1"))
    XCTAssertTrue(lifecycle.beginPresentation(for: "image-1"))
  }

  func testPostImageInteractiveDismissalProgressIsDownwardAndRubberBanded() {
    XCTAssertEqual(
      PostImageTransitionMath.dismissalProgress(
        translationY: -40,
        containerHeight: 800
      ),
      0,
      accuracy: 0.001
    )

    let shortDrag = PostImageTransitionMath.dismissalProgress(
      translationY: 120,
      containerHeight: 800
    )
    let longDrag = PostImageTransitionMath.dismissalProgress(
      translationY: 480,
      containerHeight: 800
    )

    XCTAssertGreaterThan(shortDrag, 0)
    XCTAssertGreaterThan(longDrag, shortDrag)
    XCTAssertLessThan(longDrag, 1)
  }

  func testPostImageInteractiveDismissalUsesProjectedVelocity() {
    XCTAssertFalse(
      PostImageTransitionMath.shouldFinishDismissal(
        progress: 0.12,
        translationY: 60,
        velocityY: 120,
        containerHeight: 800
      )
    )
    XCTAssertTrue(
      PostImageTransitionMath.shouldFinishDismissal(
        progress: 0.12,
        translationY: 60,
        velocityY: 1_300,
        containerHeight: 800
      )
    )
    XCTAssertTrue(
      PostImageTransitionMath.shouldFinishDismissal(
        progress: 0.45,
        translationY: 180,
        velocityY: 0,
        containerHeight: 800
      )
    )
  }

  func testPostImageDismissalCancelsWhenUserReversesDirection() {
    XCTAssertFalse(PostImageTransitionMath.shouldFinishDismissal(
      progress: 0.6, translationY: 260, velocityY: -600, containerHeight: 800
    ))
    XCTAssertFalse(PostImageTransitionMath.shouldFinishDismissal(
      progress: 0, translationY: 0, velocityY: 1_400, containerHeight: 800
    ))
  }

  @MainActor
  func testPostImageHeroUsesLiveViewerFrameAfterDragAndPageChange() throws {
    let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
    let container = UIView(frame: window.bounds)
    window.addSubview(container)
    let viewer = UIView(frame: container.bounds)
    container.addSubview(viewer)
    let image = UIView(frame: CGRect(x: 0, y: 70, width: 390, height: 292.5))
    viewer.addSubview(image)
    let session = PostImageTransitionSession(
      destination: PostImageDestination(
        urls: ["https://example.com/one.jpg", "https://example.com/two.jpg"],
        selectedURL: "https://example.com/one.jpg", postId: "post-1"
      ), source: nil
    )
    session.viewerAnchor(for: session.currentURL).view = image
    XCTAssertEqual(try XCTUnwrap(session.viewerFrame(in: container)), image.frame)

    viewer.transform = CGAffineTransform(translationX: 20, y: 120).scaledBy(x: 0.9, y: 0.9)
    let draggedFrame = try XCTUnwrap(session.viewerFrame(in: container))
    XCTAssertEqual(draggedFrame, image.convert(image.bounds, to: container))
    XCTAssertNotEqual(draggedFrame, image.frame)

    session.updateCurrentURL("https://example.com/two.jpg")
    XCTAssertNil(session.viewerFrame(in: container))
    let secondImage = UIView(frame: CGRect(x: 0, y: 70, width: 390, height: 585))
    viewer.addSubview(secondImage)
    session.viewerAnchor(for: session.currentURL).view = secondImage
    XCTAssertEqual(session.viewerFrame(in: container), secondImage.convert(secondImage.bounds, to: container))
  }

  @MainActor
  func testImageDragMovesOnlyImageAndCleansUpOnCancellation() throws {
    let url = "https://example.com/image-drag-regression.jpg"
    let bitmap = UIGraphicsImageRenderer(size: CGSize(width: 80, height: 60)).image { context in
      UIColor.red.setFill()
      context.fill(CGRect(x: 0, y: 0, width: 80, height: 60))
    }
    ImageCache.default.store(bitmap, forKey: url, toDisk: false)
    defer { ImageCache.default.removeImage(forKey: url, fromDisk: false) }
    let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
    let container = UIView(frame: window.bounds)
    window.addSubview(container)
    let viewer = UIView(frame: container.bounds)
    container.addSubview(viewer)
    let image = UIView(frame: CGRect(x: 0, y: 70, width: 390, height: 292.5))
    viewer.addSubview(image)
    let session = PostImageTransitionSession(
      destination: PostImageDestination(urls: [url], selectedURL: url, postId: "post-1"),
      source: nil
    )
    session.viewerAnchor(for: url).view = image
    session.beginImageDrag(in: viewer)
    let snapshot = try XCTUnwrap(session.dragImageView)
    XCTAssertEqual(snapshot.frame, image.frame)
    XCTAssertTrue(snapshot.superview === container)
    snapshot.transform = CGAffineTransform(translationX: 10, y: 130).scaledBy(x: 0.9, y: 0.9)
    XCTAssertEqual(viewer.transform, .identity)
    XCTAssertEqual(image.frame.minY, 70)
    XCTAssertEqual(session.viewerFrame(in: container), snapshot.frame)
    session.endImageDrag()
    XCTAssertNil(snapshot.superview)
    XCTAssertNil(session.dragImageView)
    XCTAssertEqual(viewer.subviews.count, 1)
    XCTAssertEqual(session.viewerFrame(in: container), image.frame)
  }

  func testDeduplicatesNormalizedRepostRowsAndMergesSocialProof() throws {
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    let rows = try decoder.decode(
      [FeedPost].self,
      from: Data(
        """
        [
          {
            "id": "11111111-1111-4111-8111-111111111111",
            "type": "text",
            "body": "Original",
            "createdAt": "2026-07-18T19:00:00Z",
            "visibility": "public",
            "repostCount": 3,
            "author": { "id": "author-1", "username": "source" }
          },
          {
            "id": "11111111-1111-4111-8111-111111111111",
            "type": "text",
            "body": "Original",
            "createdAt": "2026-07-18T19:00:00Z",
            "visibility": "public",
            "likeCount": 7,
            "repostCount": 3,
            "isReposted": true,
            "author": { "id": "author-1", "username": "source" },
            "repostContext": {
              "activityId": "22222222-2222-4222-8222-222222222222",
              "repostedAt": "2026-07-19T20:00:00Z",
              "user": { "id": "viewer-1", "username": "maya", "displayName": "Maya" },
              "users": [
                { "id": "viewer-1", "username": "maya", "displayName": "Maya" }
              ],
              "totalCount": 3,
              "includesOriginal": false
            }
          }
        ]
        """.utf8
      )
    )

    let deduplicated = FeedPost.deduplicating(rows)

    XCTAssertEqual(deduplicated.count, 1)
    XCTAssertEqual(deduplicated[0].likeCount, 7)
    XCTAssertTrue(deduplicated[0].isReposted)
    XCTAssertEqual(deduplicated[0].repostContext?.users.first?.displayName, "Maya")
    XCTAssertTrue(deduplicated[0].repostContext?.includesOriginal == true)
  }

  func testDecodesFilmCardAndAuthorPresentationFields() throws {
    let data = Data(
      """
      {
        "id": "01J00000000000000000000000",
        "type": "log",
        "headline": null,
        "body": "Now Watching",
        "createdAt": "2026-07-17T19:25:00Z",
        "editedAt": null,
        "isRepost": false,
        "repostOfId": null,
        "visibility": "public",
        "likeCount": 1,
        "commentCount": 0,
        "repostCount": 0,
        "bookmarkCount": 0,
        "isLiked": true,
        "isReposted": false,
        "isBookmarked": false,
        "film": {
          "id": "01J11111111111111111111111",
          "title": "The Farm",
          "year": 2019,
          "posterUrl": "/poster.jpg",
          "genres": ["Horror"],
          "rating": 4.5
        },
        "author": {
          "id": "user-1",
          "username": "srithan",
          "displayName": "Srithan Reddy Savela",
          "avatarUrl": "https://cdn.example.com/avatar.jpg",
          "role": "Cinephile",
          "roleContext": null,
          "filmsLoggedCount": 42
        },
        "poll": null
      }
      """.utf8
    )

    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    let post = try decoder.decode(FeedPost.self, from: data)

    XCTAssertEqual(post.film?.id, "01J11111111111111111111111")
    XCTAssertEqual(post.film?.genres, ["Horror"])
    XCTAssertEqual(post.film?.rating, 4.5)
    XCTAssertEqual(post.starRating, 4.5)
    XCTAssertEqual(post.author.role, "Cinephile")
    XCTAssertEqual(post.author.filmsLoggedCount, 42)
    XCTAssertEqual(
      AuthorRoleLabel.headline(for: post.author),
      "Cinephile · 42 films logged"
    )
  }

  func testRichTextParagraphsUseSingleLineBreaks() throws {
    let stored =
      RichTextParser.sentinel
      + #"{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"First"}]},{"type":"paragraph","content":[{"type":"text","text":"Second"}]}]}"#

    let rendered = try XCTUnwrap(RichTextParser.parse(stored))

    XCTAssertEqual(String(rendered.characters), "First\nSecond")
  }

  func testLinkPreviewPresentationDefaultsAndSuppressesStoredURL() throws {
    let legacyPreview = try JSONDecoder().decode(
      LinkPreview.self,
      from: Data(#"{"url":"https://example.com/story"}"#.utf8)
    )
    XCTAssertEqual(legacyPreview.presentation, .urlAndCard)

    let preview = try JSONDecoder().decode(
      LinkPreview.self,
      from: Data(
        #"{"url":"https://example.com/story","presentation":"card_only"}"#.utf8
      )
    )
    XCTAssertEqual(preview.presentation, .cardOnly)

    let stored =
      RichTextParser.sentinel
      + #"{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Worth reading"}]},{"type":"paragraph","content":[{"type":"text","text":"https://example.com/story"}]}]}"#
    let rendered = try XCTUnwrap(
      RichTextParser.parse(stored, suppressingURL: preview.url)
    )

    XCTAssertEqual(String(rendered.characters), "Worth reading")
  }

  func testExtractsWebParityVideoPreviewsAndDeduplicatesURLs() throws {
    let previews = URLVideoPreview.previews(
      in: "Watch https://youtu.be/abc123, then https://vimeo.com/98765 and https://youtu.be/abc123"
    )

    XCTAssertEqual(previews.map(\.provider), [.youtube, .vimeo])
    XCTAssertEqual(previews.map(\.videoID), ["abc123", "98765"])
    XCTAssertEqual(
      previews.map(\.thumbnailURL.absoluteString),
      [
        "https://img.youtube.com/vi/abc123/hqdefault.jpg",
        "https://vumbnail.com/98765.jpg",
      ]
    )

    let dailymotion = try XCTUnwrap(
      URLVideoPreview.previews(in: "https://www.dailymotion.com/video/x9abc_title").first
    )
    XCTAssertEqual(dailymotion.provider, .dailymotion)
    XCTAssertEqual(dailymotion.videoID, "x9abc")
  }

  func testLinkPreviewVideoUsesServerThumbnail() throws {
    let preview = try JSONDecoder().decode(
      LinkPreview.self,
      from: Data(
        #"{"url":"https://www.youtube.com/watch?v=abc123","image":"https://cdn.example.com/custom.jpg"}"#.utf8
      )
    )

    let video = try XCTUnwrap(URLVideoPreview(linkPreview: preview))

    XCTAssertEqual(video.provider, .youtube)
    XCTAssertEqual(video.thumbnailURL.absoluteString, "https://cdn.example.com/custom.jpg")
  }

  func testFeedRelativeTimestampMatchesWebBuckets() {
    let now = Date(timeIntervalSince1970: 2_000_000_000)

    XCTAssertEqual(now.addingTimeInterval(30).feedRelativeShort(relativeTo: now), "now")
    XCTAssertEqual(now.addingTimeInterval(-59).feedRelativeShort(relativeTo: now), "now")
    XCTAssertEqual(now.addingTimeInterval(-60).feedRelativeShort(relativeTo: now), "1m")
    XCTAssertEqual(now.addingTimeInterval(-3_599).feedRelativeShort(relativeTo: now), "59m")
    XCTAssertEqual(now.addingTimeInterval(-3_600).feedRelativeShort(relativeTo: now), "1h")
    XCTAssertEqual(now.addingTimeInterval(-86_399).feedRelativeShort(relativeTo: now), "23h")
    XCTAssertEqual(now.addingTimeInterval(-86_400).feedRelativeShort(relativeTo: now), "1d")
    XCTAssertEqual(now.addingTimeInterval(-5_184_000).feedRelativeShort(relativeTo: now), "60d")
  }

  func testShareDestinationsMatchWebContracts() throws {
    let sharedURL = try XCTUnwrap(URL(string: "https://35mm.in/maya/post/post_1"))
    let xURL = ShareURLFactory.destination(
      for: .x,
      sharedURL: sharedURL,
      title: "Maya on 35mm"
    )
    let messageURL = ShareURLFactory.destination(
      for: .message,
      sharedURL: sharedURL,
      title: "Maya on 35mm"
    )

    let xComponents = try XCTUnwrap(URLComponents(url: xURL, resolvingAgainstBaseURL: false))
    XCTAssertEqual(xComponents.host, "twitter.com")
    XCTAssertEqual(xComponents.path, "/intent/tweet")
    XCTAssertEqual(xComponents.queryItems?.first(where: { $0.name == "url" })?.value, sharedURL.absoluteString)
    XCTAssertEqual(xComponents.queryItems?.first(where: { $0.name == "text" })?.value, "Maya on 35mm")

    let messageComponents = try XCTUnwrap(URLComponents(url: messageURL, resolvingAgainstBaseURL: false))
    XCTAssertEqual(messageComponents.scheme, "sms")
    XCTAssertEqual(
      messageComponents.queryItems?.first(where: { $0.name == "body" })?.value,
      "Maya on 35mm \(sharedURL.absoluteString)"
    )
  }

  func testDecodesCommentAuthorRolePresentationFields() throws {
    let data = Data(
      """
      {
        "id": "comment-1",
        "postId": "post-1",
        "parentId": null,
        "body": "Great framing.",
        "createdAt": "2026-07-19T01:00:00Z",
        "editedAt": null,
        "likeCount": 0,
        "isLiked": false,
        "isDeleted": false,
        "author": {
          "id": "user-1",
          "username": "maya.frames",
          "displayName": "Maya Frames",
          "avatarUrl": null,
          "role": "Critic",
          "roleContext": "Frame by Frame",
          "filmsLoggedCount": 84
        }
      }
      """.utf8
    )

    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    let comment = try decoder.decode(Comment.self, from: data)

    XCTAssertEqual(comment.author.role, "Critic")
    XCTAssertEqual(comment.author.roleContext, "Frame by Frame")
    XCTAssertEqual(comment.author.filmsLoggedCount, 84)
    XCTAssertEqual(
      AuthorRoleLabel.headline(for: comment.author),
      "Critic · Frame by Frame"
    )
  }
}

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

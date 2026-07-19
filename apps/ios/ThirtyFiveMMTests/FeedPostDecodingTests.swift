import XCTest
@testable import ThirtyFiveMM

final class FeedPostDecodingTests: XCTestCase {
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

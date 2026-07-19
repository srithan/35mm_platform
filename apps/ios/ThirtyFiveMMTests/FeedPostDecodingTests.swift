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
  }

  func testRichTextParagraphsUseSingleLineBreaks() throws {
    let stored =
      RichTextParser.sentinel
      + #"{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"First"}]},{"type":"paragraph","content":[{"type":"text","text":"Second"}]}]}"#

    let rendered = try XCTUnwrap(RichTextParser.parse(stored))

    XCTAssertEqual(String(rendered.characters), "First\nSecond")
  }
}

import XCTest
@testable import ThirtyFiveMM

final class CatalogDecodingTests: XCTestCase {
  func testDecodesCanonicalTitleDetailAndSocialBridge() throws {
    let data = Data(
      """
      {
        "id": "01JCATALOG000000000000001",
        "type": "movie",
        "primaryTitle": "The Long Goodbye",
        "originalTitle": null,
        "slug": "the-long-goodbye-1973",
        "startYear": 1973,
        "endYear": null,
        "releaseDate": "1973-03-07",
        "runtimeMinutes": 112,
        "primaryLanguage": "en",
        "primaryCountry": "US",
        "isVerified": true,
        "primaryMedia": {
          "id": "media-1",
          "type": "poster",
          "url": "https://cdn.example.com/poster.jpg",
          "title": null,
          "caption": null,
          "attribution": "Studio",
          "isPrimary": true
        },
        "legacyFilmId": "01J11111111111111111111111",
        "synopsis": "A private eye investigates a friend's disappearance.",
        "originCountries": ["US"],
        "spokenLanguages": ["en", "es"],
        "seasonNumber": null,
        "episodeNumber": null,
        "externalIds": [{
          "id": "external-1",
          "provider": "imdb",
          "externalId": "tt0070334",
          "url": null,
          "isPrimary": true
        }]
      }
      """.utf8
    )

    let detail = try JSONDecoder().decode(CatalogTitleDetail.self, from: data)

    XCTAssertEqual(detail.id, "01JCATALOG000000000000001")
    XCTAssertEqual(detail.legacyFilmId, "01J11111111111111111111111")
    XCTAssertEqual(detail.card.yearText, "1973")
    XCTAssertEqual(detail.primaryMedia?.type, "poster")
    XCTAssertEqual(detail.imdbURL?.absoluteString, "https://www.imdb.com/title/tt0070334")
  }

  func testDecodesCreditWithPersonAndCharacter() throws {
    let data = Data(
      """
      {
        "id": "credit-1",
        "department": "cast",
        "job": "Actor",
        "characterName": "Philip Marlowe",
        "creditedAs": null,
        "billingOrder": 1,
        "episodeCount": null,
        "person": {
          "id": "person-1",
          "primaryName": "Elliott Gould",
          "primaryProfessions": ["actor"],
          "isVerified": true,
          "primaryMedia": null
        }
      }
      """.utf8
    )

    let credit = try JSONDecoder().decode(CatalogCredit.self, from: data)

    XCTAssertEqual(credit.person?.primaryName, "Elliott Gould")
    XCTAssertEqual(credit.roleText, "Philip Marlowe")
    XCTAssertEqual(credit.departmentLabel, "Cast")
  }
}

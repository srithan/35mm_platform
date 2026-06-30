import XCTest
@testable import ThirtyFiveMM

final class ChatDecodingTests: XCTestCase {
  private var decoder: JSONDecoder {
    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    decoder.dateDecodingStrategy = .custom(Self.decodeISO8601Date)
    return decoder
  }

  func testChatRequestPayloadsEncodeBackendCamelCaseKeys() throws {
    let encoder = JSONEncoder()
    let messageData = try encoder.encode(SendChatMessageRequest(
      contentType: .text,
      body: "hello",
      mediaUrl: nil,
      mediaMetadata: ChatMediaMetadata(
        width: 1200,
        height: 800,
        size: 240000,
        mimeType: "image/jpeg",
        blurhash: nil
      ),
      linkPreview: nil,
      replyToId: "6f5d9b40-361e-11ef-b5d5-0242ac120002"
    ))
    let message = try XCTUnwrap(JSONSerialization.jsonObject(with: messageData) as? [String: Any])

    XCTAssertEqual(message["contentType"] as? String, "text")
    XCTAssertEqual(message["replyToId"] as? String, "6f5d9b40-361e-11ef-b5d5-0242ac120002")
    XCTAssertNil(message["content_type"])
    XCTAssertNil(message["reply_to_id"])

    let presignData = try encoder.encode(MediaPresignRequest(
      kind: "post_media",
      contentType: "image/jpeg",
      contentLength: 1024
    ))
    let presign = try XCTUnwrap(JSONSerialization.jsonObject(with: presignData) as? [String: Any])

    XCTAssertEqual(presign["contentType"] as? String, "image/jpeg")
    XCTAssertEqual(presign["contentLength"] as? Int, 1024)
    XCTAssertNil(presign["content_type"])
    XCTAssertNil(presign["content_length"])
  }

  func testDecodesTextMessage() throws {
    let message = try decodeMessage(
      """
      {
        "id": "6f5d9b40-361e-11ef-b5d5-0242ac120002",
        "threadId": "thread-1",
        "bucket": 202606,
        "senderId": "user-1",
        "senderUsername": "maya",
        "senderDisplayName": "Maya",
        "senderAvatarUrl": null,
        "senderAvatarVariants": null,
        "contentType": "text",
        "body": "hello",
        "mediaUrl": null,
        "mediaMetadata": null,
        "linkPreview": null,
        "replyToId": null,
        "replySnapshot": null,
        "reactions": [],
        "isDeleted": false,
        "editedAt": null,
        "createdAt": "2026-06-29T12:00:00.000Z"
      }
      """
    )

    XCTAssertEqual(message.id, "6f5d9b40-361e-11ef-b5d5-0242ac120002")
    XCTAssertEqual(message.contentType, .text)
    XCTAssertEqual(message.body, "hello")
    XCTAssertTrue(message.reactions.isEmpty)
  }

  func testDecodesImageMessageWithMediaMetadata() throws {
    let message = try decodeMessage(
      """
      {
        "id": "7f5d9b40-361e-11ef-b5d5-0242ac120002",
        "threadId": "thread-1",
        "bucket": 202606,
        "senderId": "user-1",
        "senderUsername": "maya",
        "senderDisplayName": "Maya",
        "senderAvatarUrl": "https://cdn.example.com/a.jpg",
        "senderAvatarVariants": {"thumb":"https://cdn.example.com/a-thumb.jpg"},
        "contentType": "image",
        "body": null,
        "mediaUrl": "https://cdn.example.com/image.jpg",
        "mediaMetadata": {"width": 1200, "height": 800, "size": 240000, "mimeType": "image/jpeg", "blurhash": "LEHV6nWB2yk8pyo0adR*.7kCMdnj"},
        "linkPreview": null,
        "replyToId": null,
        "replySnapshot": null,
        "reactions": [],
        "isDeleted": false,
        "editedAt": null,
        "createdAt": "2026-06-29T12:01:00.000Z"
      }
      """
    )

    XCTAssertEqual(message.contentType, .image)
    XCTAssertNil(message.body)
    XCTAssertEqual(message.mediaMetadata?.width, 1200)
    XCTAssertEqual(message.mediaMetadata?.mimeType, "image/jpeg")
    XCTAssertEqual(message.senderAvatarVariants?["thumb"], "https://cdn.example.com/a-thumb.jpg")
  }

  func testDecodesMessageWithReplySnapshot() throws {
    let message = try decodeMessage(
      """
      {
        "id": "8f5d9b40-361e-11ef-b5d5-0242ac120002",
        "threadId": "thread-1",
        "bucket": 202606,
        "senderId": "user-2",
        "senderUsername": "noah",
        "senderDisplayName": "Noah",
        "senderAvatarUrl": null,
        "senderAvatarVariants": null,
        "contentType": "text",
        "body": "reply",
        "mediaUrl": null,
        "mediaMetadata": null,
        "linkPreview": null,
        "replyToId": "7f5d9b40-361e-11ef-b5d5-0242ac120002",
        "replySnapshot": {"senderId":"user-1","senderUsername":"maya","body":"original","contentType":"text"},
        "reactions": [],
        "isDeleted": false,
        "editedAt": null,
        "createdAt": "2026-06-29T12:02:00.000Z"
      }
      """
    )

    XCTAssertEqual(message.replyToId, "7f5d9b40-361e-11ef-b5d5-0242ac120002")
    XCTAssertEqual(message.replySnapshot?.senderUsername, "maya")
    XCTAssertEqual(message.replySnapshot?.body, "original")
  }

  func testDecodesMessageWithMultipleReactions() throws {
    let message = try decodeMessage(
      """
      {
        "id": "9f5d9b40-361e-11ef-b5d5-0242ac120002",
        "threadId": "thread-1",
        "bucket": 202606,
        "senderId": "user-2",
        "senderUsername": "noah",
        "senderDisplayName": "Noah",
        "senderAvatarUrl": null,
        "senderAvatarVariants": null,
        "contentType": "text",
        "body": "react",
        "mediaUrl": null,
        "mediaMetadata": null,
        "linkPreview": null,
        "replyToId": null,
        "replySnapshot": null,
        "reactions": [
          {"emoji":"like","count":2,"userIds":["user-1","user-3"],"viewerReacted":true},
          {"emoji":"fire","count":1,"userIds":["user-4"],"viewerReacted":false}
        ],
        "isDeleted": false,
        "editedAt": null,
        "createdAt": "2026-06-29T12:03:00.000Z"
      }
      """
    )

    XCTAssertEqual(message.reactions.count, 2)
    XCTAssertEqual(message.reactions[0].userIds, ["user-1", "user-3"])
    XCTAssertTrue(message.reactions[0].viewerReacted)
    XCTAssertFalse(message.reactions[1].viewerReacted)
  }

  func testDecodesSoftDeletedMessage() throws {
    let message = try decodeMessage(
      """
      {
        "id": "af5d9b40-361e-11ef-b5d5-0242ac120002",
        "threadId": "thread-1",
        "bucket": 202606,
        "senderId": "user-2",
        "senderUsername": "noah",
        "senderDisplayName": "Noah",
        "senderAvatarUrl": null,
        "senderAvatarVariants": null,
        "contentType": "text",
        "body": null,
        "mediaUrl": null,
        "mediaMetadata": null,
        "linkPreview": null,
        "replyToId": null,
        "replySnapshot": null,
        "reactions": [],
        "isDeleted": true,
        "editedAt": "2026-06-29T12:04:00.000Z",
        "createdAt": "2026-06-29T12:03:30.000Z"
      }
      """
    )

    XCTAssertTrue(message.isDeleted)
    XCTAssertNil(message.body)
    XCTAssertNotNil(message.editedAt)
  }

  func testDecodesInboxPageWithDmAndGroupThread() throws {
    let data = Data(
      """
      {
        "items": [
          {
            "id": "dm-thread",
            "type": "dm",
            "members": [
              {
                "userId": "user-2",
                "username": "noah",
                "displayName": "Noah",
                "avatarUrl": null,
                "avatarVariants": null,
                "role": "member",
                "joinedAt": "2026-06-29T12:00:00.000Z"
              }
            ],
            "lastMessageAt": "2026-06-29T12:05:00.000Z",
            "lastMessagePreview": "hello",
            "lastSenderId": "user-2",
            "unreadCount": 3,
            "isArchived": false,
            "isMuted": false,
            "deletedAt": null
          },
          {
            "id": "group-thread",
            "type": "group",
            "members": [
              {
                "userId": "user-2",
                "username": "noah",
                "displayName": "Noah",
                "avatarUrl": null,
                "avatarVariants": null,
                "role": "admin",
                "joinedAt": "2026-06-29T12:00:00.000Z"
              },
              {
                "userId": "user-3",
                "username": "ava",
                "displayName": "Ava",
                "avatarUrl": "https://cdn.example.com/ava.jpg",
                "avatarVariants": {"sm":"https://cdn.example.com/ava-sm.jpg"},
                "role": "member",
                "joinedAt": "2026-06-29T12:01:00.000Z"
              }
            ],
            "lastMessageAt": null,
            "lastMessagePreview": null,
            "lastSenderId": null,
            "unreadCount": 0,
            "isArchived": true,
            "isMuted": true,
            "deletedAt": null
          }
        ],
        "nextCursor": "cursor-2",
        "hasMore": true
      }
      """.utf8
    )

    let page = try decoder.decode(ChatInboxPage.self, from: data)
    XCTAssertEqual(page.items.count, 2)
    XCTAssertEqual(page.items[0].type, .dm)
    XCTAssertEqual(page.items[0].members.count, 1)
    XCTAssertEqual(page.items[0].unreadCount, 3)
    XCTAssertEqual(page.items[1].type, .group)
    XCTAssertEqual(page.items[1].members[0].role, .admin)
    XCTAssertEqual(page.items[1].members[1].avatarVariants?["sm"], "https://cdn.example.com/ava-sm.jpg")
    XCTAssertEqual(page.nextCursor, "cursor-2")
    XCTAssertTrue(page.hasMore)
  }

  private func decodeMessage(_ json: String) throws -> ChatMessage {
    try decoder.decode(ChatMessage.self, from: Data(json.utf8))
  }

  private static func decodeISO8601Date(from decoder: Decoder) throws -> Date {
    let container = try decoder.singleValueContainer()
    let value = try container.decode(String.self)

    let fractionalFormatter = ISO8601DateFormatter()
    fractionalFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = fractionalFormatter.date(from: value) {
      return date
    }

    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    if let date = formatter.date(from: value) {
      return date
    }

    throw DecodingError.dataCorruptedError(
      in: container,
      debugDescription: "Invalid ISO 8601 date: \(value)"
    )
  }
}

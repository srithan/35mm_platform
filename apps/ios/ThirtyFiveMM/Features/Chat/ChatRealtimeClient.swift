@preconcurrency import Ably
import Foundation

enum ChatRealtimeEvent: Hashable {
  case messageNew(ChatMessage)
  case messageEdited(ChatMessage)
  case messageDeleted(ChatMessage)
  case messageReaction(ChatMessage)
  case messageRead(ChatReadRealtimePayload)
  case typingUpdate(ChatTypingRealtimePayload)
  case threadUpdated(ChatThreadUpdatedRealtimePayload)
  case inboxInvalidated
  case reconnectNeeded
}

struct ChatReadRealtimePayload: Codable, Hashable {
  let threadId: String
  let userId: String?
  let username: String?
  let lastReadMessageId: ChatMessageId
  let readAt: Date
}

struct ChatTypingRealtimePayload: Codable, Hashable {
  let threadId: String
  let userId: String
  let username: String?
  let avatarUrl: String?
  let isTyping: Bool
}

struct ChatThreadUpdatedRealtimePayload: Codable, Hashable {
  let threadId: String
  let lastMessageAt: Date?
  let lastMessagePreview: String?
  let senderId: String?
  let unreadCount: Int?
}

@MainActor
protocol ChatRealtimeClientProtocol {
  var isConfigured: Bool { get }
  func connect()
  func disconnect()
  func subscribeToInbox(userId: String, handler: @escaping (ChatRealtimeEvent) -> Void)
  func unsubscribeFromInbox()
  func subscribeToThread(threadId: String, handler: @escaping (ChatRealtimeEvent) -> Void)
  func unsubscribeFromThread()
  func subscribeToVisibleThreads(threadIds: [String], handler: @escaping (ChatRealtimeEvent) -> Void)
  func unsubscribeFromVisibleThreads()
}

@MainActor
final class NoopChatRealtimeClient: ChatRealtimeClientProtocol {
  let isConfigured = false

  func connect() {}
  func disconnect() {}
  func subscribeToInbox(userId: String, handler: @escaping (ChatRealtimeEvent) -> Void) {}
  func unsubscribeFromInbox() {}
  func subscribeToThread(threadId: String, handler: @escaping (ChatRealtimeEvent) -> Void) {}
  func unsubscribeFromThread() {}
  func subscribeToVisibleThreads(threadIds: [String], handler: @escaping (ChatRealtimeEvent) -> Void) {}
  func unsubscribeFromVisibleThreads() {}
}

@MainActor
final class AblyChatRealtimeClient: ChatRealtimeClientProtocol {
  private let apiKey: String
  private let currentUserId: String
  private var realtime: ARTRealtime?
  private var inboxChannel: ARTRealtimeChannel?
  private var threadChannel: ARTRealtimeChannel?
  private var visibleThreadChannels: [String: ARTRealtimeChannel] = [:]
  private var reconnectHandler: ((ChatRealtimeEvent) -> Void)?
  private var hasConnectedOnce = false
  private let decoder = ChatRealtimeClientDecoder()

  var isConfigured: Bool {
    !apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }

  init(apiKey: String, currentUserId: String) {
    self.apiKey = apiKey
    self.currentUserId = currentUserId
  }

  func connect() {
    guard isConfigured, realtime == nil else { return }

    let options = ARTClientOptions(key: apiKey)
    options.clientId = currentUserId
    options.echoMessages = false
    let client = ARTRealtime(options: options)
    client.connection.on { [weak self] stateChange in
      Task { @MainActor in
        guard let self else { return }
        self.handleConnectionState(stateChange.current)
      }
    }
    realtime = client
  }

  func disconnect() {
    unsubscribeFromThread()
    unsubscribeFromVisibleThreads()
    unsubscribeFromInbox()
    realtime?.close()
    realtime = nil
  }

  func subscribeToInbox(userId: String, handler: @escaping (ChatRealtimeEvent) -> Void) {
    guard isConfigured else { return }
    connect()
    guard let realtime else { return }

    reconnectHandler = handler
    unsubscribeFromInbox()
    let channel = realtime.channels.get("user:\(userId):inbox")
    inboxChannel = channel
    channel.subscribe("thread.updated") { [weak self] message in
      Task { @MainActor in
        guard let event = self?.decoder.decodeThreadUpdated(from: message.data) else {
          handler(.inboxInvalidated)
          return
        }
        handler(.threadUpdated(event))
      }
    }
    channel.attach()
  }

  func unsubscribeFromInbox() {
    inboxChannel?.unsubscribe()
    inboxChannel?.detach()
    inboxChannel = nil
  }

  func subscribeToThread(threadId: String, handler: @escaping (ChatRealtimeEvent) -> Void) {
    guard isConfigured else { return }
    connect()
    guard let realtime else { return }

    reconnectHandler = handler
    unsubscribeFromThread()
    let channel = realtime.channels.get("thread:\(threadId)")
    threadChannel = channel

    channel.subscribe("message.new") { [weak self] message in
      Task { @MainActor in
        guard let value = self?.decoder.decodeMessage(from: message.data) else {
          handler(.reconnectNeeded)
          return
        }
        handler(.messageNew(value))
      }
    }
    channel.subscribe("message.edited") { [weak self] message in
      Task { @MainActor in
        guard let value = self?.decoder.decodeMessage(from: message.data) else {
          handler(.reconnectNeeded)
          return
        }
        handler(.messageEdited(value))
      }
    }
    channel.subscribe("message.deleted") { [weak self] message in
      Task { @MainActor in
        guard let value = self?.decoder.decodeMessage(from: message.data) else {
          handler(.reconnectNeeded)
          return
        }
        handler(.messageDeleted(value))
      }
    }
    channel.subscribe("message.reaction") { [weak self] message in
      Task { @MainActor in
        guard let value = self?.decoder.decodeMessage(from: message.data) else {
          handler(.reconnectNeeded)
          return
        }
        handler(.messageReaction(value))
      }
    }
    channel.subscribe("message.read") { [weak self] message in
      Task { @MainActor in
        guard let value = self?.decoder.decodeRead(from: message.data, threadId: threadId) else {
          handler(.reconnectNeeded)
          return
        }
        handler(.messageRead(value))
      }
    }
    channel.subscribe("typing.update") { [weak self] message in
      Task { @MainActor in
        guard let value = self?.decoder.decodeTyping(from: message.data, threadId: threadId) else {
          handler(.reconnectNeeded)
          return
        }
        handler(.typingUpdate(value))
      }
    }
    channel.attach()
  }

  func unsubscribeFromThread() {
    threadChannel?.unsubscribe()
    threadChannel?.detach()
    threadChannel = nil
  }

  func subscribeToVisibleThreads(threadIds: [String], handler: @escaping (ChatRealtimeEvent) -> Void) {
    guard isConfigured else { return }
    connect()
    guard let realtime else { return }

    reconnectHandler = handler
    let targetIds = Set(threadIds)

    for (threadId, channel) in visibleThreadChannels where !targetIds.contains(threadId) {
      channel.unsubscribe()
      channel.detach()
      visibleThreadChannels.removeValue(forKey: threadId)
    }

    for threadId in targetIds where visibleThreadChannels[threadId] == nil {
      let channel = realtime.channels.get("thread:\(threadId)")
      visibleThreadChannels[threadId] = channel
      channel.subscribe("typing.update") { [weak self] message in
        Task { @MainActor in
          guard let value = self?.decoder.decodeTyping(from: message.data, threadId: threadId) else {
            handler(.reconnectNeeded)
            return
          }
          handler(.typingUpdate(value))
        }
      }
      channel.attach()
    }
  }

  func unsubscribeFromVisibleThreads() {
    for (_, channel) in visibleThreadChannels {
      channel.unsubscribe()
      channel.detach()
    }
    visibleThreadChannels.removeAll()
  }

  private func handleConnectionState(_ state: ARTRealtimeConnectionState) {
    if state == .connected {
      if hasConnectedOnce {
        reconnectHandler?(.reconnectNeeded)
      } else {
        hasConnectedOnce = true
      }
      return
    }

    if state == .suspended || state == .failed {
      reconnectHandler?(.reconnectNeeded)
    }
  }
}

private final class ChatRealtimeClientDecoder {
  private let decoder: JSONDecoder

  init() {
    decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    decoder.dateDecodingStrategy = .custom(Self.decodeISO8601Date)
  }

  func decodeMessage(from value: Any?) -> ChatMessage? {
    decode(ChatMessage.self, from: value)
  }

  func decodeThreadUpdated(from value: Any?) -> ChatThreadUpdatedRealtimePayload? {
    decode(ChatThreadUpdatedRealtimePayload.self, from: value)
  }

  func decodeRead(from value: Any?, threadId: String) -> ChatReadRealtimePayload? {
    guard var object = normalizedObject(from: value) else { return nil }
    object["threadId"] = object["threadId"] ?? threadId
    return decode(ChatReadRealtimePayload.self, from: object)
  }

  func decodeTyping(from value: Any?, threadId: String) -> ChatTypingRealtimePayload? {
    guard var object = normalizedObject(from: value) else { return nil }
    object["threadId"] = object["threadId"] ?? threadId
    return decode(ChatTypingRealtimePayload.self, from: object)
  }

  private func decode<T: Decodable>(_ type: T.Type, from value: Any?) -> T? {
    guard let data = data(from: value) else { return nil }
    return try? decoder.decode(type, from: data)
  }

  private func normalizedObject(from value: Any?) -> [String: Any]? {
    if let object = value as? [String: Any] {
      return object
    }
    guard
      let data = data(from: value),
      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
      return nil
    }
    return object
  }

  private func data(from value: Any?) -> Data? {
    if let data = value as? Data {
      return data
    }
    if let string = value as? String {
      return string.data(using: .utf8)
    }
    guard let value, JSONSerialization.isValidJSONObject(value) else {
      return nil
    }
    return try? JSONSerialization.data(withJSONObject: value)
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

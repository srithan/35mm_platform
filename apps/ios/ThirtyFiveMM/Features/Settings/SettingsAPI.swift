import Foundation

extension APIEndpoint {
  static func getSettings() -> APIEndpoint {
    APIEndpoint(path: "/v1/me/settings", method: .get)
  }

  static func updateSettingsProfile(_ input: ProfileSettings) -> APIEndpoint {
    APIEndpoint(path: "/v1/me/settings/profile", method: .patch, body: input)
  }

  static func updateSettingsPrivacy(_ input: PrivacySettings) -> APIEndpoint {
    APIEndpoint(path: "/v1/me/settings/privacy", method: .patch, body: input)
  }

  static func updateSettingsNotifications(_ input: NotificationSettings) -> APIEndpoint {
    APIEndpoint(path: "/v1/me/settings/notifications", method: .patch, body: input)
  }

  static func updateSettingsAppearance(_ input: AppearanceSettings) -> APIEndpoint {
    APIEndpoint(path: "/v1/me/settings/appearance", method: .patch, body: input)
  }

  static func updateSettingsMedia(_ input: MediaSettings) -> APIEndpoint {
    APIEndpoint(path: "/v1/me/settings/media", method: .patch, body: input)
  }

  static func getModeratedUsers(kind: SettingsModerationKind, cursor: String?, limit: Int) -> APIEndpoint {
    var queryItems = [URLQueryItem(name: "limit", value: String(limit))]
    if let cursor {
      queryItems.append(URLQueryItem(name: "cursor", value: cursor))
    }

    return APIEndpoint(path: kind.listPath, method: .get, queryItems: queryItems)
  }

  static func removeModeration(kind: SettingsModerationKind, userId: String) -> APIEndpoint {
    APIEndpoint(path: "/v1/users/\(settingsEncodedPathSegment(userId))/\(kind.actionPath)", method: .delete)
  }
}

extension APIClient {
  func getSettings() async throws -> UserSettings {
    try await request(.getSettings())
  }

  func updateSettingsProfile(_ input: ProfileSettings) async throws -> UserSettings {
    try await request(.updateSettingsProfile(input))
  }

  func updateSettingsPrivacy(_ input: PrivacySettings) async throws -> UserSettings {
    try await request(.updateSettingsPrivacy(input))
  }

  func updateSettingsNotifications(_ input: NotificationSettings) async throws -> UserSettings {
    try await request(.updateSettingsNotifications(input))
  }

  func updateSettingsAppearance(_ input: AppearanceSettings) async throws -> UserSettings {
    try await request(.updateSettingsAppearance(input))
  }

  func updateSettingsMedia(_ input: MediaSettings) async throws -> UserSettings {
    try await request(.updateSettingsMedia(input))
  }

  func checkSettingsUsernameAvailability(_ username: String) async throws -> UsernameAvailabilityResponse {
    try await request(.checkUsernameAvailability(username))
  }

  func getModeratedUsers(kind: SettingsModerationKind, cursor: String?, limit: Int) async throws -> ModeratedUsersPage {
    try await request(.getModeratedUsers(kind: kind, cursor: cursor, limit: limit))
  }

  func removeModeration(kind: SettingsModerationKind, userId: String) async throws {
    try await requestVoid(.removeModeration(kind: kind, userId: userId))
  }
}

private func settingsEncodedPathSegment(_ value: String) -> String {
  value.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? value
}

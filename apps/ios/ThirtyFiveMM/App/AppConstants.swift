import Foundation

enum AppConstants {
  static let appName = "35mm"
  static let bundleIdentifier = "com.35mm.app"
  static let apiBaseURL = bundleString(for: "APIBaseURL") ?? "https://api.35mm.app"
  static let webBaseURL = bundleString(for: "WebBaseURL") ?? "https://35mm.in"
  static let ablyAPIKey = bundleString(for: "AblyAPIKey") ?? ""
  static let clerkPublishableKey = bundleString(for: "ClerkPublishableKey") ?? ""
  static let postMediaCarouselEnabled = bundleBoolean(
    for: "PostMediaCarouselEnabled",
    environmentKey: "POST_MEDIA_CAROUSEL_ENABLED",
    defaultsKey: "postMediaCarouselEnabled"
  )
  static let traditionalTabBarEnabled = bundleBoolean(
    for: "TraditionalTabBarEnabled",
    environmentKey: "TRADITIONAL_TAB_BAR_ENABLED",
    defaultsKey: "traditionalTabBarEnabled"
  )

  static var apiBaseURLValue: URL {
    guard let url = URL(string: apiBaseURL) else {
      preconditionFailure("Invalid API base URL: \(apiBaseURL)")
    }

    return url
  }

  static var webBaseURLValue: URL {
    guard let url = URL(string: webBaseURL) else {
      preconditionFailure("Invalid web base URL: \(webBaseURL)")
    }
    return url
  }

  private static func bundleString(for key: String) -> String? {
    guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String else {
      return nil
    }

    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty, !trimmed.contains("$(") else {
      return nil
    }

    return trimmed
  }

  private static func bundleBoolean(
    for key: String,
    environmentKey: String,
    defaultsKey: String
  ) -> Bool {
    if let value = ProcessInfo.processInfo.environment[environmentKey] {
      return isTruthy(value)
    }

    let defaults = UserDefaults.standard
    if defaults.object(forKey: defaultsKey) != nil {
      return defaults.bool(forKey: defaultsKey)
    }

    guard let value = Bundle.main.object(forInfoDictionaryKey: key) else {
      return false
    }

    if let bool = value as? Bool {
      return bool
    }
    if let string = value as? String {
      return isTruthy(string)
    }

    return false
  }

  private static func isTruthy(_ value: String) -> Bool {
    let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    guard !normalized.isEmpty, !normalized.contains("$(") else {
      return false
    }
    return !["0", "false", "no", "off"].contains(normalized)
  }
}

import Foundation

enum AppConstants {
  static let appName = "35mm"
  static let bundleIdentifier = "com.35mm.app"
  static let apiBaseURL = bundleString(for: "APIBaseURL") ?? "https://api.35mm.app"
  static let ablyAPIKey = bundleString(for: "AblyAPIKey") ?? ""
  static let clerkPublishableKey = bundleString(for: "ClerkPublishableKey") ?? ""

  static var apiBaseURLValue: URL {
    guard let url = URL(string: apiBaseURL) else {
      preconditionFailure("Invalid API base URL: \(apiBaseURL)")
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
}

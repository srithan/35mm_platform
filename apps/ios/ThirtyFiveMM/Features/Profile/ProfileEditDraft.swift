import Foundation

struct ProfileEditDraft: Equatable {
  static let displayNameLimit = 50
  static let roleContextLimit = 25
  static let bioLimit = 160
  static let locationLimit = 100
  static let websiteLimit = 200

  var displayName: String
  var dateOfBirth: Date?
  var role: ProfileRole
  var roleContext: String
  var bio: String
  var location: String
  var website: String

  init(profile: PublicProfile) {
    displayName = profile.displayName
    dateOfBirth = Self.parseDateOnly(profile.dateOfBirth)
    role = .normalized(profile.role)
    roleContext = profile.roleContext ?? ""
    bio = profile.bio ?? ""
    location = profile.location ?? ""
    website = profile.website ?? ""
  }

  var errors: [ProfileEditField: String] {
    var result: [ProfileEditField: String] = [:]
    let trimmedName = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
    let trimmedContext = roleContext.trimmingCharacters(in: .whitespacesAndNewlines)
    let trimmedWebsite = website.trimmingCharacters(in: .whitespacesAndNewlines)

    if trimmedName.isEmpty {
      result[.displayName] = "Display name is required."
    } else if trimmedName.count > Self.displayNameLimit {
      result[.displayName] = "Use \(Self.displayNameLimit) characters or fewer."
    }
    if role != .cinephile && trimmedContext.count > Self.roleContextLimit {
      result[.roleContext] = "Use \(Self.roleContextLimit) characters or fewer."
    }
    if bio.count > Self.bioLimit {
      result[.bio] = "Use \(Self.bioLimit) characters or fewer."
    }
    if location.count > Self.locationLimit {
      result[.location] = "Use \(Self.locationLimit) characters or fewer."
    }
    if website.count > Self.websiteLimit {
      result[.website] = "Use \(Self.websiteLimit) characters or fewer."
    } else if !trimmedWebsite.isEmpty && Self.normalizedWebsite(trimmedWebsite) == nil {
      result[.website] = "Enter a valid website, like example.com."
    }
    if let dateOfBirth, dateOfBirth > Date.now {
      result[.dateOfBirth] = "Date of birth cannot be in the future."
    }

    return result
  }

  var isValid: Bool { errors.isEmpty }

  var bylinePreview: String {
    let context = roleContext.trimmingCharacters(in: .whitespacesAndNewlines)
    if role == .cinephile || context.isEmpty {
      return role.rawValue
    }
    return "\(role.rawValue) · \(context)"
  }

  func updateRequest() -> ProfileMutation.UpdateRequest {
    let context = roleContext.trimmingCharacters(in: .whitespacesAndNewlines)
    let websiteValue = Self.normalizedWebsite(website)
    let dateValue = dateOfBirth?.formatted(.iso8601.year().month().day())
    let shouldClearContext = role == .cinephile || context.isEmpty

    return ProfileMutation.UpdateRequest(
      displayName: displayName.trimmingCharacters(in: .whitespacesAndNewlines),
      bio: bio,
      location: location.trimmingCharacters(in: .whitespacesAndNewlines),
      website: websiteValue,
      shouldClearWebsite: websiteValue == nil,
      dateOfBirth: dateValue,
      shouldClearDateOfBirth: dateValue == nil,
      role: role.rawValue,
      roleContext: shouldClearContext ? nil : context,
      shouldClearRoleContext: shouldClearContext,
      headline: role.rawValue,
      headlineContext: shouldClearContext ? nil : context,
      shouldClearHeadlineContext: shouldClearContext
    )
  }

  static func normalizedWebsite(_ rawValue: String) -> String? {
    let trimmed = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return nil }

    let candidate = trimmed.contains("://") ? trimmed : "https://\(trimmed)"
    guard let components = URLComponents(string: candidate),
      let scheme = components.scheme?.lowercased(),
      scheme == "http" || scheme == "https",
      let host = components.host,
      !host.isEmpty
    else {
      return nil
    }
    return components.url?.absoluteString
  }

  private static func parseDateOnly(_ rawValue: String?) -> Date? {
    guard let rawValue else { return nil }
    let parts = rawValue.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else { return nil }

    var components = DateComponents()
    components.calendar = Calendar(identifier: .gregorian)
    components.timeZone = TimeZone(secondsFromGMT: 0)
    components.year = parts[0]
    components.month = parts[1]
    components.day = parts[2]
    return components.date
  }
}

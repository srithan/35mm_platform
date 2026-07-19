import SwiftUI

struct ProfileMetadataView: View {
  let profile: PublicProfile

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      if let location = nonempty(profile.location) {
        Label(location, systemImage: "mappin.and.ellipse")
      } else if profile.isOwnProfile {
        Label("Add your location", systemImage: "mappin.and.ellipse")
          .foregroundStyle(.tertiary)
      }

      if let website = validWebsite {
        Link(destination: website) {
          Label(website.host() ?? website.absoluteString, systemImage: "link")
        }
        .foregroundStyle(ProfileDesign.accent)
        .accessibilityHint("Opens in your browser")
      } else if profile.isOwnProfile {
        Label("Add your links", systemImage: "link")
          .foregroundStyle(.tertiary)
      }

      if let dateOfBirth = formattedDateOfBirth {
        Label("Born \(dateOfBirth)", systemImage: "calendar")
      } else if profile.isOwnProfile {
        Label("Add your date of birth", systemImage: "calendar")
          .foregroundStyle(.tertiary)
      }

      if let createdAt = profile.createdAt {
        Label {
          Text("Joined \(createdAt, format: .dateTime.month(.wide).year())")
        } icon: {
          Image(systemName: "calendar.badge.clock")
        }
      }
    }
    .font(.footnote)
    .foregroundStyle(.secondary)
  }

  private var validWebsite: URL? {
    guard let raw = nonempty(profile.website) else { return nil }
    return URL(string: raw.contains("://") ? raw : "https://\(raw)")
  }

  private var formattedDateOfBirth: String? {
    guard let raw = profile.dateOfBirth else { return nil }
    let parts = raw.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else { return nil }
    var components = DateComponents()
    components.calendar = Calendar(identifier: .gregorian)
    components.year = parts[0]
    components.month = parts[1]
    components.day = parts[2]
    return components.date?.formatted(.dateTime.month(.abbreviated).day().year())
  }

  private func nonempty(_ value: String?) -> String? {
    let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    return trimmed.isEmpty ? nil : trimmed
  }
}

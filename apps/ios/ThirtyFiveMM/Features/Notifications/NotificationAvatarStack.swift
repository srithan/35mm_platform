import SwiftUI

struct NotificationAvatarStack: View {
  let item: NotificationItem

  private var profiles: [NotificationActorProfile] {
    var seen = Set<String>()
    return Array((item.actorProfiles ?? []).filter { seen.insert($0.userId).inserted }.prefix(2))
  }

  var body: some View {
    Group {
      if profiles.count > 1 {
        HStack(spacing: -14) {
          ForEach(profiles) { profile in
            NotificationAvatar(
              id: profile.userId,
              label: profile.displayName?.isEmpty == false ? profile.displayName ?? profile.username : profile.username,
              url: profile.avatarUrl ?? profile.avatarUrlLg,
              size: 36
            )
          }
        }
      } else if let profile = profiles.first {
        NotificationAvatar(
          id: profile.userId,
          label: profile.displayName?.isEmpty == false ? profile.displayName ?? profile.username : profile.username,
          url: profile.avatarUrl ?? profile.avatarUrlLg,
          size: 48
        )
      } else if let actor = item.actor {
        NotificationAvatar(
          id: actor.id,
          label: actor.displayName.isEmpty ? actor.username : actor.displayName,
          url: actor.avatarUrl ?? actor.avatarUrlLg,
          size: 48
        )
      } else {
        NotificationAvatar(id: item.id, label: "35mm", url: nil, size: 48)
      }
    }
    .frame(width: 54, height: 48, alignment: .leading)
  }
}

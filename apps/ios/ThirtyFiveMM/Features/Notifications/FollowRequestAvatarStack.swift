import SwiftUI

struct FollowRequestAvatarStack: View {
  @Environment(\.theme) private var theme
  let requests: [FollowRequest]

  var body: some View {
    ZStack(alignment: .leading) {
      if requests.isEmpty {
        Circle()
          .fill(theme.fillStrong)
          .frame(width: 48, height: 48)
          .overlay {
            Image(systemName: "person.2.fill")
              .font(.body.weight(.semibold))
              .foregroundStyle(theme.textSecondary)
          }
      } else {
        ForEach(Array(requests.prefix(2).enumerated()), id: \.element.id) { index, request in
          NotificationAvatar(
            id: request.id,
            label: request.resolvedDisplayName,
            url: request.avatarUrl ?? request.avatarUrlLg,
            size: 44
          )
          .offset(x: Double(index) * 20)
          .zIndex(Double(index))
        }
      }
    }
    .frame(width: 66, height: 48, alignment: .leading)
  }
}

import SwiftUI

struct ProfileHeaderView: View {
  @Environment(\.theme) private var theme
  let profile: PublicProfile
  let isFollowMutationPending: Bool
  let onOpenAvatar: (() -> Void)?
  let onEdit: () -> Void
  let onFollow: () -> Void
  let onShare: () -> Void
  let onMore: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(alignment: .top, spacing: 12) {
        ProfileHeaderAvatarView(profile: profile, onOpen: onOpenAvatar)

        Spacer(minLength: 4)

        HStack(spacing: 10) {
          ProfileHeaderCircularButton(
            title: "Share profile",
            systemImage: "square.and.arrow.up",
            action: onShare
          )
          .accessibilityIdentifier("profile.share")

          ProfileHeaderCircularButton(
            title: "More profile actions",
            systemImage: "ellipsis",
            action: onMore
          )
          .accessibilityIdentifier("profile.actions")
        }
      }

      VStack(alignment: .leading, spacing: 3) {
        Text(profile.displayName)
          .font(.title3.weight(.bold))
          .foregroundStyle(theme.text)
          .accessibilityAddTraits(.isHeader)

        Label {
          Text("@\(profile.username)")
        } icon: {
          if profile.isPrivate {
            Image(systemName: "lock.fill")
          }
        }
        .labelStyle(ProfileHandleLabelStyle(isPrivate: profile.isPrivate))
        .font(.subheadline)
        .foregroundStyle(theme.textSecondary)
      }

      Text(profile.displayByline)
        .font(.footnote)
        .bold()
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(theme.accent.opacity(0.09), in: .capsule)
        .foregroundStyle(theme.accent)

      if let bio = profile.bio?.trimmingCharacters(in: .whitespacesAndNewlines), !bio.isEmpty {
        Text(bio)
          .font(.subheadline)
          .foregroundStyle(theme.text)
          .lineSpacing(2)
          .fixedSize(horizontal: false, vertical: true)
      } else if profile.isOwnProfile {
        Text("Add profile bio")
          .font(.subheadline)
          .foregroundStyle(theme.textTertiary)
      }

      ProfileMetadataView(profile: profile)

      ProfileCountsView(profile: profile)
        .padding(.top, 4)

      primaryActionButton
    }
    .padding(.horizontal, ProfileDesign.horizontalPadding)
    .padding(.bottom, 16)
  }

  private var followButtonTitle: String {
    switch profile.followState {
    case .none: profile.isPrivate ? "Request" : "Follow"
    case .requested: "Requested"
    case .following: "Following"
    case .selfProfile: "Edit profile"
    }
  }

  @ViewBuilder
  private var primaryActionButton: some View {
    if profile.isOwnProfile {
      Button("Edit profile", action: onEdit)
        .font(.subheadline.bold())
        .buttonStyle(ProfileHeaderPillButtonStyle(isProminent: false))
        .accessibilityIdentifier("profile.edit")
    } else {
      Button(action: onFollow) {
        if isFollowMutationPending {
          ProgressView()
            .controlSize(.small)
            .tint(profile.followState == .none ? theme.accentForeground : theme.text)
        } else {
          Text(followButtonTitle)
            .font(.subheadline.bold())
        }
      }
      .buttonStyle(ProfileHeaderPillButtonStyle(isProminent: profile.followState == .none))
      .disabled(isFollowMutationPending)
      .accessibilityIdentifier("profile.follow")
    }
  }
}

private struct ProfileHeaderCircularButton: View {
  @Environment(\.theme) private var theme
  let title: String
  let systemImage: String
  let action: () -> Void

  var body: some View {
    Button(title, systemImage: systemImage, action: action)
      .labelStyle(.iconOnly)
      .font(.body.weight(.semibold))
      .foregroundStyle(theme.text)
      .frame(width: 44, height: 44)
      .background(theme.bgElevated, in: .circle)
      .overlay {
        Circle().stroke(theme.borderStrong, lineWidth: 1)
      }
      .contentShape(Circle())
      .buttonStyle(.plain)
      .accessibilityLabel(title)
  }
}

private struct ProfileHeaderPillButtonStyle: ButtonStyle {
  @Environment(\.theme) private var theme
  @Environment(\.isEnabled) private var isEnabled

  let isProminent: Bool

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .frame(maxWidth: .infinity, minHeight: 44)
      .foregroundStyle(isProminent ? theme.accentForeground : theme.text)
      .background(
        isProminent ? theme.accent : theme.bg,
        in: .capsule
      )
      .overlay {
        Capsule()
          .stroke(
            isProminent ? Color.clear : theme.borderStrong,
            lineWidth: 1
          )
      }
      .contentShape(Capsule())
      .opacity(isEnabled ? (configuration.isPressed ? 0.72 : 1) : 0.55)
  }
}

private struct ProfileHandleLabelStyle: LabelStyle {
  let isPrivate: Bool

  func makeBody(configuration: Configuration) -> some View {
    HStack(spacing: 5) {
      configuration.title
      if isPrivate {
        configuration.icon
      }
    }
  }
}

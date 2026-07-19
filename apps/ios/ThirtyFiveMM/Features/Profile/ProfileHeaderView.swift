import SwiftUI

struct ProfileHeaderView: View {
  let profile: PublicProfile
  let isFollowMutationPending: Bool
  let onEdit: () -> Void
  let onFollow: () -> Void
  let onShare: () -> Void
  let onMore: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(alignment: .top, spacing: 12) {
        ProfileAvatarView(
          url: profile.avatarUrlLg ?? profile.avatarUrl,
          displayName: profile.displayName,
          size: ProfileDesign.avatarSize
        )
        .offset(y: -ProfileDesign.avatarOverlap)
        .padding(.bottom, -ProfileDesign.avatarOverlap)

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
          .font(.title2.weight(.semibold))
          .accessibilityAddTraits(.isHeader)

        Label {
          Text("@\(profile.username)")
        } icon: {
          if profile.isPrivate {
            Image(systemName: "lock.fill")
          }
        }
        .labelStyle(ProfileHandleLabelStyle(isPrivate: profile.isPrivate))
        .font(.footnote)
        .foregroundStyle(.secondary)
      }

      Text(profile.displayByline)
        .font(.footnote)
        .bold()
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(ProfileDesign.accent.opacity(0.09), in: .capsule)
        .foregroundStyle(ProfileDesign.accent)

      if let bio = profile.bio?.trimmingCharacters(in: .whitespacesAndNewlines), !bio.isEmpty {
        Text(bio)
          .font(.subheadline)
          .lineSpacing(2)
          .fixedSize(horizontal: false, vertical: true)
      } else if profile.isOwnProfile {
        Text("Add profile bio")
          .font(.subheadline)
          .foregroundStyle(.tertiary)
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
            .tint(profile.followState == .none ? Color.white : Color.primary)
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
  let title: String
  let systemImage: String
  let action: () -> Void

  var body: some View {
    Button(title, systemImage: systemImage, action: action)
      .labelStyle(.iconOnly)
      .font(.body.weight(.semibold))
      .frame(width: 44, height: 44)
      .background(Color(.systemBackground), in: .circle)
      .overlay {
        Circle().stroke(Color(.separator).opacity(0.35), lineWidth: 1)
      }
      .contentShape(Circle())
      .buttonStyle(.plain)
      .accessibilityLabel(title)
  }
}

private struct ProfileHeaderPillButtonStyle: ButtonStyle {
  @Environment(\.isEnabled) private var isEnabled

  let isProminent: Bool

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .frame(maxWidth: .infinity, minHeight: 44)
      .foregroundStyle(isProminent ? Color.white : Color.primary)
      .background(
        isProminent ? ProfileDesign.accent : Color(.systemBackground),
        in: .capsule
      )
      .overlay {
        Capsule()
          .stroke(
            isProminent ? Color.clear : Color(.separator).opacity(0.35),
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

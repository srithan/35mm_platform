import SwiftUI

struct EditProfileMediaHeader: View {
  @Environment(\.theme) private var theme
  let profile: PublicProfile
  let uploadingKind: ProfileMutation.MediaKind?
  let uploadProgress: Double
  let onAvatarActions: () -> Void
  let onCoverActions: () -> Void

  var body: some View {
    VStack(spacing: 0) {
      Button(action: onCoverActions) {
        ProfileCoverView(url: profile.coverUrl)
          .overlay(alignment: .bottomTrailing) {
            mediaBadge(title: "Edit cover", systemImage: "camera.fill", isLoading: uploadingKind == .cover)
              .padding(12)
          }
          .contentShape(.rect)
      }
      .buttonStyle(.plain)
      .disabled(uploadingKind != nil)
      .accessibilityLabel("Edit cover photo")

      HStack(alignment: .center, spacing: 14) {
        Button(action: onAvatarActions) {
          ProfileAvatarView(
            url: profile.avatarUrlLg ?? profile.avatarUrl,
            displayName: profile.displayName,
            size: 78
          )
          .overlay(alignment: .bottomTrailing) {
            Image(systemName: "camera.fill")
              .font(.caption)
              .foregroundStyle(.white)
              .frame(width: 28, height: 28)
              .background(.black.opacity(0.72), in: .circle)
          }
        }
        .buttonStyle(.plain)
        .disabled(uploadingKind != nil)
        .accessibilityLabel("Edit profile photo")

        VStack(alignment: .leading, spacing: 4) {
          Text(profile.displayName)
            .font(.headline)
            .lineLimit(1)
          Text("@\(profile.username)")
            .font(.subheadline)
            .foregroundStyle(theme.textSecondary)
          Text(uploadingKind == nil ? "Tap a photo to update" : "Uploading…")
            .font(.caption)
            .foregroundStyle(theme.textSecondary)
        }

        Spacer()
      }
      .padding(ProfileDesign.horizontalPadding)

      if uploadingKind != nil {
        ProgressView(value: uploadProgress)
          .tint(ProfileDesign.accent)
          .padding(.horizontal, ProfileDesign.horizontalPadding)
          .padding(.bottom, 10)
      }
    }
    .background(Color(.secondarySystemGroupedBackground))
  }

  private func mediaBadge(title: String, systemImage: String, isLoading: Bool) -> some View {
    Label(isLoading ? "Uploading" : title, systemImage: isLoading ? "arrow.up.circle.fill" : systemImage)
      .font(.caption)
      .bold()
      .foregroundStyle(.white)
      .padding(.horizontal, 10)
      .frame(minHeight: 32)
      .background(.black.opacity(0.72), in: .capsule)
  }
}

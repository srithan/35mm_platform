import SwiftUI
import UIKit

struct SettingsView: View {
  @Environment(\.dismiss) private var dismiss
  @StateObject private var viewModel: SettingsViewModel

  private let authManager: AuthManager
  private let profile: UserProfile?

  init(apiClient: APIClient, authManager: AuthManager, profile: UserProfile?) {
    _viewModel = StateObject(wrappedValue: SettingsViewModel(apiClient: apiClient))
    self.authManager = authManager
    self.profile = profile
  }

  var body: some View {
    ZStack(alignment: .bottom) {
      content

      if let toast = viewModel.toast {
        SettingsToast(message: toast)
          .padding(.bottom, 18)
          .transition(.move(edge: .bottom).combined(with: .opacity))
      }
    }
    .background(Color(.systemGroupedBackground))
    .navigationTitle("Settings")
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        Button("Done") {
          dismiss()
        }
        .font(.system(size: 15, weight: .semibold))
      }
    }
    .task {
      await viewModel.loadIfNeeded()
    }
    .onChange(of: viewModel.toast) { _, newValue in
      guard newValue != nil else { return }
      Task {
        try? await Task.sleep(nanoseconds: 2_200_000_000)
        await MainActor.run {
          withAnimation(.spring(response: 0.24, dampingFraction: 0.9)) {
            viewModel.clearToast()
          }
        }
      }
    }
  }

  @ViewBuilder
  private var content: some View {
    if viewModel.isLoading && viewModel.settings == nil {
      SettingsLoadingView()
    } else if let loadError = viewModel.loadError, viewModel.settings == nil {
      SettingsErrorView(message: loadError) {
        Task {
          await viewModel.reload()
        }
      }
    } else if let settings = viewModel.settings {
      ScrollView {
        LazyVStack(spacing: 18) {
          SettingsProfileHeader(profile: profile, settings: settings.profile)

          SettingsSectionCard(title: "Settings") {
            ForEach(SettingsSectionID.allCases) { section in
              NavigationLink {
                SettingsSectionDestination(
                  section: section,
                  viewModel: viewModel,
                  authManager: authManager
                )
              } label: {
                SettingsNavigationRow(
                  systemImage: section.systemImage,
                  title: section.title,
                  subtitle: section.subtitle
                )
              }
              .buttonStyle(.plain)

              if section.id != SettingsSectionID.allCases.last?.id {
                SettingsDivider()
              }
            }
          }

          SettingsFooter(authManager: authManager)
        }
        .padding(.horizontal, 16)
        .padding(.top, 16)
        .padding(.bottom, 36)
      }
      .refreshable {
        await viewModel.reload()
      }
    }
  }
}

private struct SettingsSectionDestination: View {
  let section: SettingsSectionID
  @ObservedObject var viewModel: SettingsViewModel
  let authManager: AuthManager

  var body: some View {
    Group {
      switch section {
      case .account:
        if let settings = viewModel.settings {
          SettingsAccountView(viewModel: viewModel, initialProfile: settings.profile)
        }
      case .privacy:
        if let settings = viewModel.settings {
          SettingsPrivacyView(viewModel: viewModel, initialPrivacy: settings.privacy)
        }
      case .notifications:
        if let settings = viewModel.settings {
          SettingsNotificationsView(viewModel: viewModel, initialNotifications: settings.notifications)
        }
      case .appearance:
        if let settings = viewModel.settings {
          SettingsAppearanceView(viewModel: viewModel, initialAppearance: settings.appearance)
        }
      case .media:
        if let settings = viewModel.settings {
          SettingsMediaView(viewModel: viewModel, initialMedia: settings.media)
        }
      case .dataSecurity:
        SettingsDataSecurityView(viewModel: viewModel, authManager: authManager)
      }
    }
    .background(Color(.systemGroupedBackground))
    .navigationTitle(section.title)
    .navigationBarTitleDisplayMode(.inline)
  }
}

private struct SettingsProfileHeader: View {
  let profile: UserProfile?
  let settings: ProfileSettings

  private var displayName: String {
    let value = settings.displayName.trimmingCharacters(in: .whitespacesAndNewlines)
    return value.isEmpty ? "@\(settings.username)" : value
  }

  var body: some View {
    HStack(spacing: 14) {
      SettingsAvatar(url: profile?.avatarUrl ?? profile?.avatarUrlLg, size: 58)

      VStack(alignment: .leading, spacing: 4) {
        Text(displayName)
          .font(.system(size: 22, weight: .black, design: .rounded))
          .foregroundStyle(Color(.label))
          .lineLimit(1)
          .minimumScaleFactor(0.72)

        Text("@\(settings.username)")
          .font(.system(size: 15, weight: .bold, design: .rounded))
          .foregroundStyle(Color(.secondaryLabel))
          .lineLimit(1)

        Text(settings.email)
          .font(.system(size: 13, weight: .semibold, design: .rounded))
          .foregroundStyle(Color(.tertiaryLabel))
          .lineLimit(1)
      }

      Spacer(minLength: 0)
    }
    .padding(16)
    .background(Color(.secondarySystemGroupedBackground))
    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
  }
}

private struct SettingsAccountView: View {
  @ObservedObject var viewModel: SettingsViewModel
  @State private var profile: ProfileSettings
  @State private var showPasswordInfo = false

  init(viewModel: SettingsViewModel, initialProfile: ProfileSettings) {
    self.viewModel = viewModel
    _profile = State(initialValue: initialProfile)
  }

  private var isDirty: Bool {
    profile != viewModel.settings?.profile
  }

  private var canSave: Bool {
    profile.displayName.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2
      && profile.email.contains("@")
      && viewModel.canSaveUsername(profile.username)
      && isDirty
      && !viewModel.savingSections.contains(.account)
  }

  var body: some View {
    ScrollView {
      VStack(spacing: 18) {
        SettingsSectionCard(title: "Profile") {
          SettingsTextFieldRow(
            title: "Display name",
            text: $profile.displayName,
            placeholder: "Your display name",
            textContentType: .name
          )

          SettingsDivider()

          VStack(alignment: .leading, spacing: 8) {
            SettingsTextFieldRow(
              title: "Username",
              text: $profile.username,
              placeholder: "username",
              prefix: "35mm/",
              textContentType: .username,
              autocapitalization: .never
            )

            HStack(spacing: 7) {
              usernameStatusIcon
              Text(viewModel.usernameStatus.message)
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(usernameStatusColor)
            }
            .padding(.leading, 2)
          }
          .onChange(of: profile.username) { _, newValue in
            viewModel.checkUsername(newValue)
          }

          SettingsDivider()

          SettingsTextFieldRow(
            title: "Email",
            text: $profile.email,
            placeholder: "you@example.com",
            keyboardType: .emailAddress,
            textContentType: .emailAddress,
            autocapitalization: .never
          )
        }

        SettingsSectionCard(title: "Security") {
          Button {
            showPasswordInfo = true
          } label: {
            SettingsActionRow(
              systemImage: "key",
              title: "Change password",
              subtitle: "Use your sign-in email to reset password"
            )
          }
          .buttonStyle(.plain)
        }

        SettingsPrimaryButton(
          title: viewModel.savingSections.contains(.account) ? "Saving..." : "Save changes",
          disabled: !canSave
        ) {
          Task {
            await viewModel.saveProfile(profile)
          }
        }
      }
      .padding(16)
      .padding(.bottom, 24)
    }
    .onChange(of: viewModel.settings?.profile) { _, newValue in
      if let newValue, !isDirty {
        profile = newValue
      }
    }
    .alert("Change password", isPresented: $showPasswordInfo) {
      Button("OK", role: .cancel) {}
    } message: {
      Text("Password reset is handled from the sign-in screen for this Clerk-backed account.")
    }
  }

  @ViewBuilder
  private var usernameStatusIcon: some View {
    switch viewModel.usernameStatus {
    case .checking:
      ProgressView()
        .controlSize(.mini)
    case .available, .current:
      Image(systemName: "checkmark.circle.fill")
        .foregroundStyle(Color.green)
    case .unavailable, .error:
      Image(systemName: "xmark.circle.fill")
        .foregroundStyle(Color.red)
    case .idle:
      Image(systemName: "info.circle.fill")
        .foregroundStyle(Color(.tertiaryLabel))
    }
  }

  private var usernameStatusColor: Color {
    switch viewModel.usernameStatus {
    case .available, .current:
      Color.green
    case .unavailable, .error:
      Color.red
    default:
      Color(.secondaryLabel)
    }
  }
}

private struct SettingsPrivacyView: View {
  @ObservedObject var viewModel: SettingsViewModel
  @State private var privacy: PrivacySettings
  @State private var confirmMakePublic = false

  init(viewModel: SettingsViewModel, initialPrivacy: PrivacySettings) {
    self.viewModel = viewModel
    _privacy = State(initialValue: initialPrivacy)
  }

  var body: some View {
    ScrollView {
      VStack(spacing: 18) {
        SettingsSectionCard(title: "Visibility") {
          SettingsToggleRow(
            title: "Private account",
            subtitle: "Only approved followers can see your posts",
            isOn: Binding(
              get: { privacy.privateAccount },
              set: { nextValue in
                if privacy.privateAccount && !nextValue {
                  confirmMakePublic = true
                } else {
                  privacy.privateAccount = nextValue
                  save()
                }
              }
            )
          )

          SettingsDivider()

          SettingsToggleRow(
            title: "Allow messages from anyone",
            subtitle: "Otherwise only people you follow can message you",
            isOn: $privacy.allowMessagesFromAnyone
          )
          .onChange(of: privacy.allowMessagesFromAnyone) { _, _ in save() }

          SettingsDivider()

          SettingsToggleRow(
            title: "Show activity status",
            subtitle: "Let others see when you are active",
            isOn: $privacy.showActivityStatus
          )
          .onChange(of: privacy.showActivityStatus) { _, _ in save() }
        }

        SettingsSectionCard(title: "Account controls") {
          ForEach(SettingsModerationKind.allCases) { kind in
            NavigationLink {
              SettingsModerationListView(kind: kind, viewModel: viewModel)
            } label: {
              SettingsNavigationRow(
                systemImage: kind == .blocked ? "hand.raised" : "speaker.slash",
                title: kind.title,
                subtitle: kind.rowDescription
              )
            }
            .buttonStyle(.plain)

            if kind.id != SettingsModerationKind.allCases.last?.id {
              SettingsDivider()
            }
          }
        }
      }
      .padding(16)
      .padding(.bottom, 24)
    }
    .onChange(of: viewModel.settings?.privacy) { _, newValue in
      if let newValue {
        privacy = newValue
      }
    }
    .alert("Make account public?", isPresented: $confirmMakePublic) {
      Button("Cancel", role: .cancel) {}
      Button("Make Public", role: .destructive) {
        privacy.privateAccount = false
        save()
      }
    } message: {
      Text("Your posts will become visible to everyone. Any pending follow requests may be approved automatically.")
    }
  }

  private func save() {
    Task {
      await viewModel.savePrivacy(privacy)
    }
  }
}

private struct SettingsNotificationsView: View {
  @ObservedObject var viewModel: SettingsViewModel
  @State private var notifications: NotificationSettings

  init(viewModel: SettingsViewModel, initialNotifications: NotificationSettings) {
    self.viewModel = viewModel
    _notifications = State(initialValue: initialNotifications)
  }

  private var isDirty: Bool {
    notifications != viewModel.settings?.notifications
  }

  var body: some View {
    ScrollView {
      VStack(spacing: 18) {
        SettingsSectionCard(title: "Activity") {
          SettingsToggleRow(title: "New followers", isOn: $notifications.newFollowers)
          SettingsDivider()
          SettingsToggleRow(title: "Likes on posts", isOn: $notifications.likesOnPosts)
          SettingsDivider()
          SettingsToggleRow(title: "Comments & replies", isOn: $notifications.commentsAndReplies)
          SettingsDivider()
          SettingsToggleRow(title: "Mentions", isOn: $notifications.mentions)
        }

        SettingsSectionCard(title: "Email") {
          SettingsToggleRow(
            title: "Email digest",
            subtitle: "Weekly summary of your activity",
            isOn: $notifications.emailDigest
          )
          SettingsDivider()
          SettingsToggleRow(title: "New followers", isOn: $notifications.emailPreferences.newFollowers)
          SettingsDivider()
          SettingsToggleRow(title: "Follow requests", isOn: $notifications.emailPreferences.followRequests)
          SettingsDivider()
          SettingsToggleRow(title: "Accepted follow requests", isOn: $notifications.emailPreferences.followRequestApproved)
          SettingsDivider()
          SettingsToggleRow(title: "Comments", isOn: $notifications.emailPreferences.comments)
          SettingsDivider()
          SettingsToggleRow(title: "Replies", isOn: $notifications.emailPreferences.replies)
          SettingsDivider()
          SettingsToggleRow(title: "Mentions", isOn: $notifications.emailPreferences.mentions)
          SettingsDivider()
          SettingsToggleRow(title: "Likes on posts", isOn: $notifications.emailPreferences.likesOnPosts)
          SettingsDivider()
          SettingsToggleRow(title: "Reposts", isOn: $notifications.emailPreferences.repostsOnPosts)
          SettingsDivider()
          SettingsToggleRow(title: "Shared film logs", isOn: $notifications.emailPreferences.filmLogged)
        }

        SettingsSectionCard(title: "Mobile app push") {
          SettingsToggleRow(title: "Festival updates", isOn: $notifications.festivalUpdates)
          SettingsDivider()
          SettingsToggleRow(
            title: "Watchlist streaming",
            subtitle: "When films in your watchlist become available",
            isOn: $notifications.watchlistStreaming
          )
        }

        SettingsPrimaryButton(
          title: viewModel.savingSections.contains(.notifications) ? "Saving..." : "Save changes",
          disabled: !isDirty || viewModel.savingSections.contains(.notifications)
        ) {
          Task {
            await viewModel.saveNotifications(notifications)
          }
        }
      }
      .padding(16)
      .padding(.bottom, 24)
    }
    .onChange(of: viewModel.settings?.notifications) { _, newValue in
      if let newValue, !isDirty {
        notifications = newValue
      }
    }
  }
}

private struct SettingsAppearanceView: View {
  @ObservedObject var viewModel: SettingsViewModel
  @State private var appearance: AppearanceSettings

  private let themes = [
    ("auto", "Auto", "circle.lefthalf.filled"),
    ("light", "Light", "sun.max"),
    ("dark", "Dark", "moon"),
    ("matrix", "Matrix", "terminal"),
    ("oppenheimer-bw", "B&W", "camera.filters"),
    ("barbie", "Pop", "sparkles"),
  ]

  private let accentColors = [
    ("theme", "Theme", Color(.label)),
    ("warm-red", "Warm red", Color.red),
    ("crimson", "Crimson", Color.pink),
    ("amber", "Amber", Color.orange),
    ("forest", "Forest", Color.green),
    ("ocean", "Ocean", Color.blue),
    ("violet", "Violet", Color.purple),
    ("rose", "Rose", Color(red: 0.93, green: 0.32, blue: 0.52)),
  ]

  init(viewModel: SettingsViewModel, initialAppearance: AppearanceSettings) {
    self.viewModel = viewModel
    _appearance = State(initialValue: initialAppearance)
  }

  var body: some View {
    ScrollView {
      VStack(spacing: 18) {
        SettingsSectionCard(title: "Theme") {
          LazyVGrid(columns: [GridItem(.adaptive(minimum: 96), spacing: 10)], spacing: 10) {
            ForEach(themes, id: \.0) { theme in
              SettingsChoiceButton(
                title: theme.1,
                systemImage: theme.2,
                selected: appearance.theme == theme.0
              ) {
                appearance.theme = theme.0
                save()
              }
            }
          }
        }

        SettingsSectionCard(title: "Accent color") {
          LazyVGrid(columns: [GridItem(.adaptive(minimum: 122), spacing: 10)], spacing: 10) {
            ForEach(accentColors, id: \.0) { accent in
              Button {
                appearance.accentColor = accent.0
                save()
              } label: {
                HStack(spacing: 9) {
                  Circle()
                    .fill(accent.2)
                    .frame(width: 18, height: 18)
                    .overlay {
                      if appearance.accentColor == accent.0 {
                        Image(systemName: "checkmark")
                          .font(.system(size: 9, weight: .black))
                          .foregroundStyle(Color.white)
                      }
                    }
                  Text(accent.1)
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .lineLimit(1)
                  Spacer(minLength: 0)
                }
                .padding(.horizontal, 12)
                .frame(height: 42)
                .background(appearance.accentColor == accent.0 ? Color(.systemGray5) : Color(.systemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
              }
              .buttonStyle(.plain)
            }
          }
        }

        SettingsSectionCard(title: "Motion") {
          SettingsToggleRow(
            title: "Video autoplay",
            subtitle: "Automatically play videos in feed surfaces",
            isOn: $appearance.videoAutoplay
          )
          .onChange(of: appearance.videoAutoplay) { _, _ in save() }
        }
      }
      .padding(16)
      .padding(.bottom, 24)
    }
    .onChange(of: viewModel.settings?.appearance) { _, newValue in
      if let newValue {
        appearance = newValue
      }
    }
  }

  private func save() {
    Task {
      await viewModel.saveAppearance(appearance)
    }
  }
}

private struct SettingsMediaView: View {
  @ObservedObject var viewModel: SettingsViewModel
  @State private var media: MediaSettings

  private let qualityOptions = [
    ("auto", "Auto"),
    ("data_saver", "Data saver"),
    ("standard", "Standard"),
    ("high", "High"),
  ]

  private let captionOptions = [
    ("default", "Default"),
    ("large", "Large text"),
    ("high_contrast", "High contrast"),
  ]

  init(viewModel: SettingsViewModel, initialMedia: MediaSettings) {
    self.viewModel = viewModel
    _media = State(initialValue: initialMedia)
  }

  var body: some View {
    ScrollView {
      VStack(spacing: 18) {
        SettingsSectionCard(title: "Video") {
          SettingsMenuRow(
            title: "Video default quality",
            subtitle: "Choose playback quality for feed videos",
            value: label(for: media.videoDefaultQuality, in: qualityOptions),
            options: qualityOptions
          ) { value in
            media.videoDefaultQuality = value
            save()
          }

          SettingsDivider()

          SettingsToggleRow(
            title: "Autoplay",
            subtitle: "Automatically play videos in feed and short-film surfaces",
            isOn: $media.videoAutoplay
          )
          .onChange(of: media.videoAutoplay) { _, _ in save() }

          SettingsDivider()

          SettingsToggleRow(
            title: "Always show captions",
            subtitle: "Show captions by default when available",
            isOn: $media.alwaysShowCaptions
          )
          .onChange(of: media.alwaysShowCaptions) { _, _ in save() }

          SettingsDivider()

          SettingsMenuRow(
            title: "Caption display",
            subtitle: "Choose default caption styling",
            value: label(for: media.captionStyle, in: captionOptions),
            options: captionOptions
          ) { value in
            media.captionStyle = value
            save()
          }

          SettingsDivider()

          SettingsToggleRow(
            title: "Quiet mode",
            subtitle: "Start videos at lower volume when sound is enabled",
            isOn: $media.quietMode
          )
          .onChange(of: media.quietMode) { _, _ in save() }
        }
      }
      .padding(16)
      .padding(.bottom, 24)
    }
    .onChange(of: viewModel.settings?.media) { _, newValue in
      if let newValue {
        media = newValue
      }
    }
  }

  private func save() {
    Task {
      await viewModel.saveMedia(media)
    }
  }

  private func label(for value: String, in options: [(String, String)]) -> String {
    options.first { $0.0 == value }?.1 ?? value
  }
}

private struct SettingsModerationListView: View {
  let kind: SettingsModerationKind
  @ObservedObject var viewModel: SettingsViewModel

  private var users: [ModeratedUser] {
    viewModel.moderatedUsersByKind[kind] ?? []
  }

  var body: some View {
    ScrollView {
      VStack(spacing: 18) {
        SettingsSectionCard(title: kind.title) {
          if viewModel.moderationLoadingKinds.contains(kind) {
            HStack(spacing: 10) {
              ProgressView()
              Text("Loading \(kind.title.lowercased())...")
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(Color(.secondaryLabel))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 8)
          } else if let error = viewModel.moderationErrors[kind] {
            SettingsInlineError(message: error) {
              Task {
                await viewModel.loadModeratedUsers(kind: kind)
              }
            }
          } else if users.isEmpty {
            SettingsEmptyState(
              systemImage: kind == .blocked ? "hand.raised" : "speaker.slash",
              title: kind.emptyTitle,
              bodyText: kind.emptyBody
            )
          } else {
            ForEach(users) { user in
              ModeratedUserRow(kind: kind, user: user) {
                Task {
                  await viewModel.removeModeration(kind: kind, user: user)
                }
              }
              if user != users.last {
                SettingsDivider()
              }
            }
          }
        }
      }
      .padding(16)
      .padding(.bottom, 24)
    }
    .navigationTitle(kind.title)
    .navigationBarTitleDisplayMode(.inline)
    .task {
      await viewModel.loadModeratedUsers(kind: kind)
    }
  }
}

private struct SettingsDataSecurityView: View {
  @ObservedObject var viewModel: SettingsViewModel
  let authManager: AuthManager

  @State private var showExportInfo = false
  @State private var showDeactivateInfo = false
  @State private var showDeleteInfo = false
  @State private var confirmSignOut = false

  var body: some View {
    ScrollView {
      VStack(spacing: 18) {
        SettingsSectionCard(title: "Data & storage") {
          Button {
            showExportInfo = true
          } label: {
            SettingsActionRow(
              systemImage: "square.and.arrow.down",
              title: "Download your data",
              subtitle: "Request an archive of profile, posts, and activity"
            )
          }
          .buttonStyle(.plain)

          SettingsDivider()

          Button {
            viewModel.clearCache()
          } label: {
            SettingsActionRow(
              systemImage: "trash",
              title: "Clear cache",
              subtitle: "Free storage used by temporary images and responses"
            )
          }
          .buttonStyle(.plain)
        }

        SettingsSectionCard(title: "Session") {
          Button(role: .destructive) {
            confirmSignOut = true
          } label: {
            SettingsActionRow(
              systemImage: "rectangle.portrait.and.arrow.right",
              title: "Sign out",
              subtitle: "End this session on this device",
              isDestructive: true
            )
          }
          .buttonStyle(.plain)
        }

        SettingsSectionCard(title: "Account lifecycle") {
          Button(role: .destructive) {
            showDeactivateInfo = true
          } label: {
            SettingsActionRow(
              systemImage: "pause.circle",
              title: "Deactivate account temporarily",
              subtitle: "Backend support is not available yet",
              isDestructive: true
            )
          }
          .buttonStyle(.plain)

          SettingsDivider()

          Button(role: .destructive) {
            showDeleteInfo = true
          } label: {
            SettingsActionRow(
              systemImage: "xmark.bin",
              title: "Delete account",
              subtitle: "Backend support is not available yet",
              isDestructive: true
            )
          }
          .buttonStyle(.plain)
        }
      }
      .padding(16)
      .padding(.bottom, 24)
    }
    .alert("Download your data", isPresented: $showExportInfo) {
      Button("OK", role: .cancel) {}
    } message: {
      Text("Data export API is not available in this backend yet.")
    }
    .alert("Deactivate account", isPresented: $showDeactivateInfo) {
      Button("OK", role: .cancel) {}
    } message: {
      Text("Account deactivation requires backend support before this action can run.")
    }
    .alert("Delete account", isPresented: $showDeleteInfo) {
      Button("OK", role: .cancel) {}
    } message: {
      Text("Account deletion requires backend support before this destructive action can run.")
    }
    .alert("Sign out?", isPresented: $confirmSignOut) {
      Button("Cancel", role: .cancel) {}
      Button("Sign out", role: .destructive) {
        Task {
          try? await authManager.signOut()
        }
      }
    } message: {
      Text("You can sign back in anytime.")
    }
  }
}

private struct SettingsFooter: View {
  let authManager: AuthManager
  @State private var confirmSignOut = false

  var body: some View {
    Button(role: .destructive) {
      confirmSignOut = true
    } label: {
      Text("Sign out")
        .font(.system(size: 15, weight: .bold, design: .rounded))
        .foregroundStyle(Color.red)
        .frame(maxWidth: .infinity)
        .frame(height: 48)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
    .buttonStyle(.plain)
    .alert("Sign out?", isPresented: $confirmSignOut) {
      Button("Cancel", role: .cancel) {}
      Button("Sign out", role: .destructive) {
        Task {
          try? await authManager.signOut()
        }
      }
    } message: {
      Text("You can sign back in anytime.")
    }
  }
}

private struct ModeratedUserRow: View {
  let kind: SettingsModerationKind
  let user: ModeratedUser
  let action: () -> Void

  var body: some View {
    HStack(alignment: .top, spacing: 12) {
      SettingsAvatar(url: user.avatarUrl ?? user.avatarUrlLg, size: 44)

      VStack(alignment: .leading, spacing: 3) {
        Text(user.displayName)
          .font(.system(size: 15, weight: .bold, design: .rounded))
          .lineLimit(1)
        Text("@\(user.username)")
          .font(.system(size: 13, weight: .semibold, design: .rounded))
          .foregroundStyle(Color(.secondaryLabel))
          .lineLimit(1)
        if let bio = user.bio, !bio.isEmpty {
          Text(bio)
            .font(.system(size: 12, weight: .regular, design: .rounded))
            .foregroundStyle(Color(.secondaryLabel))
            .lineLimit(2)
            .padding(.top, 2)
        }
      }

      Spacer(minLength: 0)

      Button(kind.actionTitle, action: action)
        .font(.system(size: 13, weight: .bold, design: .rounded))
        .foregroundStyle(Color(.label))
        .padding(.horizontal, 12)
        .frame(height: 34)
        .background(Color(.systemGray6))
        .clipShape(Capsule())
    }
    .padding(.vertical, 2)
  }
}

private struct SettingsSectionCard<Content: View>: View {
  let title: String
  let content: Content

  init(title: String, @ViewBuilder content: () -> Content) {
    self.title = title
    self.content = content()
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(title)
        .font(.system(size: 13, weight: .black, design: .rounded))
        .foregroundStyle(Color(.secondaryLabel))
        .textCase(.uppercase)
        .padding(.horizontal, 4)

      VStack(spacing: 0) {
        content
      }
      .padding(12)
      .background(Color(.secondarySystemGroupedBackground))
      .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
  }
}

private struct SettingsAvatar: View {
  let url: String?
  let size: CGFloat

  var body: some View {
    AsyncImage(url: url.flatMap(URL.init(string:))) { phase in
      switch phase {
      case .success(let image):
        image.resizable().scaledToFill()
      default:
        ZStack {
          Circle()
            .fill(Color(.systemGray6))
          Image(systemName: "person.fill")
            .font(.system(size: size * 0.42, weight: .semibold))
            .foregroundStyle(Color(.systemGray2))
        }
      }
    }
    .frame(width: size, height: size)
    .clipShape(Circle())
    .overlay {
      Circle()
        .stroke(Color(.systemGray5), lineWidth: 1)
    }
  }
}

private struct SettingsNavigationRow: View {
  let systemImage: String
  let title: String
  let subtitle: String

  var body: some View {
    HStack(spacing: 13) {
      SettingsIcon(systemImage: systemImage)

      VStack(alignment: .leading, spacing: 3) {
        Text(title)
          .font(.system(size: 16, weight: .bold, design: .rounded))
          .foregroundStyle(Color(.label))
          .lineLimit(1)
        Text(subtitle)
          .font(.system(size: 12, weight: .semibold, design: .rounded))
          .foregroundStyle(Color(.secondaryLabel))
          .lineLimit(1)
      }

      Spacer(minLength: 0)

      Image(systemName: "chevron.right")
        .font(.system(size: 13, weight: .bold))
        .foregroundStyle(Color(.tertiaryLabel))
    }
    .frame(minHeight: 54)
    .contentShape(Rectangle())
  }
}

private struct SettingsActionRow: View {
  let systemImage: String
  let title: String
  let subtitle: String
  var isDestructive = false

  var body: some View {
    HStack(spacing: 13) {
      SettingsIcon(systemImage: systemImage, isDestructive: isDestructive)

      VStack(alignment: .leading, spacing: 3) {
        Text(title)
          .font(.system(size: 16, weight: .bold, design: .rounded))
          .foregroundStyle(isDestructive ? Color.red : Color(.label))
          .lineLimit(1)
          .minimumScaleFactor(0.78)
        Text(subtitle)
          .font(.system(size: 12, weight: .semibold, design: .rounded))
          .foregroundStyle(Color(.secondaryLabel))
          .lineLimit(2)
      }

      Spacer(minLength: 0)
    }
    .frame(minHeight: 54)
    .contentShape(Rectangle())
  }
}

private struct SettingsIcon: View {
  let systemImage: String
  var isDestructive = false

  var body: some View {
    Image(systemName: systemImage)
      .font(.system(size: 17, weight: .bold))
      .foregroundStyle(isDestructive ? Color.red : Color(.label))
      .frame(width: 34, height: 34)
      .background(isDestructive ? Color.red.opacity(0.1) : Color(.systemGray6))
      .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
  }
}

private struct SettingsToggleRow: View {
  let title: String
  var subtitle: String?
  @Binding var isOn: Bool

  var body: some View {
    Toggle(isOn: $isOn) {
      VStack(alignment: .leading, spacing: 3) {
        Text(title)
          .font(.system(size: 15, weight: .bold, design: .rounded))
          .foregroundStyle(Color(.label))
        if let subtitle {
          Text(subtitle)
            .font(.system(size: 12, weight: .semibold, design: .rounded))
            .foregroundStyle(Color(.secondaryLabel))
            .fixedSize(horizontal: false, vertical: true)
        }
      }
    }
    .toggleStyle(SwitchToggleStyle(tint: .black))
    .frame(minHeight: 52)
  }
}

private struct SettingsTextFieldRow: View {
  let title: String
  @Binding var text: String
  let placeholder: String
  var prefix: String?
  var keyboardType: UIKeyboardType = .default
  var textContentType: UITextContentType?
  var autocapitalization: TextInputAutocapitalization = .words

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(title)
        .font(.system(size: 13, weight: .bold, design: .rounded))
        .foregroundStyle(Color(.secondaryLabel))

      HStack(spacing: 0) {
        if let prefix {
          Text(prefix)
            .font(.system(size: 15, weight: .semibold, design: .rounded))
            .foregroundStyle(Color(.secondaryLabel))
            .padding(.horizontal, 11)
            .frame(height: 44)
            .background(Color(.systemGray6))
        }

        TextField(placeholder, text: $text)
          .font(.system(size: 15, weight: .semibold, design: .rounded))
          .keyboardType(keyboardType)
          .textContentType(textContentType)
          .textInputAutocapitalization(autocapitalization)
          .autocorrectionDisabled()
          .padding(.horizontal, 12)
          .frame(height: 44)
      }
      .background(Color(.systemBackground))
      .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
      .overlay {
        RoundedRectangle(cornerRadius: 8, style: .continuous)
          .stroke(Color(.systemGray5), lineWidth: 1)
      }
    }
    .padding(.vertical, 2)
  }
}

private struct SettingsMenuRow: View {
  let title: String
  let subtitle: String
  let value: String
  let options: [(String, String)]
  let onSelect: (String) -> Void

  var body: some View {
    HStack(alignment: .center, spacing: 12) {
      VStack(alignment: .leading, spacing: 3) {
        Text(title)
          .font(.system(size: 15, weight: .bold, design: .rounded))
          .foregroundStyle(Color(.label))
        Text(subtitle)
          .font(.system(size: 12, weight: .semibold, design: .rounded))
          .foregroundStyle(Color(.secondaryLabel))
          .fixedSize(horizontal: false, vertical: true)
      }

      Spacer(minLength: 0)

      Menu {
        ForEach(options, id: \.0) { option in
          Button(option.1) {
            onSelect(option.0)
          }
        }
      } label: {
        HStack(spacing: 6) {
          Text(value)
            .font(.system(size: 13, weight: .bold, design: .rounded))
          Image(systemName: "chevron.up.chevron.down")
            .font(.system(size: 10, weight: .bold))
        }
        .foregroundStyle(Color(.label))
        .padding(.horizontal, 10)
        .frame(height: 34)
        .background(Color(.systemGray6))
        .clipShape(Capsule())
      }
    }
    .frame(minHeight: 58)
  }
}

private struct SettingsChoiceButton: View {
  let title: String
  let systemImage: String
  let selected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      VStack(spacing: 7) {
        Image(systemName: systemImage)
          .font(.system(size: 18, weight: .bold))
        Text(title)
          .font(.system(size: 13, weight: .bold, design: .rounded))
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
      .foregroundStyle(selected ? Color(.label) : Color(.secondaryLabel))
      .frame(maxWidth: .infinity)
      .frame(height: 74)
      .background(selected ? Color(.systemGray5) : Color(.systemBackground))
      .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
      .overlay {
        RoundedRectangle(cornerRadius: 8, style: .continuous)
          .stroke(selected ? Color(.label).opacity(0.24) : Color(.systemGray5), lineWidth: 1)
      }
    }
    .buttonStyle(.plain)
  }
}

private struct SettingsPrimaryButton: View {
  let title: String
  let disabled: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      Text(title)
        .font(.system(size: 15, weight: .black, design: .rounded))
        .foregroundStyle(Color.white)
        .frame(maxWidth: .infinity)
        .frame(height: 48)
        .background(disabled ? Color(.systemGray3) : Color.black)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
    .buttonStyle(.plain)
    .disabled(disabled)
  }
}

private struct SettingsDivider: View {
  var body: some View {
    Divider()
      .padding(.leading, 47)
  }
}

private struct SettingsLoadingView: View {
  var body: some View {
    VStack(spacing: 12) {
      ProgressView()
      Text("Loading settings...")
        .font(.system(size: 14, weight: .semibold, design: .rounded))
        .foregroundStyle(Color(.secondaryLabel))
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

private struct SettingsErrorView: View {
  let message: String
  let retry: () -> Void

  var body: some View {
    VStack(spacing: 14) {
      Image(systemName: "exclamationmark.triangle.fill")
        .font(.system(size: 32, weight: .bold))
        .foregroundStyle(Color.orange)
      Text(message)
        .font(.system(size: 15, weight: .semibold, design: .rounded))
        .foregroundStyle(Color(.secondaryLabel))
        .multilineTextAlignment(.center)
      Button("Retry", action: retry)
        .font(.system(size: 15, weight: .bold, design: .rounded))
        .foregroundStyle(Color.white)
        .padding(.horizontal, 20)
        .frame(height: 42)
        .background(Color.black)
        .clipShape(Capsule())
    }
    .padding(30)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

private struct SettingsInlineError: View {
  let message: String
  let retry: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(message)
        .font(.system(size: 13, weight: .semibold, design: .rounded))
        .foregroundStyle(Color.red)
      Button("Retry", action: retry)
        .font(.system(size: 13, weight: .bold, design: .rounded))
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.vertical, 4)
  }
}

private struct SettingsEmptyState: View {
  let systemImage: String
  let title: String
  let bodyText: String

  var body: some View {
    VStack(spacing: 10) {
      Image(systemName: systemImage)
        .font(.system(size: 28, weight: .bold))
        .foregroundStyle(Color(.secondaryLabel))
        .frame(width: 56, height: 56)
        .background(Color(.systemGray6))
        .clipShape(Circle())
      Text(title)
        .font(.system(size: 16, weight: .black, design: .rounded))
      Text(bodyText)
        .font(.system(size: 13, weight: .semibold, design: .rounded))
        .foregroundStyle(Color(.secondaryLabel))
        .multilineTextAlignment(.center)
        .lineLimit(3)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 28)
  }
}

private struct SettingsToast: View {
  let message: String

  var body: some View {
    Text(message)
      .font(.system(size: 13, weight: .bold, design: .rounded))
      .foregroundStyle(Color.white)
      .padding(.horizontal, 15)
      .frame(height: 40)
      .background(Color.black.opacity(0.9))
      .clipShape(Capsule())
      .shadow(color: .black.opacity(0.2), radius: 16, x: 0, y: 8)
  }
}

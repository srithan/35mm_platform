import Foundation

enum SettingsSectionID: String, CaseIterable, Identifiable, Hashable {
  case account
  case privacy
  case notifications
  case appearance
  case media
  case dataSecurity

  var id: String { rawValue }

  var title: String {
    switch self {
    case .account: "Account"
    case .privacy: "Privacy"
    case .notifications: "Notifications"
    case .appearance: "Appearance"
    case .media: "Media"
    case .dataSecurity: "Data & security"
    }
  }

  var subtitle: String {
    switch self {
    case .account: "Profile and login basics"
    case .privacy: "Audience and interactions"
    case .notifications: "Push, activity, email"
    case .appearance: "Theme, color, motion"
    case .media: "Playback and captions"
    case .dataSecurity: "Exports and account safety"
    }
  }

  var systemImage: String {
    switch self {
    case .account: "person.crop.circle"
    case .privacy: "shield"
    case .notifications: "bell"
    case .appearance: "paintpalette"
    case .media: "play.rectangle"
    case .dataSecurity: "lock.shield"
    }
  }
}

enum SettingsModerationKind: String, CaseIterable, Identifiable, Hashable {
  case blocked
  case muted

  var id: String { rawValue }

  var title: String {
    switch self {
    case .blocked: "Blocked accounts"
    case .muted: "Muted accounts"
    }
  }

  var emptyTitle: String {
    switch self {
    case .blocked: "No blocked accounts"
    case .muted: "No muted accounts"
    }
  }

  var emptyBody: String {
    switch self {
    case .blocked: "When you block someone, they will appear here with controls to unblock them."
    case .muted: "Muted accounts appear here when you hide their posts from your feed."
    }
  }

  var rowDescription: String {
    switch self {
    case .blocked: "They cannot see your profile, posts, or message you."
    case .muted: "They stay hidden from your feed without being notified."
    }
  }

  var actionTitle: String {
    switch self {
    case .blocked: "Unblock"
    case .muted: "Unmute"
    }
  }

  var listPath: String {
    switch self {
    case .blocked: "/v1/me/blocks"
    case .muted: "/v1/me/mutes"
    }
  }

  var actionPath: String {
    switch self {
    case .blocked: "block"
    case .muted: "mute"
    }
  }
}

enum SettingsUsernameStatus: Equatable {
  case current(String)
  case idle(String)
  case checking(String)
  case available(String)
  case unavailable(String)
  case error(String)

  var message: String {
    switch self {
    case .current(let message),
      .idle(let message),
      .checking(let message),
      .available(let message),
      .unavailable(let message),
      .error(let message):
      message
    }
  }
}

@MainActor
final class SettingsViewModel: ObservableObject {
  @Published private(set) var isLoading = false
  @Published private(set) var loadError: String?
  @Published private(set) var toast: String?
  @Published private(set) var savingSections = Set<SettingsSectionID>()
  @Published private(set) var usernameStatus = SettingsUsernameStatus.idle("Use letters, numbers, dots, and underscores.")
  @Published var settings: UserSettings?
  @Published var moderatedUsersByKind: [SettingsModerationKind: [ModeratedUser]] = [:]
  @Published var moderationLoadingKinds = Set<SettingsModerationKind>()
  @Published var moderationErrors: [SettingsModerationKind: String] = [:]

  private let apiClient: APIClient
  private var usernameCheckTask: Task<Void, Never>?
  /// Latest appearance the user picked while a PATCH is in flight (latest-wins).
  private var pendingAppearance: AppearanceSettings?

  init(apiClient: APIClient) {
    self.apiClient = apiClient
  }

  deinit {
    usernameCheckTask?.cancel()
  }

  func loadIfNeeded() async {
    guard settings == nil else { return }
    await reload()
  }

  func reload() async {
    guard !isLoading else { return }
    // Avoid clobbering an in-flight optimistic theme with a stale GET.
    guard savingSections.contains(.appearance) == false, pendingAppearance == nil else { return }
    isLoading = true
    loadError = nil

    do {
      settings = try await apiClient.getSettings()
      resetUsernameStatus()
      // ThemeManager is local authority (UserDefaults), same as web localStorage.
      // Never paint GET/PATCH appearance onto the UI — stale reads were the
      // NEW → OLD → NEW flash when SettingsView recreated mid-save.
      ThemeManager.shared.hydrateFromServerIfNeeded(settings?.appearance)
    } catch {
      loadError = settingsMessage(for: error, fallback: "Could not load settings.")
    }

    isLoading = false
  }

  func resetUsernameStatus() {
    usernameStatus = .current("This is your current profile URL.")
  }

  func checkUsername(_ username: String) {
    usernameCheckTask?.cancel()

    let normalized = username.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    let current = settings?.profile.username.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    guard normalized != current else {
      usernameStatus = .current("This is your current profile URL.")
      return
    }

    guard Self.isValidUsername(normalized) else {
      usernameStatus = .unavailable("Use 2+ letters, numbers, dots, and underscores.")
      return
    }

    usernameStatus = .checking("Checking availability...")
    usernameCheckTask = Task { [weak self] in
      do {
        try await Task.sleep(nanoseconds: 450_000_000)
        guard !Task.isCancelled else { return }
        let response = try await self?.apiClient.checkSettingsUsernameAvailability(normalized)
        guard !Task.isCancelled else { return }

        if response?.available == true {
          self?.usernameStatus = .available("Username is available.")
        } else {
          self?.usernameStatus = .unavailable(response?.reason ?? "Username is not available.")
        }
      } catch is CancellationError {
      } catch {
        self?.usernameStatus = .error("Could not check availability. Try again.")
      }
    }
  }

  func saveProfile(_ profile: ProfileSettings) async {
    guard canSaveUsername(profile.username) else {
      toast = "Choose an available username before saving."
      return
    }
    await save(section: .account, success: "Account updated") {
      try await apiClient.updateSettingsProfile(
        ProfileSettings(
          displayName: profile.displayName.trimmingCharacters(in: .whitespacesAndNewlines),
          username: profile.username.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
          email: profile.email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        )
      )
    }
    resetUsernameStatus()
  }

  func savePrivacy(_ privacy: PrivacySettings) async {
    await save(section: .privacy, success: "Privacy updated") {
      try await apiClient.updateSettingsPrivacy(privacy)
    }
  }

  func saveNotifications(_ notifications: NotificationSettings) async {
    await save(section: .notifications, success: "Notifications updated") {
      try await apiClient.updateSettingsNotifications(notifications)
    }
  }

  /// Applies theme locally first (web-parity), then PATCHes. Merges the
  /// requested appearance over the response so a stale API body cannot flash
  /// the previous theme back onto screen.
  func saveAppearance(_ appearance: AppearanceSettings) async {
    let previousTheme = ThemeManager.shared.theme
    let previousAccent = ThemeManager.shared.accent
    let previousSettings = settings
    pendingAppearance = appearance

    // Theme first — do not publish `settings` until the PATCH settles so a
    // mid-save settings write cannot recreate Settings and re-hit GET.
    ThemeManager.shared.apply(appearance)

    guard savingSections.contains(.appearance) == false else { return }
    savingSections.insert(.appearance)

    while let request = pendingAppearance {
      pendingAppearance = nil
      do {
        let remote = try await apiClient.updateSettingsAppearance(request)
        // Newer tap landed during the await — loop and PATCH that instead.
        if pendingAppearance != nil { continue }

        settings = Self.mergingAppearance(request, into: remote)
        toast = "Appearance updated"
      } catch {
        if pendingAppearance != nil { continue }

        settings = previousSettings
        ThemeManager.shared.set(theme: previousTheme, accent: previousAccent)
        toast = settingsMessage(for: error, fallback: "Could not save changes.")
      }
    }

    savingSections.remove(.appearance)
  }

  /// Prefer fields the client just sent when the server echo is stale
  /// (same merge as web `useUpdateAppearanceMutation` onSuccess).
  private static func mergingAppearance(
    _ requested: AppearanceSettings,
    into remote: UserSettings
  ) -> UserSettings {
    var merged = remote
    merged.appearance = AppearanceSettings(
      theme: requested.theme,
      accentColor: requested.accentColor,
      videoAutoplay: requested.videoAutoplay
    )
    return merged
  }

  func saveMedia(_ media: MediaSettings) async {
    await save(section: .media, success: "Media updated") {
      try await apiClient.updateSettingsMedia(media)
    }
  }

  func loadModeratedUsers(kind: SettingsModerationKind) async {
    guard moderationLoadingKinds.contains(kind) == false else { return }
    moderationLoadingKinds.insert(kind)
    moderationErrors[kind] = nil

    do {
      let page = try await apiClient.getModeratedUsers(kind: kind, cursor: nil, limit: 50)
      moderatedUsersByKind[kind] = page.items
    } catch {
      moderationErrors[kind] = settingsMessage(for: error, fallback: "Could not load \(kind.title.lowercased()).")
    }

    moderationLoadingKinds.remove(kind)
  }

  func removeModeration(kind: SettingsModerationKind, user: ModeratedUser) async {
    do {
      try await apiClient.removeModeration(kind: kind, userId: user.userId)
      moderatedUsersByKind[kind, default: []].removeAll { $0.id == user.id }
      toast = "\(kind.actionTitle)ed @\(user.username)"
    } catch {
      toast = settingsMessage(for: error, fallback: "Could not update \(kind.title.lowercased()).")
    }
  }

  func clearToast() {
    toast = nil
  }

  func clearCache() {
    URLCache.shared.removeAllCachedResponses()
    toast = "Cache cleared"
  }

  func canSaveUsername(_ username: String) -> Bool {
    let normalized = username.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    let current = settings?.profile.username.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    if normalized == current { return true }
    if case .available = usernameStatus { return true }
    return false
  }

  private func save(
    section: SettingsSectionID,
    success: String,
    operation: () async throws -> UserSettings
  ) async {
    guard savingSections.contains(section) == false else { return }
    savingSections.insert(section)

    do {
      settings = try await operation()
      toast = success
      // Appearance has its own optimistic path; other sections must not
      // re-apply a possibly stale appearance blob from the PATCH response.
    } catch {
      toast = settingsMessage(for: error, fallback: "Could not save changes.")
    }

    savingSections.remove(section)
  }

  private static func isValidUsername(_ username: String) -> Bool {
    guard username.count >= 2 else { return false }
    return username.range(of: #"^[a-zA-Z0-9._]+$"#, options: .regularExpression) != nil
  }
}

private func settingsMessage(for error: Error, fallback: String) -> String {
  if let localizedError = error as? LocalizedError,
    let description = localizedError.errorDescription,
    !description.isEmpty
  {
    return description
  }

  return fallback
}


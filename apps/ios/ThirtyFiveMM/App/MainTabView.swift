import SwiftUI
import UIKit

struct MainTabView: View {
  @EnvironmentObject private var env: AppEnvironment
  @Environment(\.theme) private var theme
  @Environment(\.accessibilityReduceMotion) private var accessibilityReduceMotion
  @State private var selectedTab: AppTab = .home
  @State private var previousTab: AppTab = .home
  @State private var isTabBarVisible = true
  @State private var isShowingProfileSidebar = false
  @State private var homePath: [AppRoute] = []
  @State private var activityPath: [AppRoute] = []
  @State private var profile: UserProfile?
  @State private var profileLoadError: String?

  init() {
    let manager = ThemeManager.shared
    Self.applyTabBarTheme(manager.palette, custom: manager.theme.isCustomPalette)
  }

  var body: some View {
    GeometryReader { proxy in
      let sidebarWidth = min(proxy.size.width * 0.78, 320)

      ZStack(alignment: .leading) {
        ProfileSidebar(
          profile: profile,
          profileLoadError: profileLoadError,
          width: sidebarWidth,
          onItemTapped: handleProfileSidebarItem
        )
        .opacity(isShowingProfileSidebar ? 1 : 0)
        .allowsHitTesting(isShowingProfileSidebar)
        .accessibilityHidden(!isShowingProfileSidebar)

        tabContent
          .disabled(isShowingProfileSidebar)
          .accessibilityHidden(isShowingProfileSidebar)
          .overlay {
            Button(action: closeProfileSidebar) {
              Color.black.opacity(isShowingProfileSidebar ? 0.18 : 0)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .allowsHitTesting(isShowingProfileSidebar)
            .accessibilityHidden(!isShowingProfileSidebar)
            .accessibilityLabel("Close navigation menu")
            .ignoresSafeArea()
          }
        .offset(x: isShowingProfileSidebar ? sidebarWidth : 0)
      }
    }
    .task {
      await loadProfile()
    }
  }

  private var tabContent: some View {
    TabView(selection: $selectedTab) {
      NavigationStack(path: $homePath) {
        AppTabRootScreen(
          title: .logo,
          profile: profile,
          profileLoadError: profileLoadError,
          canOpenMessages: currentUserId != nil,
          onProfileTapped: openProfileSidebar,
          onMessagesTapped: {
            openMessages(in: .home)
          }
        ) {
          FeedView(apiClient: env.apiClient) { direction in
            guard selectedTab == .home else { return }
            withAnimation(.spring(response: 0.28, dampingFraction: 0.86)) {
              isTabBarVisible = direction == .up
            }
          }
        }
        .navigationDestination(for: AppRoute.self) { route in
          destination(for: route)
        }
      }
      .tabItem {
        AppTab.home.icon(isSelected: selectedTab == .home)
        Text(AppTab.home.accessibilityLabel)
      }
      .tag(AppTab.home)

      Color.clear
        .tabItem {
          AppTab.create.icon(isSelected: false)
          Text(AppTab.create.accessibilityLabel)
        }
        .tag(AppTab.create)

      NavigationStack(path: $activityPath) {
        AppTabRootScreen(
          title: .text(AppTab.activity.headerTitle),
          profile: profile,
          profileLoadError: profileLoadError,
          canOpenMessages: currentUserId != nil,
          onProfileTapped: openProfileSidebar,
          onMessagesTapped: {
            openMessages(in: .activity)
          }
        ) {
          NotificationsView(apiClient: env.apiClient)
        }
        .navigationDestination(for: AppRoute.self) { route in
          destination(for: route)
        }
      }
      .tabItem {
        AppTab.activity.icon(isSelected: selectedTab == .activity)
        Text(AppTab.activity.accessibilityLabel)
      }
      .tag(AppTab.activity)
    }
    .tint(theme.text)
    // Fill behind the floating tab bar. Do NOT use `.toolbarBackground(.visible,
    // for: .tabBar)` — on iOS 26 that expands into a fat slab that covers feed
    // content above the bar (the white/cream band in screenshots).
    .background(theme.bg.ignoresSafeArea())
    .toolbar(isTabBarVisible ? .visible : .hidden, for: .tabBar)
    .modifier(TabBarMinimizeDisabledModifier())
    .fullScreenCover(
      isPresented: $env.isComposerPresented,
      onDismiss: env.clearComposer
    ) {
      PostComposerView(quotedPost: env.composerQuote)
        .environmentObject(env)
    }
    .onChange(of: selectedTab) { oldValue, newValue in
      if newValue == .create {
        env.presentComposer()
        selectedTab = oldValue == .create ? previousTab : oldValue
        return
      }

      previousTab = newValue
      withAnimation(.spring(response: 0.28, dampingFraction: 0.86)) {
        isTabBarVisible = true
      }
    }
  }

  @ViewBuilder
  private func destination(for route: AppRoute) -> some View {
    switch route {
    case .messages:
      if let currentUserId {
        ChatInboxView(apiClient: env.apiClient, currentUserId: currentUserId)
      } else {
        ProgressView()
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      }
    case .sidebarItem(let item):
      sidebarDestination(for: item)
    case .settingsSection(let section):
      SettingsSectionDestination(
        section: section,
        viewModel: env.settingsViewModel,
        authManager: env.authManager
      )
    case .profile(let destination):
      profileDestination(for: destination)
    case .post(let postId):
      RemotePostDetailView(postId: postId)
    }
  }

  private func profileDestination(for destination: ProfileDestination) -> some View {
    ProfileView(username: destination.username, service: env.apiClient) { updated in
      if profile?.userId == updated.userId {
        profile = UserProfile(profile: updated)
      }
    }
  }

  @ViewBuilder
  private func sidebarDestination(for item: ProfileSidebarItem) -> some View {
    switch item {
    case .discover:
      DiscoverView(apiClient: env.apiClient)
    case .bookmarks:
      BookmarksView(apiClient: env.apiClient)
    case .settings:
      SettingsView(apiClient: env.apiClient, authManager: env.authManager, profile: profile)
    case .notifications:
      NotificationsView(apiClient: env.apiClient)
    case .messages:
      if let currentUserId {
        ChatInboxView(apiClient: env.apiClient, currentUserId: currentUserId)
      } else {
        SidebarPageView(item: item, profile: profile)
      }
    case .profile:
      if let username = profile?.username, !username.isEmpty {
        ProfileView(username: username, service: env.apiClient) { updated in
          profile = UserProfile(profile: updated)
        }
      } else {
        ContentUnavailableView(
          "Profile unavailable",
          systemImage: "person.crop.circle.badge.exclamationmark",
          description: Text(profileLoadError ?? "Your profile could not be loaded.")
        )
      }
    case .shortFilms, .lists, .diary, .drafts, .help:
      SidebarPageView(item: item, profile: profile)
    }
  }

  private var currentUserId: String? {
    if case .authenticated(let userId) = env.authManager.authState {
      return userId
    }

    return profile?.userId
  }

  private func openProfileSidebar() {
    withAnimation(profileSidebarAnimation) {
      isShowingProfileSidebar = true
    }
  }

  private func closeProfileSidebar() {
    withAnimation(profileSidebarAnimation) {
      isShowingProfileSidebar = false
    }
  }

  private var profileSidebarAnimation: Animation? {
    accessibilityReduceMotion
      ? nil
      : .timingCurve(0.32, 0.72, 0, 1, duration: 0.3)
  }

  private func openMessages(in tab: AppTab) {
    guard currentUserId != nil else { return }

    closeProfileSidebar()

    switch tab {
    case .home:
      homePath.append(.messages)
    case .activity:
      activityPath.append(.messages)
    case .create:
      break
    }
  }

  private func handleProfileSidebarItem(_ item: ProfileSidebarItem) {
    switch item {
    case .messages:
      openMessages(in: selectedTab == .create ? .home : selectedTab)
    case .notifications:
      closeProfileSidebar()
      selectedTab = .activity
      showTabBar()
    case .profile, .discover, .shortFilms, .bookmarks, .lists, .diary, .drafts, .settings, .help:
      pushSidebarItem(item)
    }
  }

  private func showTabBar() {
    withAnimation(.spring(response: 0.28, dampingFraction: 0.86)) {
      isTabBarVisible = true
    }
  }

  private func pushSidebarItem(_ item: ProfileSidebarItem) {
    closeProfileSidebar()

    switch selectedTab {
    case .home:
      homePath.append(.sidebarItem(item))
    case .activity:
      activityPath.append(.sidebarItem(item))
    case .create:
      selectedTab = .home
      homePath.append(.sidebarItem(item))
    }
  }

  private func loadProfile() async {
    guard profile == nil else { return }

    do {
      profile = try await env.apiClient.request(.getMe())
      profileLoadError = nil
    } catch {
      profileLoadError = error.localizedDescription
    }
  }

  /// Styles tab item colors via `UITabBarAppearance`.
  /// On iOS 26 the tab bar floats — the `UITabBar` view itself must stay
  /// `.clear`. Painting it opaque (or using SwiftUI `.toolbarBackground(.visible,
  /// for: .tabBar)`) expands into a content-covering bottom slab.
  static func applyTabBarTheme(_ palette: ThemePalette, custom: Bool) {
    let appearance = UITabBarAppearance()
    if custom {
      appearance.configureWithOpaqueBackground()
      appearance.backgroundColor = palette.uiBg
      appearance.backgroundEffect = nil
    } else {
      appearance.configureWithDefaultBackground()
      appearance.backgroundColor = nil
    }
    appearance.shadowColor = .clear

    let selectedColor = palette.uiText
    let normalColor = palette.uiTextSecondary

    let itemAppearance = UITabBarItemAppearance()
    itemAppearance.normal.iconColor = normalColor
    itemAppearance.normal.titleTextAttributes = [
      .foregroundColor: normalColor,
      .font: UIFont.systemFont(ofSize: 10, weight: .medium),
    ]
    itemAppearance.selected.iconColor = selectedColor
    itemAppearance.selected.titleTextAttributes = [
      .foregroundColor: selectedColor,
      .font: UIFont.systemFont(ofSize: 10, weight: .semibold),
    ]

    appearance.stackedLayoutAppearance = itemAppearance
    appearance.inlineLayoutAppearance = itemAppearance
    appearance.compactInlineLayoutAppearance = itemAppearance

    UITabBar.appearance().standardAppearance = appearance
    UITabBar.appearance().scrollEdgeAppearance = appearance
    UITabBar.appearance().isTranslucent = true
    UITabBar.appearance().tintColor = selectedColor
    UITabBar.appearance().unselectedItemTintColor = normalColor
    UITabBar.appearance().barTintColor = nil
    // Keep the bar view clear so iOS 26 does not grow a bottom slab.
    UITabBar.appearance().backgroundColor = .clear

    for scene in UIApplication.shared.connectedScenes {
      guard let windowScene = scene as? UIWindowScene else { continue }
      for window in windowScene.windows {
        window.allSubviews(of: UITabBar.self).forEach { tabBar in
          tabBar.standardAppearance = appearance
          tabBar.scrollEdgeAppearance = appearance
          tabBar.tintColor = selectedColor
          tabBar.unselectedItemTintColor = normalColor
          tabBar.isTranslucent = true
          tabBar.barTintColor = nil
          tabBar.backgroundColor = .clear
        }
      }
    }
  }
}

private enum AppHeaderTitle: Equatable {
  case logo
  case text(String)
}

enum AppRoute: Hashable {
  case messages
  case sidebarItem(ProfileSidebarItem)
  /// Pushed on the same tab stack as Settings so theme rebuilds cannot pop it.
  case settingsSection(SettingsSectionID)
  case profile(ProfileDestination)
  case post(String)
}

enum ProfileSidebarItem: String, CaseIterable, Identifiable {
  case profile
  case discover
  case shortFilms
  case bookmarks
  case lists
  case diary
  case drafts
  case messages
  case notifications
  case settings
  case help

  var id: String { rawValue }

  static let primaryItems: [ProfileSidebarItem] = [
    .profile,
    .discover,
    .shortFilms,
    .bookmarks,
    .lists,
    .diary,
    .drafts
  ]

  static let secondaryItems: [ProfileSidebarItem] = [
    .messages,
    .notifications,
    .settings,
    .help
  ]

  var title: String {
    switch self {
    case .profile:
      return "Profile"
    case .discover:
      return "Discover"
    case .shortFilms:
      return "Short Films"
    case .bookmarks:
      return "Bookmarks"
    case .lists:
      return "Lists"
    case .diary:
      return "Diary"
    case .drafts:
      return "Drafts"
    case .messages:
      return "Chat"
    case .notifications:
      return "Notifications"
    case .settings:
      return "Settings and privacy"
    case .help:
      return "Help"
    }
  }

  var systemImage: String? {
    switch self {
    case .profile:
      return "person"
    case .discover:
      return "sparkles"
    case .shortFilms:
      return "play.rectangle"
    case .bookmarks:
      return "bookmark"
    case .lists:
      return "rectangle.on.rectangle"
    case .diary:
      return "calendar"
    case .drafts:
      return "doc.text"
    case .messages:
      return nil
    case .notifications:
      return "bell"
    case .settings:
      return "gearshape"
    case .help:
      return "questionmark.circle"
    }
  }

  @ViewBuilder
  func icon(size: CGFloat, weight: Font.Weight = .semibold) -> some View {
    if let systemImage {
      Image(systemName: systemImage)
        .font(.system(size: size, weight: weight))
    } else {
      Image("MessagesIcon")
        .resizable()
        .scaledToFit()
        .frame(width: size, height: size)
    }
  }
}

private struct SidebarPageView: View {
  @Environment(\.theme) private var theme
  let item: ProfileSidebarItem
  let profile: UserProfile?

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 22) {
        HStack(spacing: 14) {
          item.icon(size: 22, weight: .bold)
            .foregroundStyle(theme.text)
            .frame(width: 46, height: 46)
            .background(theme.fill, in: RoundedRectangle(cornerRadius: 12, style: .continuous))

          VStack(alignment: .leading, spacing: 4) {
            Text(item.title)
              .font(.title2.weight(.bold))
              .foregroundStyle(theme.text)
              .lineLimit(1)
              .minimumScaleFactor(0.78)

            if let subtitle {
              Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(theme.textSecondary)
                .lineLimit(2)
            }
          }
        }

        content
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(22)
    }
    .background(theme.bg)
    .navigationTitle(item.title)
    .navigationBarTitleDisplayMode(.inline)
  }

  private var subtitle: String? {
    switch item {
    case .profile:
      return profileHandle
    case .discover:
      return "Explore films, people, and conversations."
    case .shortFilms:
      return "Browse shorts and filmmaker uploads."
    case .lists:
      return "Your film lists."
    case .diary:
      return "Your logged watches."
    case .drafts:
      return "Posts you have not published."
    case .help:
      return "Support and product help."
    case .messages:
      return "Sign in to use chat."
    case .bookmarks, .notifications, .settings:
      return nil
    }
  }

  @ViewBuilder
  private var content: some View {
    switch item {
    case .profile:
      profileContent
    default:
      EmptyStateCard(item: item)
    }
  }

  private var profileHandle: String? {
    guard let username = profile?.username, !username.isEmpty else {
      return nil
    }

    return "@\(username)"
  }

  private var profileContent: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text(profile?.displayName ?? profile?.username ?? "Profile")
        .font(.title3.weight(.bold))
        .foregroundStyle(theme.text)

      if let roleContext = profile?.roleContext, !roleContext.isEmpty {
        Text(roleContext)
          .font(.subheadline)
          .foregroundStyle(theme.textSecondary)
      }

      if let filmsLoggedCount = profile?.filmsLoggedCount {
        Text("\(filmsLoggedCount.compactFormatted) films logged")
          .font(.subheadline)
          .foregroundStyle(theme.textSecondary)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(18)
    .background(theme.fill, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
  }
}

private struct EmptyStateCard: View {
  @Environment(\.theme) private var theme
  let item: ProfileSidebarItem

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      item.icon(size: 26, weight: .medium)
        .foregroundStyle(theme.textSecondary)

      Text(item.title)
        .font(.appSectionTitle)
        .foregroundStyle(theme.text)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(18)
    .background(theme.fill, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
  }
}

private struct AppTabRootScreen<Content: View>: View {
  @Environment(\.theme) private var theme
  let title: AppHeaderTitle
  let profile: UserProfile?
  let profileLoadError: String?
  let canOpenMessages: Bool
  let onProfileTapped: () -> Void
  let onMessagesTapped: () -> Void
  let content: () -> Content

  init(
    title: AppHeaderTitle,
    profile: UserProfile?,
    profileLoadError: String?,
    canOpenMessages: Bool,
    onProfileTapped: @escaping () -> Void,
    onMessagesTapped: @escaping () -> Void,
    @ViewBuilder content: @escaping () -> Content
  ) {
    self.title = title
    self.profile = profile
    self.profileLoadError = profileLoadError
    self.canOpenMessages = canOpenMessages
    self.onProfileTapped = onProfileTapped
    self.onMessagesTapped = onMessagesTapped
    self.content = content
  }

  var body: some View {
    VStack(spacing: 0) {
      AppHeader(
        title: title,
        profile: profile,
        profileLoadError: profileLoadError,
        canOpenMessages: canOpenMessages,
        onProfileTapped: onProfileTapped,
        onMessagesTapped: onMessagesTapped
      )

      content()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .background(theme.bg)
  }
}

private struct AppHeader: View {
  @Environment(\.theme) private var theme
  let title: AppHeaderTitle
  let profile: UserProfile?
  let profileLoadError: String?
  let canOpenMessages: Bool
  let onProfileTapped: () -> Void
  let onMessagesTapped: () -> Void

  var body: some View {
    VStack(spacing: 0) {
      ZStack {
        centerTitle
          .frame(maxWidth: 180)
          .padding(.horizontal, 58)

        HStack {
          Button(action: onProfileTapped) {
            HeaderAvatar(url: profile?.avatarUrl ?? profile?.avatarUrlLg, size: DesignSystem.AvatarSize.small)
              .contentShape(Circle())
          }
          .buttonStyle(.plain)
          .accessibilityLabel(profile == nil && profileLoadError != nil ? "Open profile menu. Profile unavailable." : "Open profile menu")

          Spacer()

          Button(action: onMessagesTapped) {
            Image("MessagesIcon")
              .resizable()
              .scaledToFit()
              .frame(width: 21, height: 23)
              .foregroundStyle(canOpenMessages ? theme.text : theme.textTertiary)
              .frame(width: 42, height: 42)
              .contentShape(Circle())
          }
          .buttonStyle(.plain)
          .disabled(!canOpenMessages)
          .accessibilityLabel("Messages")
        }
      }
      .frame(height: 64)
      .padding(.horizontal, 16)

      Divider()
    }
    .background(theme.bg)
  }

  @ViewBuilder
  private var centerTitle: some View {
    switch title {
    case .logo:
      Text(AppConstants.appName)
        .font(.appWordmark)
        .foregroundStyle(theme.text)
        .lineLimit(1)
        .minimumScaleFactor(0.82)
        .accessibilityAddTraits(.isHeader)
    case .text(let value):
      Text(value)
        .font(.appScreenTitle)
        .foregroundStyle(theme.text)
        .lineLimit(1)
        .minimumScaleFactor(0.82)
        .accessibilityAddTraits(.isHeader)
    }
  }
}

private struct HeaderAvatar: View {
  @Environment(\.theme) private var theme
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
            .fill(theme.fill)
          Image(systemName: "person.fill")
            .font(.system(size: size * 0.42, weight: .semibold))
            .foregroundStyle(theme.textTertiary)
        }
      }
    }
    .frame(width: size, height: size)
    .clipShape(Circle())
    .overlay {
      Circle()
        .stroke(theme.fillStrong, lineWidth: 1)
    }
  }
}

private struct ProfileSidebar: View {
  @Environment(\.theme) private var theme
  let profile: UserProfile?
  let profileLoadError: String?
  let width: CGFloat
  let onItemTapped: (ProfileSidebarItem) -> Void

  private var displayName: String {
    let trimmed = profile?.displayName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    return trimmed.isEmpty ? username : trimmed
  }

  private var username: String {
    guard let value = profile?.username, !value.isEmpty else {
      return "35mm"
    }

    return "@\(value)"
  }

  private var relationshipSummary: String? {
    if let profile {
      return "\(profile.followerCount.compactFormatted) followers · \(profile.followingCount.compactFormatted) following"
    }

    if profileLoadError != nil {
      return "Profile unavailable"
    }

    return nil
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      VStack(alignment: .leading, spacing: 12) {
        HeaderAvatar(url: profile?.avatarUrl ?? profile?.avatarUrlLg, size: DesignSystem.AvatarSize.large)
          .padding(.bottom, 2)

        VStack(alignment: .leading, spacing: 4) {
          Text(displayName)
            .font(.title3.weight(.bold))
            .foregroundStyle(theme.text)
            .lineLimit(1)
            .minimumScaleFactor(0.72)

          Text(username)
            .font(.subheadline)
            .foregroundStyle(theme.textSecondary)
            .lineLimit(1)
            .minimumScaleFactor(0.82)

          if let relationshipSummary {
            Text(relationshipSummary)
              .font(.footnote)
              .foregroundStyle(theme.textSecondary)
              .lineLimit(2)
              .padding(.top, 2)
          }
        }
      }
      .padding(.top, 58)
      .padding(.horizontal, 22)
      .padding(.bottom, 22)

      VStack(alignment: .leading, spacing: 0) {
        ForEach(ProfileSidebarItem.primaryItems) { item in
          Button {
            onItemTapped(item)
          } label: {
            ProfileSidebarRow(item: item)
          }
          .buttonStyle(.plain)
        }
      }
      .padding(.horizontal, 22)

      Divider()
        .padding(.horizontal, 22)
        .padding(.vertical, 18)

      VStack(alignment: .leading, spacing: 0) {
        ForEach(ProfileSidebarItem.secondaryItems) { item in
          Button {
            onItemTapped(item)
          } label: {
            ProfileSidebarRow(item: item, size: .compact)
          }
          .buttonStyle(.plain)
        }
      }
      .padding(.horizontal, 22)

      Spacer(minLength: 0)
    }
    .frame(width: width)
    .frame(maxHeight: .infinity, alignment: .leading)
    .background(theme.bg)
    .shadow(color: .black.opacity(0.16), radius: 24, x: 8, y: 0)
    .ignoresSafeArea()
  }
}

private struct ProfileSidebarRow: View {
  @Environment(\.theme) private var theme
  enum Size {
    case regular
    case compact
  }

  let item: ProfileSidebarItem
  var size: Size = .regular

  private var font: Font {
    size == .regular ? .appRowLabel : .appRowLabelCompact
  }

  private var iconSize: CGFloat {
    size == .regular ? 21 : 18
  }

  private var rowHeight: CGFloat {
    size == .regular ? 50 : 44
  }

  var body: some View {
    HStack(spacing: 18) {
      item.icon(size: iconSize, weight: .medium)
        .foregroundStyle(theme.text)
        .frame(width: 30)

      Text(item.title)
        .font(font)
        .foregroundStyle(theme.text)
        .lineLimit(1)
        .minimumScaleFactor(0.72)
    }
    .frame(height: rowHeight)
    .accessibilityElement(children: .combine)
  }
}

private struct AppTabPlaceholder: View {
  @Environment(\.theme) private var theme
  let message: String

  var body: some View {
    Text(message)
      .font(.subheadline.weight(.medium))
      .foregroundStyle(theme.textSecondary)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

private enum AppTab: Hashable, CaseIterable {
  case home
  case create
  case activity

  func icon(isSelected: Bool) -> Image {
    switch self {
    case .home:
      return Image(systemName: isSelected ? "house.fill" : "house")
    case .create:
      return Image(systemName: "plus.circle")
    case .activity:
      return Image(systemName: isSelected ? "bell.fill" : "bell")
    }
  }

  var accessibilityLabel: String {
    switch self {
    case .home:
      return "Home"
    case .create:
      return "Create"
    case .activity:
      return "Activity"
    }
  }

  var headerTitle: String {
    switch self {
    case .home:
      return AppConstants.appName
    case .create:
      return "Create"
    case .activity:
      return "Notifications"
    }
  }
}

private enum ComposerPostOption: String, CaseIterable, Identifiable {
  case post
  case review
  case log

  var id: String { rawValue }

  var title: String {
    switch self {
    case .post:
      return "Post"
    case .review:
      return "Review"
    case .log:
      return "Log"
    }
  }

  var systemImage: String {
    switch self {
    case .post:
      return "text.bubble"
    case .review:
      return "star.leadinghalf.filled"
    case .log:
      return "film"
    }
  }

  var postType: PostType {
    switch self {
    case .post:
      .text
    case .review:
      .review
    case .log:
      .log
    }
  }
}

private struct PostComposerView: View {
  @Environment(\.theme) private var theme
  @Environment(\.dismiss) private var dismiss
  @EnvironmentObject private var env: AppEnvironment
  @FocusState private var isBodyFocused: Bool

  @State private var profile: UserProfile?
  @State private var bodyText = ""
  @State private var topic = ""
  @State private var selectedOption: ComposerPostOption = .post
  @State private var isSubmitting = false
  @State private var isShowingSubmitError = false
  @State private var submitErrorMessage = ""

  let quotedPost: FeedPost?

  private var username: String {
    profile?.username ?? "35mm.user"
  }

  private var avatarUrl: String? {
    profile?.avatarUrl ?? profile?.avatarUrlLg
  }

  private var canPost: Bool {
    !bodyText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isSubmitting
  }

  var body: some View {
    ZStack(alignment: .top) {
      theme.fillStrong
        .ignoresSafeArea()

      VStack(spacing: 0) {
        header
        Divider()
        composerBody
      }
      .background(theme.bg)
      .clipShape(
        UnevenRoundedRectangle(
          topLeadingRadius: 24,
          bottomLeadingRadius: 0,
          bottomTrailingRadius: 0,
          topTrailingRadius: 24,
          style: .continuous
        )
      )
      .ignoresSafeArea(edges: .bottom)
      .padding(.top, 8)
    }
    .safeAreaInset(edge: .bottom) {
      composerFooter
        .background(theme.bg)
    }
    .task {
      await loadProfile()
      try? await Task.sleep(for: .milliseconds(220))
      isBodyFocused = true
    }
    .alert("Couldn't publish post", isPresented: $isShowingSubmitError) {
      Button("OK", role: .cancel) {}
    } message: {
      Text(submitErrorMessage)
    }
  }

  private var header: some View {
    ZStack {
      Text(quotedPost == nil ? "New thread" : "Quote post")
        .font(.headline)
        .foregroundStyle(theme.text)
        .lineLimit(1)
        .minimumScaleFactor(0.82)

      HStack(spacing: 12) {
        Button {
          dismiss()
        } label: {
          Text("Cancel")
            .font(.body)
            .foregroundStyle(theme.text)
            .lineLimit(1)
        }
        .buttonStyle(.plain)

        Spacer()

        HStack(spacing: 12) {
          Button {
            selectedOption = .review
          } label: {
            Image(systemName: "doc.text")
              .font(.system(size: 19, weight: .medium))
              .foregroundStyle(theme.text)
          }
          .buttonStyle(.plain)
          .accessibilityLabel("Draft options")

          Button {
            selectedOption = .post
          } label: {
            Image(systemName: "ellipsis.circle")
              .font(.system(size: 20, weight: .medium))
              .foregroundStyle(theme.text)
          }
          .buttonStyle(.plain)
          .accessibilityLabel("More composer actions")
        }
      }
    }
    .frame(height: 56)
    .padding(.horizontal, 18)
  }

  private var composerBody: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .top, spacing: 10) {
        VStack(spacing: 8) {
          ComposerAvatar(url: avatarUrl, size: 42)

          Rectangle()
            .fill(theme.fillStrong)
            .frame(width: 2, height: 64)

          Image(systemName: "person.circle.fill")
            .font(.system(size: 18))
            .foregroundStyle(theme.fillStrong)
        }

        VStack(alignment: .leading, spacing: 5) {
          HStack(spacing: 6) {
            Text(username)
              .font(.appAuthorName)
              .foregroundStyle(theme.text)

            Image(systemName: "chevron.right")
              .font(.system(size: 12, weight: .semibold))
              .foregroundStyle(theme.textTertiary)

            TextField("Add a topic", text: $topic)
              .font(.subheadline.weight(.medium))
              .foregroundStyle(theme.text)
              .textInputAutocapitalization(.words)
          }

          ZStack(alignment: .topLeading) {
            if bodyText.isEmpty {
              Text("What's new?")
                .font(.body)
                .foregroundStyle(theme.textTertiary)
                .padding(.top, 7)
                .padding(.leading, 4)
            }

            TextEditor(text: $bodyText)
              .font(.body)
              .foregroundStyle(theme.text)
              .scrollContentBackground(.hidden)
              .frame(minHeight: 64, maxHeight: 130)
              .focused($isBodyFocused)
              .textInputAutocapitalization(.sentences)
          }

          composerTools

          if let quotedPost {
            QuotedPostCard(
              post: QuotedFeedPost(post: quotedPost),
              unavailable: false,
              isCompact: true
            )
            .allowsHitTesting(false)
            .padding(.top, 8)
          }

          HStack(spacing: 12) {
            Image(systemName: "person.circle.fill")
              .font(.system(size: 17))
              .foregroundStyle(theme.fillStrong)

            Text("Add to thread")
              .font(.subheadline.weight(.medium))
              .foregroundStyle(theme.fillStrong)
          }
          .padding(.top, 2)
        }
      }
      .padding(.horizontal, 18)
      .padding(.top, 16)

      Spacer(minLength: 0)
    }
  }

  private var composerTools: some View {
    HStack(spacing: 22) {
      composerTool("photo")
      composerTool("gift")
      composerTool("music.note")
      composerTool("list.bullet.rectangle")
        .overlay(alignment: .topTrailing) {
          Circle()
            .fill(theme.text)
            .frame(width: 8, height: 8)
            .offset(x: 2, y: -1)
        }
      composerTool("ellipsis.circle")
    }
    .foregroundStyle(theme.textTertiary)
    .padding(.top, 4)
  }

  private func composerTool(_ systemImage: String) -> some View {
    Button {
      // TODO: Wire composer attachment action.
    } label: {
      Image(systemName: systemImage)
        .font(.system(size: 20, weight: .semibold))
        .frame(width: 24, height: 30)
    }
    .buttonStyle(.plain)
  }

  private var composerFooter: some View {
    HStack(spacing: 10) {
      HStack(spacing: 6) {
        Image(systemName: "slider.horizontal.3")
          .font(.system(size: 15, weight: .semibold))
        Text("Post Options")
          .font(.caption.weight(.semibold))
          .lineLimit(1)
          .fixedSize(horizontal: true, vertical: false)
      }
      .foregroundStyle(theme.textTertiary)
      .layoutPriority(1)

      Spacer(minLength: 4)

      ComposerOptionTabs(selectedOption: $selectedOption)

      Button(action: submitPost) {
        Group {
          if isSubmitting {
            ProgressView()
              .tint(.white)
          } else {
            Text(selectedOption.title)
          }
        }
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(theme.bg)
          .frame(width: 64, height: 38)
          .background(canPost ? theme.text : theme.fillStrong, in: Capsule())
      }
      .buttonStyle(.plain)
      .disabled(!canPost)
    }
    .padding(.horizontal, 12)
    .padding(.top, 8)
    .padding(.bottom, 8)
  }

  private func loadProfile() async {
    guard profile == nil else { return }

    do {
      profile = try await env.apiClient.request(.getMe())
    } catch {
      profile = nil
    }
  }

  private func submitPost() {
    let trimmedBody = bodyText.trimmingCharacters(in: .whitespacesAndNewlines)
    let trimmedTopic = topic.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmedBody.isEmpty, !isSubmitting else { return }

    isSubmitting = true
    Task {
      defer { isSubmitting = false }

      do {
        let createdPost: FeedPost = try await env.apiClient.request(
          .createPost(
            type: selectedOption.postType,
            headline: trimmedTopic.isEmpty ? nil : trimmedTopic,
            body: trimmedBody,
            quotedPostId: quotedPost?.id
          )
        )
        env.completeComposer(with: createdPost)
      } catch {
        submitErrorMessage = error.localizedDescription
        isShowingSubmitError = true
      }
    }
  }
}

private struct ComposerAvatar: View {
  @Environment(\.theme) private var theme
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
            .fill(theme.fill)
          Image(systemName: "person.fill")
            .font(.system(size: size * 0.42, weight: .semibold))
            .foregroundStyle(theme.textTertiary)
        }
      }
    }
    .frame(width: size, height: size)
    .clipShape(Circle())
    .overlay {
      Circle()
        .stroke(theme.fillStrong, lineWidth: 1)
    }
  }
}

private struct ComposerOptionTabs: View {
  @Environment(\.theme) private var theme
  @Binding var selectedOption: ComposerPostOption

  var body: some View {
    HStack(spacing: 0) {
      ForEach(ComposerPostOption.allCases) { option in
        Button {
          withAnimation(.spring(response: 0.24, dampingFraction: 0.86)) {
            selectedOption = option
          }
        } label: {
          Image(systemName: option.systemImage)
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(selectedOption == option ? theme.text : theme.textTertiary)
            .frame(width: 36, height: 36)
            .background {
              if selectedOption == option {
                Capsule()
                  .fill(theme.bg)
                  .shadow(color: .black.opacity(0.08), radius: 4, y: 2)
              }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(option.title)
      }
    }
    .padding(4)
    .background(theme.fillStrong, in: Capsule())
  }
}

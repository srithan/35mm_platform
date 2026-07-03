import SwiftUI
import UIKit

struct MainTabView: View {
  @EnvironmentObject private var env: AppEnvironment
  @State private var selectedTab: AppTab = .home
  @State private var previousTab: AppTab = .home
  @State private var isTabBarVisible = true
  @State private var isShowingComposer = false
  @State private var isShowingProfileSidebar = false
  @State private var homePath: [AppRoute] = []
  @State private var activityPath: [AppRoute] = []
  @State private var profile: UserProfile?
  @State private var profileLoadError: String?

  init() {
    Self.configureTabBarAppearance()
  }

  var body: some View {
    GeometryReader { proxy in
      let sidebarWidth = min(proxy.size.width * 0.78, 320)

      ZStack(alignment: .leading) {
        tabContent
          .disabled(isShowingProfileSidebar)
          .offset(x: isShowingProfileSidebar ? min(sidebarWidth * 0.28, 96) : 0)
          .scaleEffect(isShowingProfileSidebar ? 0.98 : 1, anchor: .trailing)

        if isShowingProfileSidebar {
          Color.black.opacity(0.18)
            .ignoresSafeArea()
            .contentShape(Rectangle())
            .onTapGesture {
              closeProfileSidebar()
            }
            .transition(.opacity)
        }

        ProfileSidebar(
          profile: profile,
          profileLoadError: profileLoadError,
          width: sidebarWidth
        )
        .offset(x: isShowingProfileSidebar ? 0 : -sidebarWidth)
        .allowsHitTesting(isShowingProfileSidebar)
        .accessibilityHidden(!isShowingProfileSidebar)
      }
      .animation(.spring(response: 0.32, dampingFraction: 0.86), value: isShowingProfileSidebar)
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
        Image(systemName: AppTab.home.systemImage)
        Text(AppTab.home.accessibilityLabel)
      }
      .tag(AppTab.home)

      Color.clear
        .tabItem {
          Image(systemName: AppTab.create.systemImage)
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
          AppTabPlaceholder(message: "Notifications - coming soon")
        }
        .navigationDestination(for: AppRoute.self) { route in
          destination(for: route)
        }
      }
      .tabItem {
        Image(systemName: AppTab.activity.systemImage)
        Text(AppTab.activity.accessibilityLabel)
      }
      .badge("")
      .tag(AppTab.activity)
    }
    .tint(.black)
    .toolbar(isTabBarVisible ? .visible : .hidden, for: .tabBar)
    .fullScreenCover(isPresented: $isShowingComposer) {
      PostComposerView()
        .environmentObject(env)
    }
    .onChange(of: selectedTab) { oldValue, newValue in
      if newValue == .create {
        isShowingComposer = true
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
          .toolbar(.hidden, for: .tabBar)
      } else {
        ProgressView()
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      }
    }
  }

  private var currentUserId: String? {
    if case .authenticated(let userId) = env.authManager.authState {
      return userId
    }

    return profile?.userId
  }

  private func openProfileSidebar() {
    withAnimation(.spring(response: 0.32, dampingFraction: 0.86)) {
      isShowingProfileSidebar = true
    }
  }

  private func closeProfileSidebar() {
    withAnimation(.spring(response: 0.32, dampingFraction: 0.86)) {
      isShowingProfileSidebar = false
    }
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

  private func loadProfile() async {
    guard profile == nil else { return }

    do {
      profile = try await env.apiClient.request(.getMe())
      profileLoadError = nil
    } catch {
      profileLoadError = error.localizedDescription
    }
  }

  private static func configureTabBarAppearance() {
    let appearance = UITabBarAppearance()
    appearance.configureWithOpaqueBackground()
    appearance.backgroundColor = .white
    appearance.shadowColor = UIColor.black.withAlphaComponent(0.08)

    let itemAppearance = UITabBarItemAppearance()
    itemAppearance.normal.iconColor = UIColor.black.withAlphaComponent(0.55)
    itemAppearance.normal.titleTextAttributes = [.foregroundColor: UIColor.black.withAlphaComponent(0.55)]
    itemAppearance.selected.iconColor = .black
    itemAppearance.selected.titleTextAttributes = [.foregroundColor: UIColor.black]

    appearance.stackedLayoutAppearance = itemAppearance
    appearance.inlineLayoutAppearance = itemAppearance
    appearance.compactInlineLayoutAppearance = itemAppearance

    UITabBar.appearance().standardAppearance = appearance
    UITabBar.appearance().scrollEdgeAppearance = appearance
    UITabBar.appearance().tintColor = .black
    UITabBar.appearance().unselectedItemTintColor = UIColor.black.withAlphaComponent(0.55)
  }
}

private enum AppHeaderTitle: Equatable {
  case logo
  case text(String)
}

private enum AppRoute: Hashable {
  case messages
}

private struct AppTabRootScreen<Content: View>: View {
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
    .background(Color(.systemBackground))
  }
}

private struct AppHeader: View {
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
            HeaderAvatar(url: profile?.avatarUrl ?? profile?.avatarUrlLg, size: 38)
              .contentShape(Circle())
          }
          .buttonStyle(.plain)
          .accessibilityLabel(profile == nil && profileLoadError != nil ? "Open profile menu. Profile unavailable." : "Open profile menu")

          Spacer()

          Button(action: onMessagesTapped) {
            Image(systemName: "bubble.left.and.bubble.right")
              .font(.system(size: 21, weight: .bold))
              .foregroundStyle(canOpenMessages ? Color(.label) : Color(.tertiaryLabel))
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
    .background(Color(.systemBackground))
  }

  @ViewBuilder
  private var centerTitle: some View {
    switch title {
    case .logo:
      Text(AppConstants.appName)
        .font(.system(size: 27, weight: .black, design: .serif))
        .foregroundStyle(Color(.label))
        .lineLimit(1)
        .minimumScaleFactor(0.82)
        .accessibilityAddTraits(.isHeader)
    case .text(let value):
      Text(value)
        .font(.system(size: 22, weight: .black, design: .rounded))
        .foregroundStyle(Color(.label))
        .lineLimit(1)
        .minimumScaleFactor(0.82)
        .accessibilityAddTraits(.isHeader)
    }
  }
}

private struct HeaderAvatar: View {
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

private struct ProfileSidebar: View {
  let profile: UserProfile?
  let profileLoadError: String?
  let width: CGFloat

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

  private var subtitle: String? {
    if let roleContext = profile?.roleContext?.trimmingCharacters(in: .whitespacesAndNewlines),
      !roleContext.isEmpty
    {
      return roleContext
    }

    if let filmsLoggedCount = profile?.filmsLoggedCount {
      return "\(filmsLoggedCount.compactFormatted) films logged"
    }

    if profileLoadError != nil {
      return "Profile unavailable"
    }

    return nil
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      VStack(alignment: .leading, spacing: 12) {
        HeaderAvatar(url: profile?.avatarUrl ?? profile?.avatarUrlLg, size: 48)
          .padding(.bottom, 2)

        VStack(alignment: .leading, spacing: 4) {
          Text(displayName)
            .font(.system(size: 22, weight: .black, design: .rounded))
            .foregroundStyle(Color(.label))
            .lineLimit(1)
            .minimumScaleFactor(0.72)

          Text(username)
            .font(.system(size: 15, weight: .bold, design: .rounded))
            .foregroundStyle(Color(.secondaryLabel))
            .lineLimit(1)
            .minimumScaleFactor(0.82)

          if let subtitle {
            Text(subtitle)
              .font(.system(size: 14, weight: .semibold, design: .rounded))
              .foregroundStyle(Color(.secondaryLabel))
              .lineLimit(2)
              .padding(.top, 2)
          }
        }
      }
      .padding(.top, 58)
      .padding(.horizontal, 22)
      .padding(.bottom, 22)

      VStack(alignment: .leading, spacing: 0) {
        ProfileSidebarRow(systemImage: "person", title: "Profile")
        ProfileSidebarRow(systemImage: "seal", title: "Premium")
        ProfileSidebarRow(systemImage: "bookmark", title: "History")
        ProfileSidebarRow(systemImage: "person.2", title: "Communities")
        ProfileSidebarRow(systemImage: "arrow.down.to.line", title: "Offline")
        ProfileSidebarRow(systemImage: "rectangle.on.rectangle", title: "Lists")
        ProfileSidebarRow(systemImage: "mic.circle", title: "Spaces")
        ProfileSidebarRow(systemImage: "paperplane", title: "Creator Studio")
      }
      .padding(.horizontal, 22)

      Divider()
        .padding(.horizontal, 22)
        .padding(.vertical, 18)

      VStack(alignment: .leading, spacing: 0) {
        ProfileSidebarRow(systemImage: "gearshape", title: "Settings and privacy", size: .compact)
        ProfileSidebarRow(systemImage: "questionmark.circle", title: "Help Center", size: .compact)
      }
      .padding(.horizontal, 22)

      Spacer(minLength: 0)
    }
    .frame(width: width)
    .frame(maxHeight: .infinity, alignment: .leading)
    .background(Color(.systemBackground))
    .shadow(color: .black.opacity(0.16), radius: 24, x: 8, y: 0)
    .ignoresSafeArea()
  }
}

private struct ProfileSidebarRow: View {
  enum Size {
    case regular
    case compact
  }

  let systemImage: String
  let title: String
  var size: Size = .regular

  private var fontSize: CGFloat {
    size == .regular ? 19 : 16
  }

  private var iconSize: CGFloat {
    size == .regular ? 21 : 18
  }

  private var rowHeight: CGFloat {
    size == .regular ? 50 : 44
  }

  var body: some View {
    HStack(spacing: 18) {
      Image(systemName: systemImage)
        .font(.system(size: iconSize, weight: .semibold))
        .foregroundStyle(Color(.label))
        .frame(width: 30)

      Text(title)
        .font(.system(size: fontSize, weight: .black, design: .rounded))
        .foregroundStyle(Color(.label))
        .lineLimit(1)
        .minimumScaleFactor(0.72)
    }
    .frame(height: rowHeight)
    .accessibilityElement(children: .combine)
  }
}

private struct AppTabPlaceholder: View {
  let message: String

  var body: some View {
    Text(message)
      .font(.system(size: 16, weight: .semibold, design: .rounded))
      .foregroundStyle(Color(.secondaryLabel))
      .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

private enum AppTab: Hashable, CaseIterable {
  case home
  case create
  case activity

  var systemImage: String {
    switch self {
    case .home:
      return "house.fill"
    case .create:
      return "plus.circle"
    case .activity:
      return "bell"
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
}

private struct PostComposerView: View {
  @Environment(\.dismiss) private var dismiss
  @EnvironmentObject private var env: AppEnvironment
  @FocusState private var isBodyFocused: Bool

  @State private var profile: UserProfile?
  @State private var bodyText = ""
  @State private var topic = ""
  @State private var selectedOption: ComposerPostOption = .post

  private var username: String {
    profile?.username ?? "35mm.user"
  }

  private var avatarUrl: String? {
    profile?.avatarUrl ?? profile?.avatarUrlLg
  }

  private var canPost: Bool {
    !bodyText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }

  var body: some View {
    ZStack(alignment: .top) {
      Color(.systemGray4)
        .ignoresSafeArea()

      VStack(spacing: 0) {
        header
        Divider()
        composerBody
      }
      .background(Color.white)
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
        .background(Color.white)
    }
    .task {
      await loadProfile()
      try? await Task.sleep(nanoseconds: 220_000_000)
      isBodyFocused = true
    }
  }

  private var header: some View {
    ZStack {
      Text("New thread")
        .font(.system(size: 17, weight: .bold, design: .rounded))
        .foregroundStyle(.black)
        .lineLimit(1)
        .minimumScaleFactor(0.82)

      HStack(spacing: 12) {
        Button {
          dismiss()
        } label: {
          Text("Cancel")
            .font(.system(size: 16, weight: .semibold, design: .rounded))
            .foregroundStyle(.black)
            .lineLimit(1)
        }
        .buttonStyle(.plain)

        Spacer()

        HStack(spacing: 12) {
          Button {
            selectedOption = .review
          } label: {
            Image(systemName: "doc.text")
              .font(.system(size: 19, weight: .semibold))
              .foregroundStyle(.black)
          }
          .buttonStyle(.plain)
          .accessibilityLabel("Draft options")

          Button {
            selectedOption = .post
          } label: {
            Image(systemName: "ellipsis.circle")
              .font(.system(size: 20, weight: .semibold))
              .foregroundStyle(.black)
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
            .fill(Color(.systemGray5))
            .frame(width: 2, height: 64)

          Image(systemName: "person.circle.fill")
            .font(.system(size: 18))
            .foregroundStyle(Color(.systemGray5))
        }

        VStack(alignment: .leading, spacing: 5) {
          HStack(spacing: 6) {
            Text(username)
              .font(.system(size: 16, weight: .bold, design: .rounded))
              .foregroundStyle(.black)

            Image(systemName: "chevron.right")
              .font(.system(size: 12, weight: .bold))
              .foregroundStyle(Color(.systemGray2))

            TextField("Add a topic", text: $topic)
              .font(.system(size: 16, weight: .semibold, design: .rounded))
              .foregroundStyle(.black)
              .textInputAutocapitalization(.words)
          }

          ZStack(alignment: .topLeading) {
            if bodyText.isEmpty {
              Text("What's new?")
                .font(.system(size: 17, weight: .regular, design: .rounded))
                .foregroundStyle(Color(.systemGray2))
                .padding(.top, 7)
                .padding(.leading, 4)
            }

            TextEditor(text: $bodyText)
              .font(.system(size: 17, weight: .regular, design: .rounded))
              .foregroundStyle(.black)
              .scrollContentBackground(.hidden)
              .frame(minHeight: 64, maxHeight: 130)
              .focused($isBodyFocused)
              .textInputAutocapitalization(.sentences)
          }

          composerTools

          HStack(spacing: 12) {
            Image(systemName: "person.circle.fill")
              .font(.system(size: 17))
              .foregroundStyle(Color(.systemGray5))

            Text("Add to thread")
              .font(.system(size: 16, weight: .semibold, design: .rounded))
              .foregroundStyle(Color(.systemGray4))
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
            .fill(.black)
            .frame(width: 8, height: 8)
            .offset(x: 2, y: -1)
        }
      composerTool("ellipsis.circle")
    }
    .foregroundStyle(Color(.systemGray2))
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
          .font(.system(size: 15, weight: .bold))
        Text("Post Options")
          .font(.system(size: 12, weight: .bold, design: .rounded))
          .lineLimit(1)
          .fixedSize(horizontal: true, vertical: false)
      }
      .foregroundStyle(Color(.systemGray2))
      .layoutPriority(1)

      Spacer(minLength: 4)

      ComposerOptionTabs(selectedOption: $selectedOption)

      Button {
        // TODO: Submit composer payload when native create-post API is wired.
        dismiss()
      } label: {
        Text(selectedOption.title)
          .font(.system(size: 14, weight: .bold, design: .rounded))
          .foregroundStyle(.white)
          .frame(width: 64, height: 38)
          .background(canPost ? Color.black : Color(.systemGray3), in: Capsule())
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
}

private struct ComposerAvatar: View {
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

private struct ComposerOptionTabs: View {
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
            .font(.system(size: 15, weight: .black))
            .foregroundStyle(selectedOption == option ? .black : Color(.systemGray2))
            .frame(width: 36, height: 36)
            .background {
              if selectedOption == option {
                Capsule()
                  .fill(.white)
                  .shadow(color: .black.opacity(0.08), radius: 4, y: 2)
              }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(option.title)
      }
    }
    .padding(4)
    .background(Color(.systemGray4), in: Capsule())
  }
}

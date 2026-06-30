import SwiftUI
import UIKit

struct MainTabView: View {
  @EnvironmentObject private var env: AppEnvironment
  @State private var selectedTab: AppTab = .home
  @State private var previousTab: AppTab = .home
  @State private var isTabBarVisible = true
  @State private var isShowingComposer = false

  init() {
    Self.configureTabBarAppearance()
  }

  var body: some View {
    TabView(selection: $selectedTab) {
      NavigationStack {
        FeedView(apiClient: env.apiClient) { direction in
          guard selectedTab == .home else { return }
          withAnimation(.spring(response: 0.28, dampingFraction: 0.86)) {
            isTabBarVisible = direction == .up
          }
        }
      }
      .tabItem {
        Image(systemName: AppTab.home.systemImage)
        Text(AppTab.home.accessibilityLabel)
      }
      .tag(AppTab.home)

      NavigationStack {
        if case .authenticated(let userId) = env.authManager.authState {
          ChatInboxView(apiClient: env.apiClient, currentUserId: userId)
        } else {
          ProgressView()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
      }
      .tabItem {
        Image(systemName: AppTab.messages.systemImage)
        Text(AppTab.messages.accessibilityLabel)
      }
      .tag(AppTab.messages)

      Color.clear
        .tabItem {
          Image(systemName: AppTab.create.systemImage)
          Text(AppTab.create.accessibilityLabel)
        }
        .tag(AppTab.create)

      NavigationStack {
        Text("Notifications - coming soon")
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      }
      .tabItem {
        Image(systemName: AppTab.activity.systemImage)
        Text(AppTab.activity.accessibilityLabel)
      }
      .badge("")
      .tag(AppTab.activity)

      NavigationStack {
        Text("Profile - coming soon")
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      }
      .tabItem {
        Image(systemName: AppTab.profile.systemImage)
        Text(AppTab.profile.accessibilityLabel)
      }
      .tag(AppTab.profile)
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

private enum AppTab: Hashable, CaseIterable {
  case home
  case messages
  case create
  case activity
  case profile

  var systemImage: String {
    switch self {
    case .home:
      return "film"
    case .messages:
      return "bubble.left.and.bubble.right"
    case .create:
      return "plus.circle"
    case .activity:
      return "bell"
    case .profile:
      return "person.crop.circle"
    }
  }

  var accessibilityLabel: String {
    switch self {
    case .home:
      return "Home"
    case .messages:
      return "Messages"
    case .create:
      return "Create"
    case .activity:
      return "Activity"
    case .profile:
      return "Profile"
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

import ClerkKit
import Foundation

@MainActor
final class AppEnvironment: ObservableObject {
  let apiClient: APIClient
  let authManager: AuthManager
  let sessionViewModels: AppSessionViewModels
  /// Survives Settings navigation destination recreation when the theme
  /// environment changes (a new `@StateObject` per push was re-fetching
  /// settings and flashing the stale server theme over the optimistic one).
  let settingsViewModel: SettingsViewModel

  @Published var isComposerPresented = false
  @Published private(set) var composerQuote: FeedPost?
  @Published private(set) var lastCreatedPost: FeedPost?

  init() {
    let clerk = Clerk.configure(publishableKey: AppConstants.clerkPublishableKey)
    let manager = AuthManager(clerk: clerk)

    authManager = manager
    apiClient = APIClient(
      baseURL: AppConstants.apiBaseURLValue,
      tokenProvider: manager
    )
    sessionViewModels = AppSessionViewModels(apiClient: apiClient)
    settingsViewModel = SettingsViewModel(apiClient: apiClient)

    manager.start(apiClient: apiClient)
  }

  func presentComposer(quoting post: FeedPost? = nil) {
    composerQuote = post
    isComposerPresented = true
  }

  func completeComposer(with post: FeedPost) {
    lastCreatedPost = post
    isComposerPresented = false
  }

  func clearComposer() {
    composerQuote = nil
  }
}

@MainActor
final class AppSessionViewModels {
  private let apiClient: APIClient
  private var activeUserId: String?
  private var feedViewModel: FeedViewModel?
  private var bookmarksViewModel: BookmarksViewModel?
  private var notificationViewModels: AppNotificationViewModels?
  private var profileViewModels: [String: ProfileViewModel] = [:]
  private var chatInboxViewModels: [String: ChatInboxViewModel] = [:]
  private var chatThreadViewModels: [String: ChatThreadViewModel] = [:]

  init(apiClient: APIClient) {
    self.apiClient = apiClient
  }

  func feed(currentUserId: String?) -> FeedViewModel {
    prepareForUser(currentUserId)
    if let feedViewModel {
      return feedViewModel
    }
    let model = FeedViewModel(apiClient: apiClient)
    feedViewModel = model
    return model
  }

  func bookmarks(currentUserId: String?) -> BookmarksViewModel {
    prepareForUser(currentUserId)
    if let bookmarksViewModel {
      return bookmarksViewModel
    }
    let model = BookmarksViewModel(apiClient: apiClient)
    bookmarksViewModel = model
    return model
  }

  func notifications(currentUserId: String?) -> AppNotificationViewModels {
    prepareForUser(currentUserId)
    if let notificationViewModels {
      return notificationViewModels
    }
    let models = AppNotificationViewModels(apiClient: apiClient)
    notificationViewModels = models
    return models
  }

  func profile(username: String, currentUserId: String?) -> ProfileViewModel {
    prepareForUser(currentUserId)
    let normalizedUsername = username.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    if let model = profileViewModels[normalizedUsername] {
      return model
    }
    let model = ProfileViewModel(username: normalizedUsername, service: apiClient)
    profileViewModels[normalizedUsername] = model
    return model
  }

  func chatInbox(currentUserId: String) -> ChatInboxViewModel {
    prepareForUser(currentUserId)
    if let model = chatInboxViewModels[currentUserId] {
      return model
    }
    let model = ChatInboxViewModel(apiClient: apiClient, currentUserId: currentUserId)
    chatInboxViewModels[currentUserId] = model
    return model
  }

  func chatThread(thread: ChatThreadPreview, currentUserId: String) -> ChatThreadViewModel {
    prepareForUser(currentUserId)
    if let model = chatThreadViewModels[thread.id] {
      return model
    }
    let model = ChatThreadViewModel(
      thread: thread,
      apiClient: apiClient,
      currentUserId: currentUserId
    )
    chatThreadViewModels[thread.id] = model
    return model
  }

  private func prepareForUser(_ userId: String?) {
    guard activeUserId != userId else { return }
    activeUserId = userId
    feedViewModel = nil
    bookmarksViewModel = nil
    notificationViewModels = nil
    profileViewModels.removeAll()
    chatInboxViewModels.removeAll()
    chatThreadViewModels.removeAll()
  }
}

@MainActor
struct AppNotificationViewModels {
  let all: NotificationsViewModel
  let unread: NotificationsViewModel

  init(apiClient: APIClient) {
    all = NotificationsViewModel(apiClient: apiClient, filter: .all)
    unread = NotificationsViewModel(apiClient: apiClient, filter: .unread)
  }
}

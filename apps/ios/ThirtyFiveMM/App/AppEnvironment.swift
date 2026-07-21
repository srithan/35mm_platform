import ClerkKit
import Foundation

@MainActor
final class AppEnvironment: ObservableObject {
  let apiClient: APIClient
  let authManager: AuthManager

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

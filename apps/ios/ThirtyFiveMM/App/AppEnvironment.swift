import ClerkKit
import Foundation

@MainActor
final class AppEnvironment: ObservableObject {
  let apiClient: APIClient
  let authManager: AuthManager

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
}

import SwiftUI

struct RootView: View {
  @EnvironmentObject private var env: AppEnvironment

  var body: some View {
    RootContentView(authManager: env.authManager)
  }
}

private struct RootContentView: View {
  @ObservedObject var authManager: AuthManager

  var body: some View {
    switch authManager.authState {
    case .loading:
      ProgressView()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    case .signedOut:
      IntroView()
    case .onboarding:
      OnboardingCoordinator()
    case .authenticated:
      MainTabView()
    }
  }
}

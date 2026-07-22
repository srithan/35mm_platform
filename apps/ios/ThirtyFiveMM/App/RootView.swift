import SwiftUI

struct RootView: View {
  @EnvironmentObject private var env: AppEnvironment
  @ObservedObject private var themeManager = ThemeManager.shared

  var body: some View {
    RootContentView(authManager: env.authManager)
      .environment(\.theme, themeManager.palette)
      .tint(themeManager.palette.accent)
      // Do NOT also set `.preferredColorScheme` — it fights
      // `UIWindow.overrideUserInterfaceStyle` and flashes the old scheme.
      .grayscale(themeManager.theme.isMonochrome ? 1 : 0)
      .animation(nil, value: themeManager.snapshot)
      .background(themeManager.palette.bg.ignoresSafeArea())
      .onAppear {
        ThemeManager.applyInterfaceStyle(
          themeManager.theme,
          windowBackground: themeManager.palette.uiBg
        )
        ThemeManager.applyChrome(
          themeManager.palette,
          custom: themeManager.theme.isCustomPalette
        )
      }
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
    case .sessionUnavailable(let message):
      SessionUnavailableView(authManager: authManager, message: message)
    }
  }
}

private struct SessionUnavailableView: View {
  @ObservedObject var authManager: AuthManager
  let message: String

  var body: some View {
    VStack(spacing: 22) {
      Image(systemName: "wifi.exclamationmark")
        .font(.system(size: 42, weight: .bold))
        .foregroundStyle(AuthPalette.error)

      VStack(spacing: 8) {
        Text("Session paused")
          .font(.system(size: 32, weight: .black, design: .serif))
          .foregroundStyle(AuthPalette.ink)

        Text(message)
          .font(.system(size: 15, weight: .medium, design: .rounded))
          .foregroundStyle(AuthPalette.ink.opacity(0.64))
          .multilineTextAlignment(.center)
          .lineSpacing(4)
      }

      VStack(spacing: 12) {
        Button {
          Task {
            await authManager.retryAuthenticatedFlow()
          }
        } label: {
          Label("Retry", systemImage: "arrow.clockwise")
            .font(.system(size: 16, weight: .black, design: .rounded))
            .frame(maxWidth: .infinity)
            .frame(height: 56)
        }
        .buttonStyle(.plain)
        .foregroundStyle(.white)
        .background(AuthPalette.ink, in: Capsule())

        Button {
          Task {
            try? await authManager.signOut()
          }
        } label: {
          Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
            .font(.system(size: 15, weight: .bold, design: .rounded))
        }
        .buttonStyle(.plain)
        .foregroundStyle(AuthPalette.ink.opacity(0.68))
      }
      .padding(.top, 10)
    }
    .padding(.horizontal, 28)
    .frame(maxWidth: 430)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(AuthScreenBackground())
  }
}

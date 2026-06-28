import AppIntents
import ClerkKit
import SwiftUI

@main
struct ThirtyFiveMMApp: App {
  @StateObject private var env = AppEnvironment()

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(env)
        .environment(Clerk.shared)
    }
  }
}

import AppIntents
import ClerkKit
import Kingfisher
import SwiftUI

@main
struct ThirtyFiveMMApp: App {
  @StateObject private var env = AppEnvironment()

  init() {
    let cache = ImageCache.default
    cache.memoryStorage.config.totalCostLimit = 96 * 1024 * 1024
    cache.memoryStorage.config.countLimit = 1_200
    cache.diskStorage.config.sizeLimit = 512 * 1024 * 1024
    cache.diskStorage.config.expiration = .days(14)
  }

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(env)
        .environment(Clerk.shared)
    }
  }
}

import SwiftUI

struct BookmarkFailureView: View {
  let message: String
  let retry: () -> Void

  var body: some View {
    ContentUnavailableView {
      Label("Couldn’t load bookmarks", systemImage: "exclamationmark.triangle.fill")
    } description: {
      Text(message)
    } actions: {
      Button("Retry", systemImage: "arrow.clockwise", action: retry)
        .buttonStyle(.borderedProminent)
        .tint(.primary)
    }
  }
}

import SwiftUI

struct DiscoverSearchHistoryScreen: View {
  @Environment(\.theme) private var theme
  @Environment(\.dismiss) private var dismiss
  @ObservedObject var model: DiscoverSearchModel
  let onSelect: (String) -> Void

  var body: some View {
    VStack(spacing: 0) {
      HStack(spacing: 8) {
        Button("Back to search", systemImage: "chevron.backward") { dismiss() }
          .labelStyle(.iconOnly)
          .font(.title3.weight(.medium))
          .frame(width: 44, height: 44)
          .contentShape(Rectangle())

        Text("Recent searches")
          .font(.headline)
          .accessibilityAddTraits(.isHeader)
          .frame(maxWidth: .infinity, alignment: .leading)

        Button("Clear all") { model.clear() }
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(model.recent.isEmpty ? theme.textSecondary : theme.accent)
          .frame(minHeight: 44)
          .disabled(model.recent.isEmpty)
      }
      .buttonStyle(.plain)
      .foregroundStyle(theme.text)
      .padding(.leading, 4)
      .padding(.trailing, 16)
      .frame(minHeight: 64)

      ScrollView {
        DiscoverRecentSearches(model: model) { query in
          onSelect(query)
          dismiss()
        }
        .padding(.top, 12)
        .padding(.bottom, AppChromeMetrics.traditionalTabBarHeight)
      }
    }
    .background(theme.bg)
    // Keep the same navigation-bar visibility as Discover. Switching to system
    // chrome here can leave a reserved top inset after popping and refocusing.
    .toolbar(.hidden, for: .navigationBar)
    .background { InteractivePopGestureEnabler() }
  }
}

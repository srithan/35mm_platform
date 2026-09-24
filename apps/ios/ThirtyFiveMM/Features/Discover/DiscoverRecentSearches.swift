import SwiftUI

struct DiscoverRecentSearches: View {
  @Environment(\.theme) private var theme
  @ObservedObject var model: DiscoverSearchModel
  var limit: Int = 50
  let onSelect: (String) -> Void

  var body: some View {
    LazyVStack(spacing: 4) {
      ForEach(Array(model.recent.prefix(limit)), id: \.self) { query in
        HStack(spacing: 4) {
          Button { onSelect(query) } label: {
            HStack(spacing: 14) {
              Image(systemName: "clock.arrow.circlepath")
                .font(.title3)
                .frame(width: 48, height: 48)
                .overlay { Circle().stroke(theme.border, lineWidth: 1) }
                .accessibilityHidden(true)
              Text(query).font(.body.weight(.semibold)).lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(minHeight: 64)
            .contentShape(Rectangle())
          }
          Button("Remove \(query) from recent searches", systemImage: "xmark") { model.remove(query) }
            .labelStyle(.iconOnly)
            .foregroundStyle(theme.textSecondary)
            .frame(width: 44, height: 44)
        }
        .buttonStyle(.plain)
        .foregroundStyle(theme.text)
      }
      if model.recent.isEmpty {
        ContentUnavailableView("No recent searches", systemImage: "magnifyingglass", description: Text("Your searches will appear here."))
      }
    }
    .padding(.horizontal, 16)
  }
}

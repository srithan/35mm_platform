import SwiftUI

struct HeaderTabBar<Item: Identifiable & Hashable>: View {
  @Environment(\.theme) private var theme

  let items: [Item]
  let selection: Item
  let title: (Item) -> String
  let onSelect: (Item) -> Void

  var body: some View {
    HStack(spacing: 0) {
      ForEach(items) { item in
        HeaderTabBarButton(
          title: title(item),
          isSelected: item == selection,
          action: { onSelect(item) }
        )
      }
    }
    .frame(maxWidth: .infinity)
    .background(theme.bg)
  }
}

private struct HeaderTabBarButton: View {
  @Environment(\.theme) private var theme

  let title: String
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      Text(title)
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(isSelected ? theme.accent : theme.textSecondary)
        .lineLimit(1)
        .minimumScaleFactor(0.82)
        .frame(maxWidth: .infinity, minHeight: 46)
        .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .accessibilityAddTraits(isSelected ? .isSelected : [])
    .overlay(alignment: .bottom) {
      Rectangle()
        .fill(theme.accent)
        .frame(height: 3)
        .opacity(isSelected ? 1 : 0)
    }
  }
}

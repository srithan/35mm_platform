import SwiftUI

struct HeaderTabBar<Item: Identifiable & Hashable>: View {
  @Environment(\.theme) private var theme
  @Environment(\.layoutDirection) private var layoutDirection

  let items: [Item]
  let selection: Item
  let selectionProgress: Double?
  let title: (Item) -> String
  let onSelect: (Item) -> Void

  init(
    items: [Item],
    selection: Item,
    selectionProgress: Double? = nil,
    title: @escaping (Item) -> String,
    onSelect: @escaping (Item) -> Void
  ) {
    self.items = items
    self.selection = selection
    self.selectionProgress = selectionProgress
    self.title = title
    self.onSelect = onSelect
  }

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
    .overlay(alignment: .bottom) {
      GeometryReader { geometry in
        let tabWidth = geometry.size.width / CGFloat(max(items.count, 1))
        let visualProgress = layoutDirection == .rightToLeft
          ? Double(max(items.count - 1, 0)) - clampedProgress
          : clampedProgress

        Rectangle()
          .fill(theme.accent)
          .frame(width: tabWidth, height: 3)
          .position(
            x: (CGFloat(visualProgress) * tabWidth) + (tabWidth / 2),
            y: geometry.size.height - 1.5
          )
          .allowsHitTesting(false)
          .accessibilityHidden(true)
      }
    }
    .frame(maxWidth: .infinity)
    .background(theme.bg)
  }

  private var selectedIndex: Int {
    items.firstIndex(of: selection) ?? 0
  }

  private var clampedProgress: Double {
    let upperBound = Double(max(items.count - 1, 0))
    return min(max(selectionProgress ?? Double(selectedIndex), 0), upperBound)
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
  }
}

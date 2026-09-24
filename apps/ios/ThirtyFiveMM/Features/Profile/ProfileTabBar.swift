import SwiftUI

struct ProfileTabBar: View {
  @Environment(\.theme) private var theme
  @Environment(\.layoutDirection) private var layoutDirection

  let selectedTab: ProfileTab
  let selectionProgress: Double
  let onSelect: (ProfileTab) -> Void

  var body: some View {
    ZStack(alignment: .bottom) {
      Rectangle()
        .fill(theme.text.opacity(0.08))
        .frame(height: 1)

      HStack(spacing: 0) {
        ForEach(ProfileTab.allCases) { tab in
          tabButton(for: tab)
        }
      }
      .padding(.horizontal, ProfileDesign.tabBarHorizontalPadding)

      GeometryReader { geometry in
        let tabWidth = geometry.size.width / CGFloat(ProfileTab.allCases.count)
        let indicatorWidth = max(tabWidth - (ProfileDesign.tabIndicatorInset * 2), 24)
        let visualProgress = layoutDirection == .rightToLeft
          ? Double(ProfileTab.allCases.count - 1) - clampedProgress
          : clampedProgress

        Capsule()
          .fill(theme.text)
          .frame(width: indicatorWidth, height: 3)
          .position(
            x: (CGFloat(visualProgress) * tabWidth) + (tabWidth / 2),
            y: geometry.size.height - 1.5
          )
          .allowsHitTesting(false)
          .accessibilityHidden(true)
      }
      .padding(.horizontal, ProfileDesign.tabBarHorizontalPadding)
    }
    .frame(maxWidth: .infinity, minHeight: ProfileDesign.tabBarHeight)
    .background(theme.bg)
    .accessibilityElement(children: .contain)
    .accessibilityLabel("Profile sections")
  }

  private var clampedProgress: Double {
    min(max(selectionProgress, 0), Double(ProfileTab.allCases.count - 1))
  }

  private func tabButton(for tab: ProfileTab) -> some View {
    let isSelected = selectedTab == tab
    let selectionAmount = tab.selectionAmount(at: clampedProgress)

    return Button(action: { onSelect(tab) }) {
      ProfileTabItemLayout(selectionAmount: CGFloat(selectionAmount), spacing: 5) {
        tabIcon(tab, selectionAmount: selectionAmount)

        Text(tab.title)
          .font(.footnote.weight(.semibold))
          .lineLimit(1)
          .minimumScaleFactor(0.72)
          .allowsTightening(true)
          .fixedSize(horizontal: true, vertical: false)
          .opacity(selectionAmount)
          .offset(x: -4 * CGFloat(1 - selectionAmount))
          .mask(alignment: .leading) {
            GeometryReader { proxy in
              Rectangle()
                .frame(width: proxy.size.width * selectionAmount)
            }
          }
      }
      .foregroundStyle(selectionAmount >= 0.5 ? theme.text : theme.textSecondary)
      .padding(.horizontal, 4)
      .frame(maxWidth: .infinity, minHeight: ProfileDesign.tabBarHeight)
      .contentShape(.rect)
    }
    .buttonStyle(.plain)
    .frame(maxWidth: .infinity)
    .accessibilityLabel(tab.title)
    .accessibilityAddTraits(isSelected ? .isSelected : [])
    .accessibilityIdentifier("profile.tab.\(tab.rawValue)")
  }

  private func tabIcon(_ tab: ProfileTab, selectionAmount: Double) -> some View {
    Image(systemName: tab.systemImage)
      .font(.system(.title3, weight: selectionAmount >= 0.5 ? .semibold : .regular))
      .scaleEffect(0.9 + (0.1 * CGFloat(selectionAmount)))
      .rotationEffect(.degrees(-6 * (1 - selectionAmount)))
      .opacity(0.9 + (0.1 * selectionAmount))
  }
}

private struct ProfileTabItemLayout: Layout {
  let selectionAmount: CGFloat
  let spacing: CGFloat

  func sizeThatFits(
    proposal: ProposedViewSize,
    subviews: Subviews,
    cache: inout ()
  ) -> CGSize {
    guard subviews.count == 2 else { return .zero }
    let iconSize = subviews[0].sizeThatFits(.unspecified)
    let labelSize = subviews[1].sizeThatFits(.unspecified)
    let expandedWidth = iconSize.width + spacing + labelSize.width
    let width = proposal.width ?? interpolatedWidth(
      collapsed: iconSize.width,
      expanded: expandedWidth
    )

    return CGSize(width: width, height: max(iconSize.height, labelSize.height))
  }

  func placeSubviews(
    in bounds: CGRect,
    proposal: ProposedViewSize,
    subviews: Subviews,
    cache: inout ()
  ) {
    guard subviews.count == 2 else { return }
    let iconSize = subviews[0].sizeThatFits(.unspecified)
    let labelSize = subviews[1].sizeThatFits(.unspecified)
    let visibleLabelWidth = (spacing + labelSize.width) * selectionAmount
    let contentWidth = iconSize.width + visibleLabelWidth
    let originX = bounds.midX - (contentWidth / 2)

    subviews[0].place(
      at: CGPoint(x: originX, y: bounds.midY),
      anchor: .leading,
      proposal: ProposedViewSize(iconSize)
    )
    subviews[1].place(
      at: CGPoint(
        x: originX + iconSize.width + (spacing * selectionAmount),
        y: bounds.midY
      ),
      anchor: .leading,
      proposal: ProposedViewSize(labelSize)
    )
  }

  private func interpolatedWidth(collapsed: CGFloat, expanded: CGFloat) -> CGFloat {
    collapsed + ((expanded - collapsed) * selectionAmount)
  }
}

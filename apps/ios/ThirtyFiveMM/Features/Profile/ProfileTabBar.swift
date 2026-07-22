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

    return Button(action: { onSelect(tab) }) {
      Group {
        if isSelected {
          ViewThatFits(in: .horizontal) {
            HStack(spacing: 5) {
              tabIcon(tab, isSelected: true)
              Text(tab.title)
                .font(.footnote.weight(.semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
                .allowsTightening(true)
            }

            tabIcon(tab, isSelected: true)
          }
        } else {
          tabIcon(tab, isSelected: false)
        }
      }
      .foregroundStyle(isSelected ? theme.text : theme.textSecondary)
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

  private func tabIcon(_ tab: ProfileTab, isSelected: Bool) -> some View {
    Image(systemName: tab.systemImage)
      .font(.system(.title3, weight: isSelected ? .semibold : .regular))
  }
}

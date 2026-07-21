import SwiftUI

struct ProfileTabBar: View {
  @Environment(\.theme) private var theme
  @Environment(\.accessibilityReduceMotion) private var accessibilityReduceMotion
  @Namespace private var selectionIndicator
  @Binding var selectedTab: ProfileTab

  var body: some View {
    ZStack(alignment: .bottom) {
      Rectangle()
        .fill(theme.text.opacity(0.08))
        .frame(height: 1)

      HStack(spacing: 0) {
        ForEach(ProfileTab.allCases) { tab in
          let isSelected = selectedTab == tab

          Button {
            select(tab)
          } label: {
            ZStack(alignment: .bottom) {
              HStack(spacing: isSelected ? 7 : 0) {
                Image(systemName: tab.systemImage)
                  .font(.system(.title3, weight: isSelected ? .semibold : .regular))

                if isSelected {
                  Text(tab.title)
                    .font(.footnote.weight(.semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                    .transition(
                      .move(edge: .leading)
                        .combined(with: .opacity)
                    )
                }
              }
              .foregroundStyle(isSelected ? theme.text : theme.textSecondary)
              .frame(maxWidth: .infinity, maxHeight: .infinity)

              if isSelected {
                Capsule()
                  .fill(theme.text)
                  .matchedGeometryEffect(id: "profile-tab-indicator", in: selectionIndicator)
                  .frame(height: 3)
                  .padding(.horizontal, 8)
              }
            }
            .frame(maxWidth: .infinity, minHeight: 52)
            .contentShape(.rect)
          }
          .buttonStyle(.plain)
          .frame(maxWidth: .infinity)
          .accessibilityLabel(tab.title)
          .accessibilityAddTraits(isSelected ? .isSelected : [])
          .accessibilityIdentifier("profile.tab.\(tab.rawValue)")
        }
      }
      .frame(maxWidth: .infinity)
      .padding(.horizontal, 16)
    }
    .frame(maxWidth: .infinity)
    .background(theme.bg)
    .accessibilityElement(children: .contain)
    .accessibilityLabel("Profile sections")
  }

  private func select(_ tab: ProfileTab) {
    if accessibilityReduceMotion {
      selectedTab = tab
    } else {
      withAnimation(.snappy(duration: 0.32, extraBounce: 0)) {
        selectedTab = tab
      }
    }
  }
}

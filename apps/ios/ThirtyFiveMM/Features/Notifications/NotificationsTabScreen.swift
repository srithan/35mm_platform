import SwiftUI

struct NotificationsTabScreen: View {
  @Environment(\.theme) private var theme

  @State private var selectedFilter: NotificationFilter = .all
  @State private var filterSelectionProgress = Double(NotificationFilter.all.index)

  let apiClient: APIClient
  let viewModels: AppNotificationViewModels
  let title: String
  let profile: UserProfile?
  let profileLoadError: String?
  let canOpenMessages: Bool
  let headerVisible: Bool
  let bottomContentInset: CGFloat
  let onProfileTapped: () -> Void
  let onMessagesTapped: () -> Void
  let onScrollDirectionChange: (ScrollChromeDirection) -> Void

  init(
    apiClient: APIClient,
    viewModels: AppNotificationViewModels,
    title: String,
    profile: UserProfile?,
    profileLoadError: String?,
    canOpenMessages: Bool,
    headerVisible: Bool = true,
    bottomContentInset: CGFloat = 0,
    onProfileTapped: @escaping () -> Void,
    onMessagesTapped: @escaping () -> Void,
    onScrollDirectionChange: @escaping (ScrollChromeDirection) -> Void = { _ in }
  ) {
    self.apiClient = apiClient
    self.viewModels = viewModels
    self.title = title
    self.profile = profile
    self.profileLoadError = profileLoadError
    self.canOpenMessages = canOpenMessages
    self.headerVisible = headerVisible
    self.bottomContentInset = bottomContentInset
    self.onProfileTapped = onProfileTapped
    self.onMessagesTapped = onMessagesTapped
    self.onScrollDirectionChange = onScrollDirectionChange
  }

  var body: some View {
    VStack(spacing: 0) {
      AppHeader(
        title: .text(title),
        profile: profile,
        profileLoadError: profileLoadError,
        canOpenMessages: canOpenMessages,
        onProfileTapped: onProfileTapped,
        onMessagesTapped: onMessagesTapped
      ) {
        NotificationsFilterBar(
          selection: selectedFilter,
          selectionProgress: filterSelectionProgress,
          onSelect: selectFilter
        )
      }
      .frame(height: headerVisible ? AppChromeMetrics.headerWithTabsHeight : 0, alignment: .top)
      .opacity(headerVisible ? 1 : 0)
      .clipped()
      .allowsHitTesting(headerVisible)
      .accessibilityHidden(!headerVisible)

      NotificationsPagerView(
        selection: $selectedFilter,
        apiClient: apiClient,
        viewModels: viewModels,
        bottomContentInset: bottomContentInset,
        onSelectionProgressChange: updateFilterSelectionProgress,
        onScrollDirectionChange: onScrollDirectionChange
      )
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .background(theme.bg)
  }

  private func selectFilter(_ filter: NotificationFilter) {
    withAnimation(.snappy(duration: 0.28, extraBounce: 0)) {
      selectedFilter = filter
      filterSelectionProgress = Double(filter.index)
    }
  }

  private func updateFilterSelectionProgress(_ progress: Double, animated: Bool) {
    if animated {
      withAnimation(.snappy(duration: 0.28, extraBounce: 0)) {
        filterSelectionProgress = progress
      }
    } else {
      filterSelectionProgress = progress
    }
  }
}

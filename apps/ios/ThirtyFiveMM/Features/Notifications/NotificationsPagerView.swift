import SwiftUI

struct NotificationsPagerView: View {
  @Binding var selection: NotificationFilter

  let apiClient: APIClient
  let viewModels: AppNotificationViewModels
  let onScrollDirectionChange: (ScrollChromeDirection) -> Void

  @ObservedObject private var allViewModel: NotificationsViewModel
  @ObservedObject private var unreadViewModel: NotificationsViewModel

  init(
    selection: Binding<NotificationFilter>,
    apiClient: APIClient,
    viewModels: AppNotificationViewModels,
    onScrollDirectionChange: @escaping (ScrollChromeDirection) -> Void = { _ in }
  ) {
    _selection = selection
    self.apiClient = apiClient
    self.viewModels = viewModels
    self.onScrollDirectionChange = onScrollDirectionChange
    _allViewModel = ObservedObject(wrappedValue: viewModels.all)
    _unreadViewModel = ObservedObject(wrappedValue: viewModels.unread)
  }

  var body: some View {
    TabView(selection: $selection) {
      NotificationsContentView(
        viewModel: allViewModel,
        apiClient: apiClient,
        onScrollDirectionChange: onScrollDirectionChange,
        onReadStateChanged: handleReadStateChanged
      )
      .tag(NotificationFilter.all)

      NotificationsContentView(
        viewModel: unreadViewModel,
        apiClient: apiClient,
        onScrollDirectionChange: onScrollDirectionChange,
        onReadStateChanged: handleReadStateChanged
      )
      .tag(NotificationFilter.unread)
    }
    .tabViewStyle(.page(indexDisplayMode: .never))
  }

  private func handleReadStateChanged(_ source: NotificationFilter) {
    Task {
      switch source {
      case .all:
        await unreadViewModel.refresh()
      case .unread:
        await allViewModel.refresh()
      }
    }
  }
}

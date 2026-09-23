import SwiftUI

struct NotificationsPagerView: View {
  @Environment(\.layoutDirection) private var layoutDirection

  @Binding var selection: NotificationFilter

  let apiClient: APIClient
  let viewModels: AppNotificationViewModels
  let bottomContentInset: CGFloat
  let onSelectionProgressChange: (Double, Bool) -> Void
  let onScrollDirectionChange: (ScrollChromeDirection) -> Void

  @ObservedObject private var allViewModel: NotificationsViewModel
  @ObservedObject private var unreadViewModel: NotificationsViewModel

  init(
    selection: Binding<NotificationFilter>,
    apiClient: APIClient,
    viewModels: AppNotificationViewModels,
    bottomContentInset: CGFloat = 0,
    onSelectionProgressChange: @escaping (Double, Bool) -> Void = { _, _ in },
    onScrollDirectionChange: @escaping (ScrollChromeDirection) -> Void = { _ in }
  ) {
    _selection = selection
    self.apiClient = apiClient
    self.viewModels = viewModels
    self.bottomContentInset = bottomContentInset
    self.onSelectionProgressChange = onSelectionProgressChange
    self.onScrollDirectionChange = onScrollDirectionChange
    _allViewModel = ObservedObject(wrappedValue: viewModels.all)
    _unreadViewModel = ObservedObject(wrappedValue: viewModels.unread)
  }

  var body: some View {
    GeometryReader { geometry in
      TabView(selection: $selection) {
        NotificationsContentView(
          viewModel: allViewModel,
          apiClient: apiClient,
          bottomContentInset: bottomContentInset,
          onScrollDirectionChange: onScrollDirectionChange,
          onReadStateChanged: handleReadStateChanged
        )
        .tag(NotificationFilter.all)

        NotificationsContentView(
          viewModel: unreadViewModel,
          apiClient: apiClient,
          bottomContentInset: bottomContentInset,
          onScrollDirectionChange: onScrollDirectionChange,
          onReadStateChanged: handleReadStateChanged
        )
        .tag(NotificationFilter.unread)
      }
      .tabViewStyle(.page(indexDisplayMode: .never))
      .simultaneousGesture(selectionProgressGesture(pageWidth: geometry.size.width))
      .onAppear {
        onSelectionProgressChange(Double(selection.index), false)
      }
      .onChange(of: selection) { _, nextSelection in
        onSelectionProgressChange(Double(nextSelection.index), true)
      }
    }
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

  private func selectionProgressGesture(pageWidth: CGFloat) -> some Gesture {
    DragGesture(minimumDistance: 6, coordinateSpace: .local)
      .onChanged { value in
        guard hasHorizontalIntent(value.translation) else { return }

        onSelectionProgressChange(
          NotificationFilter.dragProgress(
            from: selection,
            translation: value.translation.width,
            pageWidth: pageWidth,
            isRightToLeft: layoutDirection == .rightToLeft
          ),
          false
        )
      }
      .onEnded { value in
        guard hasHorizontalIntent(value.translation) else {
          onSelectionProgressChange(Double(selection.index), true)
          return
        }

        onSelectionProgressChange(
          NotificationFilter.settlingProgress(
            from: selection,
            translation: value.translation.width,
            predictedTranslation: value.predictedEndTranslation.width,
            pageWidth: pageWidth,
            isRightToLeft: layoutDirection == .rightToLeft
          ),
          true
        )
      }
  }

  private func hasHorizontalIntent(_ translation: CGSize) -> Bool {
    abs(translation.width) > abs(translation.height) * 1.15
  }
}

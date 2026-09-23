import SwiftUI

struct NotificationsFilterBar: View {
  let selection: NotificationFilter
  let selectionProgress: Double
  let onSelect: (NotificationFilter) -> Void

  init(
    selection: NotificationFilter,
    selectionProgress: Double? = nil,
    onSelect: @escaping (NotificationFilter) -> Void
  ) {
    self.selection = selection
    self.selectionProgress = selectionProgress ?? Double(selection.index)
    self.onSelect = onSelect
  }

  var body: some View {
    HeaderTabBar(
      items: NotificationFilter.allCases,
      selection: selection,
      selectionProgress: selectionProgress,
      title: { $0.title },
      onSelect: onSelect
    )
    .accessibilityLabel("Notification filters")
  }
}

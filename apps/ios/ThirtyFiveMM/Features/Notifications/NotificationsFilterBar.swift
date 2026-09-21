import SwiftUI

struct NotificationsFilterBar: View {
  let selection: NotificationFilter
  let onSelect: (NotificationFilter) -> Void

  var body: some View {
    HeaderTabBar(
      items: NotificationFilter.allCases,
      selection: selection,
      title: { $0.title },
      onSelect: onSelect
    )
    .accessibilityLabel("Notification filters")
  }
}

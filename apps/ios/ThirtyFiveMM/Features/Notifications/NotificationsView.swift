import SwiftUI

struct NotificationsView: View {
  @State private var selectedFilter: NotificationFilter = .all
  @State private var filterSelectionProgress = Double(NotificationFilter.all.index)

  private let apiClient: APIClient
  private let viewModels: AppNotificationViewModels
  private let bottomContentInset: CGFloat

  init(apiClient: APIClient, viewModels: AppNotificationViewModels, bottomContentInset: CGFloat = 0) {
    self.apiClient = apiClient
    self.viewModels = viewModels
    self.bottomContentInset = bottomContentInset
  }

  var body: some View {
    VStack(spacing: 0) {
      NotificationsFilterBar(
        selection: selectedFilter,
        selectionProgress: filterSelectionProgress,
        onSelect: selectFilter
      )

      NotificationsPagerView(
        selection: $selectedFilter,
        apiClient: apiClient,
        viewModels: viewModels,
        bottomContentInset: bottomContentInset,
        onSelectionProgressChange: updateFilterSelectionProgress
      )
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
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

struct NotificationsContentView: View {
  @Environment(\.theme) private var theme
  @Environment(\.appRouteNavigator) private var appRouteNavigator
  @ObservedObject var viewModel: NotificationsViewModel
  let apiClient: APIClient
  let bottomContentInset: CGFloat
  let onScrollDirectionChange: (ScrollChromeDirection) -> Void
  let onReadStateChanged: (NotificationFilter) -> Void

  @State private var openingItemId: String?
  @State private var optionsItem: NotificationItem?
  @State private var isShowingFollowRequests = false

  var body: some View {
    VStack(spacing: 0) {
      markAllReadAction

      content
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .background(theme.bg)
    .task {
      await viewModel.loadInitial()
    }
    .navigationDestination(isPresented: $isShowingFollowRequests) {
      FollowRequestsView(service: apiClient)
        .onDisappear {
          Task { await viewModel.refreshFollowRequests() }
        }
    }
    .bottomActionSheet(item: $optionsItem) { item in
      BottomActionSheet(
        title: "Notification options",
        actions: notificationActions(for: item)
      )
    }
    .animation(.easeInOut(duration: 0.2), value: viewModel.items)
    .animation(.easeInOut(duration: 0.2), value: viewModel.followRequests)
  }

  @ViewBuilder
  private var markAllReadAction: some View {
    if viewModel.hasUnread {
      Button("Mark all read", systemImage: "checkmark.circle", action: markAllRead)
      .font(.subheadline.weight(.semibold))
      .buttonStyle(.plain)
      .foregroundStyle(theme.text)
      .frame(maxWidth: .infinity, alignment: .trailing)
      .frame(minHeight: 44)
      .padding(.horizontal, DesignSystem.Spacing.screenHorizontal)
      .background(theme.bg)
      .overlay(alignment: .bottom) {
        Rectangle()
          .fill(theme.border)
          .frame(height: 0.5)
      }
    }
  }

  @ViewBuilder
  private var content: some View {
    if viewModel.isLoadingInitial && viewModel.items.isEmpty {
      NotificationsSkeletonList()
    } else {
      List {
        ScrollChromeObserver(onDirectionChange: onScrollDirectionChange)
          .frame(width: 0, height: 0)
          .accessibilityHidden(true)
          .environment(\.defaultMinListRowHeight, 0)
          .listRowInsets(EdgeInsets())
          .listRowSeparator(.hidden)

        FollowRequestsSummaryRow(
          requests: viewModel.followRequests,
          total: viewModel.followRequestTotal,
          onOpen: { isShowingFollowRequests = true }
        )
        .listRowInsets(EdgeInsets())
        .listRowSeparator(.hidden)

        if let error = viewModel.error, viewModel.items.isEmpty {
          NotificationsErrorView(message: error) {
            Task { await viewModel.loadInitial(force: true) }
          }
          .listRowInsets(EdgeInsets())
          .listRowSeparator(.hidden)
        } else if viewModel.items.isEmpty {
          NotificationsEmptyView(filter: viewModel.filter)
            .listRowInsets(EdgeInsets())
            .listRowSeparator(.hidden)
        }

        ForEach(groupedNotifications) { group in
          Text(group.title)
            .font(.title3.weight(.semibold))
            .foregroundStyle(theme.text)
            .padding(.horizontal, DesignSystem.Spacing.screenHorizontal)
            .padding(.top, DesignSystem.Spacing.md)
            .padding(.bottom, DesignSystem.Spacing.xs)
            .frame(maxWidth: .infinity, alignment: .leading)
            .listRowInsets(EdgeInsets())
            .listRowSeparator(.hidden)

          ForEach(group.items) { item in
            NotificationRow(
              item: item,
              isOpening: openingItemId == item.id,
              onOpen: { Task { await open(item) } },
              onMore: { optionsItem = item }
            )
            .listRowInsets(EdgeInsets())
            .listRowSeparator(.hidden)
            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
              Button {
                toggleRead(item)
              } label: {
                Label(item.isRead ? "Unread" : "Read", systemImage: item.isRead ? "circle" : "checkmark")
              }
              .tint(item.isRead ? .blue : .green)
            }
            .onAppear {
              Task { await viewModel.loadMoreIfNeeded(currentItemId: item.id) }
            }
          }
        }

        if viewModel.isLoadingMore {
          HStack {
            Spacer()
            ProgressView()
            Spacer()
          }
          .padding(.vertical, 16)
          .listRowSeparator(.hidden)
        }

        listEnd
      }
      .listStyle(.plain)
      .environment(\.defaultMinListRowHeight, 0)
      .contentMargins(.top, 0, for: .scrollContent)
      .themedListBackground()
      .refreshable {
        await viewModel.refresh()
      }
      .overlay(alignment: .top) {
        if let error = viewModel.error, !viewModel.items.isEmpty {
          NotificationsInlineErrorBanner(message: error) {
            viewModel.clearError()
          }
          .padding(.horizontal, 14)
          .padding(.top, 8)
        }
      }
    }
  }

  @ViewBuilder
  private var listEnd: some View {
    if viewModel.hasReachedEnd {
      NotificationsEndView(filter: viewModel.filter)
        .padding(.top, DesignSystem.Spacing.lg)
        .padding(.bottom, bottomSpacing)
        .listRowInsets(EdgeInsets())
        .listRowSeparator(.hidden)
    } else {
      Color.clear
        .frame(height: bottomSpacing)
        .accessibilityHidden(true)
        .listRowInsets(EdgeInsets())
        .listRowSeparator(.hidden)
    }
  }

  private var bottomSpacing: CGFloat {
    bottomContentInset + DesignSystem.Spacing.xl
  }

  private var groupedNotifications: [NotificationDateGroup] {
    let grouped = Dictionary(grouping: viewModel.items) { item in
      NotificationDateGroup.title(for: item.createdAt)
    }

    return grouped
      .map { NotificationDateGroup(title: $0.key, items: $0.value.sorted { $0.createdAt > $1.createdAt }) }
      .sorted { lhs, rhs in
        guard let lhsDate = lhs.items.first?.createdAt,
          let rhsDate = rhs.items.first?.createdAt
        else {
          return lhs.title < rhs.title
        }

        return lhsDate > rhsDate
      }
  }

  private func open(_ item: NotificationItem) async {
    await viewModel.markReadOnOpen(item)
    if !item.isRead {
      onReadStateChanged(viewModel.filter)
    }

    guard let postId = item.destinationPostId else { return }
    guard openingItemId == nil else { return }

    openingItemId = item.id
    defer { openingItemId = nil }

    do {
      let post: FeedPost = try await apiClient.request(.getPost(postId))
      appRouteNavigator(.post(PostDestination(post: post)))
    } catch {
      viewModel.showError(error.localizedDescription)
    }
  }

  private func notificationActions(for item: NotificationItem) -> [BottomActionSheetAction] {
    var actions: [BottomActionSheetAction] = []

    if item.destinationPostId != nil {
      actions.append(
        BottomActionSheetAction("View post", systemImage: "arrow.up.right") {
          Task { await open(item) }
        }
      )
    }

    actions.append(
      BottomActionSheetAction(
        item.isRead ? "Mark as unread" : "Mark as read",
        systemImage: item.isRead ? "circle" : "checkmark.circle"
      ) {
        toggleRead(item)
      }
    )

    return actions
  }

  private func markAllRead() {
    Task {
      await viewModel.markAllRead()
      onReadStateChanged(viewModel.filter)
    }
  }

  private func toggleRead(_ item: NotificationItem) {
    Task {
      await viewModel.toggleRead(item)
      onReadStateChanged(viewModel.filter)
    }
  }
}

private struct NotificationDateGroup: Identifiable {
  let title: String
  let items: [NotificationItem]

  var id: String { title }

  static func title(for date: Date) -> String {
    let calendar = Calendar.current
    if calendar.isDateInToday(date) {
      return "New"
    }
    if calendar.isDateInYesterday(date) {
      return "Yesterday"
    }
    if let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: date), to: calendar.startOfDay(for: .now)).day,
      days < 7
    {
      return "Last 7 days"
    }

    if calendar.isDate(date, equalTo: .now, toGranularity: .month) {
      return "This Month"
    }

    return date.formatted(.dateTime.month(.wide).year())
  }
}

private struct NotificationsSkeletonList: View {
  @Environment(\.theme) private var theme
  var body: some View {
    List {
      ForEach(0..<8, id: \.self) { _ in
        HStack(alignment: .top, spacing: 12) {
          Circle()
            .fill(theme.fillStrong)
            .frame(width: 48, height: 48)

          VStack(alignment: .leading, spacing: 8) {
            RoundedRectangle(cornerRadius: 4)
              .fill(theme.fillStrong)
              .frame(height: 14)
            RoundedRectangle(cornerRadius: 4)
              .fill(theme.fillStrong)
              .frame(width: 180, height: 12)
          }
        }
        .padding(.vertical, 12)
        .redacted(reason: .placeholder)
        .listRowSeparator(.hidden)
      }
    }
    .listStyle(.plain)
  }
}

private struct NotificationsEmptyView: View {
  @Environment(\.theme) private var theme
  let filter: NotificationFilter

  var body: some View {
    VStack(spacing: 12) {
      Image(systemName: filter == .unread ? "checkmark.circle" : "bell")
        .font(.system(size: 44, weight: .semibold))
        .foregroundStyle(theme.textTertiary)

      Text(filter == .unread ? "No unread notifications" : "No notifications yet")
        .font(.headline)
        .foregroundStyle(theme.text)

      Text(filter == .unread ? "You are caught up." : "Likes, follows, replies, mentions, and requests will land here.")
        .font(.subheadline)
        .foregroundStyle(theme.textSecondary)
        .multilineTextAlignment(.center)
        .padding(.horizontal, 34)
    }
    .padding(.vertical, DesignSystem.Spacing.xl * 2)
    .frame(maxWidth: .infinity)
  }
}

private struct NotificationsEndView: View {
  @Environment(\.theme) private var theme
  let filter: NotificationFilter

  var body: some View {
    VStack(spacing: 10) {
      ZStack {
        Circle()
          .fill(theme.fill.opacity(0.86))
          .frame(width: 44, height: 44)

        Image(systemName: filter == .unread ? "checkmark.circle.fill" : "bell.badge.fill")
          .font(.system(size: 18, weight: .semibold))
          .foregroundStyle(theme.textSecondary)
      }
      .overlay {
        Circle()
          .stroke(theme.border, lineWidth: 0.5)
      }
      .accessibilityHidden(true)

      Text("You're all caught up")
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(theme.text)

      Text(filter == .unread ? "No more unread activity." : "That's the end of your activity for now.")
        .font(.footnote)
        .foregroundStyle(theme.textSecondary)
        .multilineTextAlignment(.center)
    }
    .padding(.horizontal, DesignSystem.Spacing.screenHorizontal)
    .frame(maxWidth: .infinity)
    .accessibilityElement(children: .combine)
  }
}

private struct NotificationsErrorView: View {
  @Environment(\.theme) private var theme
  let message: String
  let retry: () -> Void

  var body: some View {
    VStack(spacing: 12) {
      Image(systemName: "exclamationmark.triangle.fill")
        .font(.system(size: 36, weight: .semibold))
        .foregroundStyle(.orange)

      Text("Couldn't load notifications")
        .font(.headline)

      Text(message)
        .font(.callout)
        .foregroundStyle(theme.textSecondary)
        .multilineTextAlignment(.center)
        .padding(.horizontal, 24)

      Button("Retry", action: retry)
        .buttonStyle(.borderedProminent)
    }
    .padding()
    .padding(.vertical, DesignSystem.Spacing.xl)
    .frame(maxWidth: .infinity)
  }
}

private struct NotificationsInlineErrorBanner: View {
  @Environment(\.theme) private var theme
  let message: String
  let dismiss: () -> Void

  var body: some View {
    HStack(spacing: 10) {
      Image(systemName: "exclamationmark.triangle.fill")
        .foregroundStyle(.orange)

      Text(message)
        .font(.footnote)
        .foregroundStyle(theme.text)
        .lineLimit(2)

      Spacer(minLength: 8)

      Button(action: dismiss) {
        Image(systemName: "xmark")
          .font(.caption.weight(.bold))
      }
      .buttonStyle(.plain)
      .foregroundStyle(theme.textSecondary)
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 10)
    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8))
    .shadow(color: .black.opacity(0.12), radius: 12, y: 4)
  }
}

#Preview {
  NotificationsEmptyView(filter: .all)
}

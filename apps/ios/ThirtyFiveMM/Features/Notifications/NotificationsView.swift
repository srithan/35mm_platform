import SwiftUI

struct NotificationsView: View {
  @Environment(\.theme) private var theme
  @EnvironmentObject private var env: AppEnvironment
  @StateObject private var viewModel: NotificationsViewModel
  @State private var selectedPost: FeedPost?
  @State private var openingItemId: String?
  @State private var optionsItem: NotificationItem?
  @State private var isShowingFollowRequests = false
  private let apiClient: APIClient

  init(apiClient: APIClient) {
    self.apiClient = apiClient
    _viewModel = StateObject(wrappedValue: NotificationsViewModel(apiClient: apiClient))
  }

  var body: some View {
    VStack(spacing: 0) {
      notificationsToolbar

      content
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .background(theme.bg)
    .task {
      await viewModel.loadInitial()
    }
    .navigationDestination(item: $selectedPost) { post in
      PostDetailView(post: post)
        .environmentObject(env)
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

  private var notificationsToolbar: some View {
    HStack(spacing: DesignSystem.Spacing.md) {
      ForEach(NotificationFilter.allCases) { filter in
        Button(filter.title) {
          Task { await viewModel.setFilter(filter) }
        }
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(viewModel.filter == filter ? theme.text : theme.textSecondary)
        .frame(minHeight: 44)
        .overlay(alignment: .bottom) {
          Capsule()
            .fill(theme.accent)
            .frame(height: 2)
            .opacity(viewModel.filter == filter ? 1 : 0)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(viewModel.filter == filter ? .isSelected : [])
      }

      Spacer()

      Button("Mark all read", systemImage: "checkmark.circle") {
        Task { await viewModel.markAllRead() }
      }
      .labelStyle(.iconOnly)
      .font(.system(.title3).bold())
      .frame(width: 44, height: 44)
      .contentShape(Rectangle())
      .buttonStyle(.plain)
      .foregroundStyle(viewModel.hasUnread ? theme.text : theme.textTertiary)
      .disabled(!viewModel.hasUnread)
    }
    .padding(.horizontal, DesignSystem.Spacing.screenHorizontal)
    .padding(.vertical, DesignSystem.Spacing.xxs)
    .background(theme.bg)
    .overlay(alignment: .bottom) {
      Rectangle()
        .fill(theme.border)
        .frame(height: 0.5)
    }
  }

  @ViewBuilder
  private var content: some View {
    if viewModel.isLoadingInitial && viewModel.items.isEmpty {
      NotificationsSkeletonList()
    } else {
      List {
        FollowRequestsSummaryRow(
          requests: viewModel.followRequests,
          total: viewModel.followRequestTotal,
          onOpen: { isShowingFollowRequests = true }
        )
        .listRowInsets(EdgeInsets())
        .listRowSeparator(.hidden)

        if let error = viewModel.error, viewModel.items.isEmpty {
          NotificationsErrorView(message: error) {
            Task { await viewModel.loadInitial() }
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
                Task { await viewModel.toggleRead(item) }
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
      }
      .listStyle(.plain)
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

    guard let postId = item.destinationPostId else { return }
    guard openingItemId == nil else { return }

    openingItemId = item.id
    defer { openingItemId = nil }

    do {
      let post: FeedPost = try await apiClient.request(.getPost(postId))
      selectedPost = post
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
        Task { await viewModel.toggleRead(item) }
      }
    )

    return actions
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

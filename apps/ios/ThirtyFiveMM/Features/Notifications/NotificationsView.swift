import SwiftUI

struct NotificationsView: View {
  @EnvironmentObject private var env: AppEnvironment
  @StateObject private var viewModel: NotificationsViewModel
  @State private var selectedPost: FeedPost?
  @State private var openingItemId: String?
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
    .background(Color(.systemBackground))
    .task {
      await viewModel.loadInitial()
    }
    .navigationDestination(item: $selectedPost) { post in
      PostDetailView(post: post)
        .environmentObject(env)
    }
    .animation(.easeInOut(duration: 0.2), value: viewModel.items)
    .animation(.easeInOut(duration: 0.2), value: viewModel.followRequests)
  }

  private var notificationsToolbar: some View {
    VStack(spacing: 0) {
      HStack(spacing: 12) {
        Picker("Notification filter", selection: Binding(
          get: { viewModel.filter },
          set: { nextFilter in
            Task { await viewModel.setFilter(nextFilter) }
          }
        )) {
          ForEach(NotificationFilter.allCases) { filter in
            Text(filter.title).tag(filter)
          }
        }
        .pickerStyle(.segmented)

        Button {
          Task { await viewModel.markAllRead() }
        } label: {
          Image(systemName: "checkmark.circle")
            .font(.system(.title3, weight: .semibold))
            .frame(width: 36, height: 32)
        }
        .buttonStyle(.plain)
        .foregroundStyle(viewModel.hasUnread ? Color(.label) : Color(.tertiaryLabel))
        .disabled(!viewModel.hasUnread)
        .accessibilityLabel("Mark all notifications read")
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 10)

      Divider()
    }
    .background(Color(.systemBackground))
  }

  @ViewBuilder
  private var content: some View {
    if viewModel.isLoadingInitial && viewModel.items.isEmpty {
      NotificationsSkeletonList()
    } else if let error = viewModel.error, viewModel.items.isEmpty {
      NotificationsErrorView(message: error) {
        Task { await viewModel.loadInitial() }
      }
    } else if viewModel.items.isEmpty && viewModel.followRequests.isEmpty {
      NotificationsEmptyView(filter: viewModel.filter)
    } else {
      List {
        if !viewModel.followRequests.isEmpty {
          Section {
            FollowRequestsTray(
              requests: viewModel.followRequests,
              total: viewModel.followRequestTotal,
              onAccept: { request in
                Task { await viewModel.acceptFollowRequest(request) }
              },
              onDecline: { request in
                Task { await viewModel.declineFollowRequest(request) }
              }
            )
            .listRowInsets(EdgeInsets(top: 10, leading: 16, bottom: 10, trailing: 16))
            .listRowSeparator(.hidden)
          }
        }

        ForEach(groupedNotifications) { group in
          Section {
            ForEach(group.items) { item in
              NotificationRow(item: item, isOpening: openingItemId == item.id) {
                Task { await open(item) }
              }
              .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
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
          } header: {
            Text(group.title)
              .font(.footnote.weight(.semibold))
              .foregroundStyle(Color(.secondaryLabel))
              .textCase(nil)
              .padding(.top, 4)
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
      .refreshable {
        await viewModel.refresh()
      }
      .overlay(alignment: .top) {
        if let error = viewModel.error {
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
}

private struct NotificationDateGroup: Identifiable {
  let title: String
  let items: [NotificationItem]

  var id: String { title }

  static func title(for date: Date) -> String {
    let calendar = Calendar.current
    if calendar.isDateInToday(date) {
      return "Today"
    }
    if calendar.isDateInYesterday(date) {
      return "Yesterday"
    }
    if let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: date), to: calendar.startOfDay(for: Date())).day,
      days < 7
    {
      return "This Week"
    }

    var style = Date.FormatStyle().month(.abbreviated).day()
    if !calendar.isDate(date, equalTo: Date(), toGranularity: .year) {
      style = style.year()
    }
    return date.formatted(style)
  }
}

private struct NotificationRow: View {
  let item: NotificationItem
  let isOpening: Bool
  let onOpen: () -> Void

  var body: some View {
    Button(action: onOpen) {
      HStack(alignment: .top, spacing: 12) {
        NotificationAvatarStack(item: item)
          .frame(width: 48, height: 48)
          .padding(.top, 2)

        VStack(alignment: .leading, spacing: 7) {
          HStack(alignment: .firstTextBaseline, spacing: 6) {
            notificationText
              .font(.subheadline)
              .foregroundStyle(Color(.label))
              .lineSpacing(1)
              .fixedSize(horizontal: false, vertical: true)

            Text(item.createdAt.relativeShort)
              .font(.caption)
              .foregroundStyle(Color(.tertiaryLabel))
              .lineLimit(1)
          }

          if let preview = previewText {
            Text(preview)
              .font(.footnote)
              .foregroundStyle(Color(.secondaryLabel))
              .lineLimit(3)
              .padding(.horizontal, 10)
              .padding(.vertical, 8)
              .frame(maxWidth: .infinity, alignment: .leading)
              .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
          }

          if item.type == .followRequest {
            Text("Respond from requests above")
              .font(.caption.weight(.semibold))
              .foregroundStyle(Color(.secondaryLabel))
          }
        }

        Spacer(minLength: 4)

        VStack(spacing: 10) {
          if isOpening {
            ProgressView()
              .controlSize(.small)
          } else if let url = item.entity?.thumbnailUrl {
            NotificationThumbnail(url: url)
          }

          Circle()
            .fill(item.isRead ? Color.clear : Color.accentColor)
            .frame(width: 8, height: 8)
            .accessibilityHidden(true)
        }
        .padding(.top, 4)
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 12)
      .contentShape(Rectangle())
      .background(item.isRead ? Color(.systemBackground) : Color.accentColor.opacity(0.07))
    }
    .buttonStyle(.plain)
    .accessibilityElement(children: .combine)
    .accessibilityLabel(accessibilityLabel)
  }

  private var notificationText: Text {
    Text(actorSummary).bold() + Text(actionText)
  }

  private var actorSummary: String {
    let profiles = item.actorProfiles ?? []
    var names: [String] = []
    var seen = Set<String>()

    for profile in profiles {
      guard !seen.contains(profile.userId) else { continue }
      seen.insert(profile.userId)
      let label = (profile.displayName?.isEmpty == false ? profile.displayName : profile.username) ?? ""
      if !label.isEmpty {
        names.append(label)
      }
    }

    if names.isEmpty, let actor = item.actor {
      names.append(actor.displayName.isEmpty ? actor.username : actor.displayName)
    }

    guard let first = names.first else { return "Someone" }
    let total = max(item.bundleCount, names.count, 1)
    if total <= 1 || names.count == 1 {
      return first
    }
    if total == 2, names.count > 1 {
      return "\(first) and \(names[1])"
    }
    return "\(first), \(names.dropFirst().first ?? "someone") and \(max(total - 2, 1)) others"
  }

  private var actionText: String {
    switch item.type {
    case .follow:
      return " started following you"
    case .followRequest:
      return " requested to follow you"
    case .followRequestApproved:
      return " approved your follow request"
    case .like:
      if item.entity?.type == .comment {
        return item.entity?.title.map { " liked your comment on \($0)" } ?? " liked your comment"
      }
      return " liked your \(entityTitle(defaultValue: "post"))"
    case .comment:
      return " commented on your \(entityTitle(defaultValue: "post"))"
    case .reply:
      return " replied to your comment"
    case .mention:
      return " mentioned you"
    case .repost:
      return " reposted your \(entityTitle(defaultValue: "post"))"
    case .filmLogged:
      return " logged \(entityTitle(defaultValue: "a film you logged"))"
    case .chatReaction:
      return " reacted to your message"
    }
  }

  private var previewText: String? {
    guard let entity = item.entity else { return nil }

    if let contentPreview = entity.contentPreview?.trimmingCharacters(in: .whitespacesAndNewlines),
      !contentPreview.isEmpty
    {
      return contentPreview
    }

    switch entity.type {
    case .post, .comment:
      return nil
    case .film:
      return entity.title
    case .chatThread:
      return "Message thread"
    case .user:
      return entity.title
    case nil:
      return nil
    }
  }

  private var accessibilityLabel: String {
    var label = "\(actorSummary)\(actionText)"
    if let preview = previewText {
      label += ", \(preview)"
    }
    return "\(label), \(item.createdAt.relativeDisplayString)"
  }

  private func entityTitle(defaultValue: String) -> String {
    guard let title = item.entity?.title, !title.isEmpty else {
      return defaultValue
    }

    return title
  }
}

private struct NotificationAvatarStack: View {
  let item: NotificationItem

  private var avatars: [NotificationAvatarData] {
    var values: [NotificationAvatarData] = []
    var seen = Set<String>()

    for profile in item.actorProfiles ?? [] {
      guard seen.insert(profile.userId).inserted else { continue }
      values.append(
        NotificationAvatarData(
          id: profile.userId,
          label: profile.displayName?.isEmpty == false ? profile.displayName! : profile.username,
          url: profile.avatarUrl ?? profile.avatarUrlLg
        )
      )
    }

    if values.isEmpty, let actor = item.actor {
      values.append(
        NotificationAvatarData(
          id: actor.id,
          label: actor.displayName.isEmpty ? actor.username : actor.displayName,
          url: actor.avatarUrl ?? actor.avatarUrlLg
        )
      )
    }

    if values.isEmpty {
      values.append(NotificationAvatarData(id: item.id, label: "35mm", url: nil))
    }

    return Array(values.prefix(3))
  }

  var body: some View {
    ZStack(alignment: .bottomTrailing) {
      ForEach(Array(avatars.enumerated()), id: \.element.id) { index, avatar in
        NotificationAvatar(data: avatar, size: avatars.count == 1 ? 46 : 32)
          .offset(x: offset(for: index).x, y: offset(for: index).y)
          .zIndex(Double(avatars.count - index))
      }

      NotificationTypeBadge(type: item.type)
        .offset(x: 2, y: 2)
        .zIndex(Double(avatars.count + 1))
        .accessibilityHidden(true)
    }
  }

  private func offset(for index: Int) -> CGPoint {
    guard avatars.count > 1 else { return .zero }
    switch index {
    case 0:
      return CGPoint(x: -8, y: -8)
    case 1:
      return CGPoint(x: 9, y: 8)
    default:
      return CGPoint(x: -10, y: 10)
    }
  }
}

private struct NotificationAvatarData {
  let id: String
  let label: String
  let url: String?
}

private struct NotificationAvatar: View {
  let data: NotificationAvatarData
  let size: CGFloat

  var body: some View {
    AsyncImage(url: data.url.flatMap(URL.init(string:))) { phase in
      switch phase {
      case .success(let image):
        image
          .resizable()
          .scaledToFill()
      default:
        ZStack {
          Circle()
            .fill(avatarColor)
          Text(initial)
            .font(.system(size: size * 0.38, weight: .semibold, design: .rounded))
            .foregroundStyle(.white)
        }
      }
    }
    .frame(width: size, height: size)
    .clipShape(Circle())
    .overlay {
      Circle().stroke(Color(.systemBackground), lineWidth: 2)
    }
  }

  private var initial: String {
    data.label.trimmingCharacters(in: .whitespacesAndNewlines).first.map(String.init)?.uppercased() ?? "3"
  }

  private var avatarColor: Color {
    let palette: [Color] = [.black, .blue, .purple, .indigo, .pink, .teal, .orange]
    let value = abs(data.id.unicodeScalars.reduce(0) { ($0 &* 31) &+ Int($1.value) })
    return palette[value % palette.count]
  }
}

private struct NotificationTypeBadge: View {
  let type: NotificationType

  var body: some View {
    Image(systemName: icon)
      .font(.system(size: 9, weight: .bold))
      .foregroundStyle(.white)
      .frame(width: 20, height: 20)
      .background(color, in: Circle())
      .overlay {
        Circle().stroke(Color(.systemBackground), lineWidth: 2)
      }
  }

  private var icon: String {
    switch type {
    case .like:
      return "heart.fill"
    case .comment, .reply, .mention:
      return "bubble.left.fill"
    case .follow, .followRequest, .followRequestApproved:
      return "person.fill"
    case .repost:
      return "arrow.2.squarepath"
    case .filmLogged:
      return "film.fill"
    case .chatReaction:
      return "face.smiling.fill"
    }
  }

  private var color: Color {
    switch type {
    case .like:
      return .pink
    case .comment, .reply, .mention:
      return .blue
    case .follow, .followRequest, .followRequestApproved:
      return .green
    case .repost:
      return .teal
    case .filmLogged:
      return .purple
    case .chatReaction:
      return .orange
    }
  }
}

private struct NotificationThumbnail: View {
  let url: String

  var body: some View {
    AsyncImage(url: URL(string: url)) { phase in
      switch phase {
      case .success(let image):
        image
          .resizable()
          .scaledToFill()
      default:
        RoundedRectangle(cornerRadius: 5, style: .continuous)
          .fill(Color(.secondarySystemBackground))
      }
    }
    .frame(width: 42, height: 58)
    .clipShape(RoundedRectangle(cornerRadius: 5, style: .continuous))
  }
}

private struct FollowRequestsTray: View {
  let requests: [FollowRequest]
  let total: Int
  let onAccept: (FollowRequest) -> Void
  let onDecline: (FollowRequest) -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        Label("Follow requests", systemImage: "person.crop.circle.badge.questionmark")
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(Color(.label))

        Spacer()

        Text("\(total)")
          .font(.caption.weight(.bold))
          .foregroundStyle(Color(.systemBackground))
          .padding(.horizontal, 8)
          .padding(.vertical, 4)
          .background(Color(.label), in: Capsule())
      }

      VStack(spacing: 0) {
        ForEach(requests) { request in
          FollowRequestRow(
            request: request,
            onAccept: { onAccept(request) },
            onDecline: { onDecline(request) }
          )

          if request.id != requests.last?.id {
            Divider().padding(.leading, 54)
          }
        }
      }
      .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
  }
}

private struct FollowRequestRow: View {
  let request: FollowRequest
  let onAccept: () -> Void
  let onDecline: () -> Void

  var body: some View {
    HStack(spacing: 10) {
      NotificationAvatar(
        data: NotificationAvatarData(
          id: request.id,
          label: displayName,
          url: request.avatarUrl ?? request.avatarUrlLg
        ),
        size: 42
      )

      VStack(alignment: .leading, spacing: 2) {
        Text(displayName)
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(Color(.label))
          .lineLimit(1)

        Text(subtitle)
          .font(.caption)
          .foregroundStyle(Color(.secondaryLabel))
          .lineLimit(1)
      }

      Spacer(minLength: 4)

      HStack(spacing: 6) {
        Button(action: onDecline) {
          Image(systemName: "xmark")
            .font(.system(size: 12, weight: .bold))
            .frame(width: 32, height: 32)
            .background(Color(.systemGray5), in: Circle())
        }
        .buttonStyle(.plain)
        .foregroundStyle(Color(.label))
        .accessibilityLabel("Decline \(displayName)")

        Button(action: onAccept) {
          Image(systemName: "checkmark")
            .font(.system(size: 12, weight: .bold))
            .frame(width: 32, height: 32)
            .background(Color(.label), in: Circle())
        }
        .buttonStyle(.plain)
        .foregroundStyle(Color(.systemBackground))
        .accessibilityLabel("Accept \(displayName)")
      }
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 10)
  }

  private var displayName: String {
    request.displayName?.isEmpty == false ? request.displayName! : request.username
  }

  private var subtitle: String {
    if request.mutualFollowerCount > 0 {
      return "@\(request.username) · \(request.mutualFollowerCount) mutual"
    }
    return "@\(request.username)"
  }
}

private struct NotificationsSkeletonList: View {
  var body: some View {
    List {
      ForEach(0..<8, id: \.self) { _ in
        HStack(alignment: .top, spacing: 12) {
          Circle()
            .fill(Color(.systemGray5))
            .frame(width: 48, height: 48)

          VStack(alignment: .leading, spacing: 8) {
            RoundedRectangle(cornerRadius: 4)
              .fill(Color(.systemGray5))
              .frame(height: 14)
            RoundedRectangle(cornerRadius: 4)
              .fill(Color(.systemGray5))
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
  let filter: NotificationFilter

  var body: some View {
    VStack(spacing: 12) {
      Image(systemName: filter == .unread ? "checkmark.circle" : "bell")
        .font(.system(size: 44, weight: .semibold))
        .foregroundStyle(Color(.tertiaryLabel))

      Text(filter == .unread ? "No unread notifications" : "No notifications yet")
        .font(.headline)
        .foregroundStyle(Color(.label))

      Text(filter == .unread ? "You are caught up." : "Likes, follows, replies, mentions, and requests will land here.")
        .font(.subheadline)
        .foregroundStyle(Color(.secondaryLabel))
        .multilineTextAlignment(.center)
        .padding(.horizontal, 34)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

private struct NotificationsErrorView: View {
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
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
        .padding(.horizontal, 24)

      Button("Retry", action: retry)
        .buttonStyle(.borderedProminent)
    }
    .padding()
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

private struct NotificationsInlineErrorBanner: View {
  let message: String
  let dismiss: () -> Void

  var body: some View {
    HStack(spacing: 10) {
      Image(systemName: "exclamationmark.triangle.fill")
        .foregroundStyle(.orange)

      Text(message)
        .font(.footnote)
        .foregroundStyle(.primary)
        .lineLimit(2)

      Spacer(minLength: 8)

      Button(action: dismiss) {
        Image(systemName: "xmark")
          .font(.caption.weight(.bold))
      }
      .buttonStyle(.plain)
      .foregroundStyle(.secondary)
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

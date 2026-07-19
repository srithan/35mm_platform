import Kingfisher
import SwiftUI

struct ChatInboxView: View {
  @Environment(\.dismiss) private var dismiss
  @StateObject private var viewModel: ChatInboxViewModel
  @State private var isShowingComposer = false
  private let apiClient: APIClient
  private let mode: ChatInboxMode
  private let showsSystemChrome: Bool

  init(
    apiClient: APIClient,
    currentUserId: String,
    mode: ChatInboxMode = .inbox,
    showsSystemChrome: Bool = true
  ) {
    self.apiClient = apiClient
    _viewModel = StateObject(
      wrappedValue: ChatInboxViewModel(apiClient: apiClient, currentUserId: currentUserId)
    )
    self.mode = mode
    self.showsSystemChrome = showsSystemChrome
  }

  var body: some View {
    VStack(spacing: 0) {
      if showsSystemChrome {
        ChatInboxHeader(
          title: mode == .inbox ? "Messages" : "Archived",
          showsArchiveAction: mode == .inbox,
          onBack: {
            dismiss()
          },
          onCompose: {
            isShowingComposer = true
          }
        ) {
          ChatInboxView(
            apiClient: apiClient,
            currentUserId: viewModel.currentUserId,
            mode: .archived
          )
        }
      }

      content
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
      .background(Color(.systemBackground))
      .navigationBarBackButtonHidden(true)
      .toolbar(.hidden, for: .navigationBar)
      .sheet(isPresented: $isShowingComposer) {
        ChatComposeSheet(viewModel: viewModel)
      }
      .task {
        await viewModel.start()
      }
      .onDisappear {
        viewModel.stop()
      }
  }

  @ViewBuilder
  private var content: some View {
    let threads = viewModel.filteredThreads(for: mode)
    if viewModel.isLoadingInitial && threads.isEmpty {
      ChatInboxSkeletonList()
    } else if let error = viewModel.error, threads.isEmpty {
      ChatInboxErrorView(message: error) {
        Task { await viewModel.loadInitial() }
      }
    } else if threads.isEmpty {
      ChatInboxEmptyView(mode: mode) {
        isShowingComposer = true
      }
    } else {
      List {
        ForEach(threads) { thread in
          NavigationLink {
            ChatThreadView(
              thread: thread,
              apiClient: apiClient,
              currentUserId: viewModel.currentUserId
            )
          } label: {
            ChatInboxRow(
              thread: thread,
              preview: viewModel.previewText(for: thread),
              isTyping: viewModel.isTyping(thread: thread),
              isOnline: viewModel.isOnline(thread: thread)
            )
          }
          .buttonStyle(.plain)
          .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
          .listRowSeparator(.hidden)
          .onAppear {
            viewModel.setVisible(threadId: thread.id, isVisible: true)
            Task { await viewModel.loadMoreIfNeeded(currentThreadId: thread.id, mode: mode) }
          }
          .onDisappear {
            viewModel.setVisible(threadId: thread.id, isVisible: false)
          }
          .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            Button(role: .destructive) {
              Task { await viewModel.delete(thread) }
            } label: {
              Label("Delete", systemImage: "trash")
            }

            Button {
              Task { await viewModel.toggleMute(thread) }
            } label: {
              Label(thread.isMuted ? "Unmute" : "Mute", systemImage: thread.isMuted ? "bell" : "bell.slash")
            }
            .tint(.orange)

            Button {
              Task { await viewModel.archive(thread, archived: mode == .inbox) }
            } label: {
              Label(mode == .inbox ? "Archive" : "Unarchive", systemImage: mode == .inbox ? "archivebox" : "tray.and.arrow.up")
            }
            .tint(.blue)
          }
        }

        if viewModel.isLoadingMore {
          ChatInboxLoadingMoreRow()
            .listRowSeparator(.hidden)
        }
      }
      .listStyle(.plain)
      .refreshable {
        await viewModel.refresh()
      }
      .overlay(alignment: .top) {
        if let error = viewModel.error {
          ChatInlineErrorBanner(message: error) {
            viewModel.clearError()
          }
          .padding(.horizontal, 14)
          .padding(.top, 4)
        }
      }
    }
  }
}

private struct ChatInboxHeader<ArchiveDestination: View>: View {
  let title: String
  let showsArchiveAction: Bool
  let onBack: () -> Void
  let onCompose: () -> Void
  let archiveDestination: () -> ArchiveDestination

  init(
    title: String,
    showsArchiveAction: Bool,
    onBack: @escaping () -> Void,
    onCompose: @escaping () -> Void,
    @ViewBuilder archiveDestination: @escaping () -> ArchiveDestination
  ) {
    self.title = title
    self.showsArchiveAction = showsArchiveAction
    self.onBack = onBack
    self.onCompose = onCompose
    self.archiveDestination = archiveDestination
  }

  var body: some View {
    VStack(spacing: 0) {
      ZStack {
        Text(title)
          .font(.system(size: 22, weight: .black, design: .rounded))
          .foregroundStyle(Color(.label))
          .lineLimit(1)
          .minimumScaleFactor(0.82)
          .frame(maxWidth: 180)
          .padding(.horizontal, 104)
          .accessibilityAddTraits(.isHeader)

        HStack(spacing: 8) {
          Button(action: onBack) {
            Image(systemName: "chevron.left")
              .font(.system(size: 20, weight: .bold))
              .foregroundStyle(Color(.label))
              .frame(width: 42, height: 42)
              .contentShape(Circle())
          }
          .buttonStyle(.plain)
          .accessibilityLabel("Back")

          Spacer()

          if showsArchiveAction {
            NavigationLink {
              archiveDestination()
            } label: {
              Image(systemName: "archivebox")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(Color(.label))
                .frame(width: 38, height: 42)
                .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Archived messages")

            Button(action: onCompose) {
              Image(systemName: "square.and.pencil")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(Color(.label))
                .frame(width: 38, height: 42)
                .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("New message")
          }
        }
      }
      .frame(height: 64)
      .padding(.horizontal, 16)

      Divider()
    }
    .background(Color(.systemBackground))
  }
}

private struct ChatInboxRow: View {
  let thread: ChatThreadPreview
  let preview: String
  let isTyping: Bool
  let isOnline: Bool

  private var title: String {
    if thread.type == .dm {
      return thread.members.first.map(displayName) ?? "Unknown"
    }
    let names = thread.members.prefix(4).map(displayName)
    return names.isEmpty ? "Group chat" : names.joined(separator: ", ")
  }

  private var hasUnread: Bool {
    thread.unreadCount > 0
  }

  var body: some View {
    HStack(spacing: 12) {
      ChatAvatarCluster(members: thread.members, type: thread.type, isOnline: isOnline)
        .frame(width: 58, height: 58)

      VStack(alignment: .leading, spacing: 5) {
        HStack(spacing: 6) {
          Text(title)
            .font(.system(size: 17, weight: hasUnread ? .bold : .semibold))
            .lineLimit(1)

          if thread.isMuted {
            Image(systemName: "bell.slash.fill")
              .font(.system(size: 11, weight: .semibold))
              .foregroundStyle(.secondary)
          }

          Spacer(minLength: 6)

          if let lastMessageAt = thread.lastMessageAt {
            Text(lastMessageAt.chatRelativeText)
              .font(.system(size: 12, weight: hasUnread ? .semibold : .regular))
              .foregroundStyle(hasUnread ? .primary : .secondary)
          }
        }

        HStack(spacing: 8) {
          Text(preview)
            .font(.system(size: 15, weight: hasUnread ? .semibold : .regular))
            .foregroundStyle(isTyping ? Color(.systemBlue) : Color(.secondaryLabel))
            .lineLimit(1)

          Spacer(minLength: 6)

          if thread.unreadCount > 0 {
            ChatUnreadBadge(count: thread.unreadCount)
          }
        }
      }
    }
    .padding(.vertical, 11)
    .contentShape(Rectangle())
  }

  private func displayName(_ member: ChatMember) -> String {
    member.displayName.isEmpty ? "@\(member.username)" : member.displayName
  }
}

private struct ChatAvatarCluster: View {
  let members: [ChatMember]
  let type: ChatThreadType
  let isOnline: Bool

  var body: some View {
    ZStack(alignment: .bottomTrailing) {
      if type == .dm {
        ChatAvatarImage(url: members.first?.avatarUrl, size: 54)
      } else {
        groupAvatars
      }

      if isOnline {
        Circle()
          .fill(Color.green)
          .frame(width: 13, height: 13)
          .overlay(Circle().stroke(Color.white, lineWidth: 2))
          .offset(x: -2, y: -2)
      }
    }
  }

  private var groupAvatars: some View {
    ZStack {
      let visible = Array(members.prefix(3))
      ForEach(Array(visible.enumerated()), id: \.element.userId) { index, member in
        ChatAvatarImage(url: member.avatarUrl, size: index == 0 ? 40 : 34)
          .offset(x: xOffset(index), y: yOffset(index))
      }

      if members.count > 3 {
        Text("+\(members.count - 3)")
          .font(.system(size: 11, weight: .bold))
          .foregroundStyle(.white)
          .frame(width: 26, height: 26)
          .background(Circle().fill(Color.black.opacity(0.76)))
          .offset(x: 16, y: 16)
      }
    }
    .frame(width: 58, height: 58)
  }

  private func xOffset(_ index: Int) -> CGFloat {
    [-8, 12, -4][min(index, 2)]
  }

  private func yOffset(_ index: Int) -> CGFloat {
    [-9, 9, 15][min(index, 2)]
  }
}

struct ChatAvatarImage: View {
  let url: String?
  let size: CGFloat

  var body: some View {
    KFImage(URL(string: url ?? ""))
      .placeholder {
        ZStack {
          Circle()
            .fill(Color(.secondarySystemBackground))
          Image(systemName: "person.fill")
            .font(.system(size: size * 0.42, weight: .semibold))
            .foregroundStyle(Color(.systemGray2))
        }
      }
      .resizable()
      .fade(duration: 0.18)
      .scaledToFill()
      .frame(width: size, height: size)
      .clipShape(Circle())
      .overlay(Circle().stroke(Color.white, lineWidth: 2))
      .shadow(color: .black.opacity(0.05), radius: 2, y: 1)
  }
}

private struct ChatUnreadBadge: View {
  let count: Int

  var body: some View {
    Text(count > 99 ? "99+" : String(count))
      .font(.system(size: 11, weight: .bold))
      .foregroundStyle(.white)
      .padding(.horizontal, count > 9 ? 6 : 0)
      .frame(minWidth: 20, minHeight: 20)
      .background(Capsule().fill(Color.black))
  }
}

private struct ChatInboxSkeletonList: View {
  var body: some View {
    List {
      ForEach(0..<8, id: \.self) { _ in
        HStack(spacing: 12) {
          Circle()
            .fill(Color(.systemGray5))
            .frame(width: 54, height: 54)
          VStack(alignment: .leading, spacing: 9) {
            RoundedRectangle(cornerRadius: 4)
              .fill(Color(.systemGray5))
              .frame(width: 160, height: 16)
            RoundedRectangle(cornerRadius: 4)
              .fill(Color(.systemGray6))
              .frame(width: 230, height: 13)
          }
        }
        .padding(.vertical, 11)
        .listRowSeparator(.hidden)
      }
    }
    .listStyle(.plain)
    .redacted(reason: .placeholder)
  }
}

private struct ChatInboxEmptyView: View {
  let mode: ChatInboxMode
  let onCompose: () -> Void

  var body: some View {
    VStack(spacing: 14) {
      Group {
        if mode == .inbox {
          Image("MessagesIcon")
            .resizable()
            .scaledToFit()
            .frame(width: 40, height: 44)
        } else {
          Image(systemName: "archivebox")
            .font(.system(size: 42, weight: .semibold))
        }
      }
      .foregroundStyle(Color(.systemGray2))

      Text(mode == .inbox ? "No messages yet" : "No archived threads")
        .font(.system(size: 22, weight: .bold))

      if mode == .inbox {
        Button(action: onCompose) {
          Label("Start a conversation", systemImage: "square.and.pencil")
            .font(.system(size: 16, weight: .bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .background(Capsule().fill(Color.black))
        }
        .buttonStyle(.plain)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding()
  }
}

private struct ChatInboxErrorView: View {
  let message: String
  let retry: () -> Void

  var body: some View {
    VStack(spacing: 12) {
      Text(message)
        .font(.system(size: 16, weight: .semibold))
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
      Button("Retry", action: retry)
        .buttonStyle(.borderedProminent)
        .tint(.black)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding()
  }
}

struct ChatInlineErrorBanner: View {
  let message: String
  let dismiss: () -> Void

  var body: some View {
    HStack(spacing: 10) {
      Text(message)
        .font(.system(size: 13, weight: .semibold))
        .lineLimit(2)
      Spacer()
      Button(action: dismiss) {
        Image(systemName: "xmark")
          .font(.system(size: 12, weight: .bold))
      }
      .buttonStyle(.plain)
    }
    .foregroundStyle(.white)
    .padding(.horizontal, 12)
    .padding(.vertical, 10)
    .background(RoundedRectangle(cornerRadius: 12).fill(Color.black.opacity(0.82)))
  }
}

private struct ChatInboxLoadingMoreRow: View {
  var body: some View {
    HStack {
      Spacer()
      ProgressView()
      Spacer()
    }
    .padding(.vertical, 14)
  }
}

private struct ChatComposeSheet: View {
  @Environment(\.dismiss) private var dismiss
  @ObservedObject var viewModel: ChatInboxViewModel
  @State private var query = ""
  @State private var isCreating = false

  var body: some View {
    NavigationStack {
      List {
        Section {
          TextField("Search people", text: $query)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .onChange(of: query) { _, newValue in
              viewModel.searchProfiles(query: newValue)
            }
        }

        if viewModel.isSearchingProfiles {
          ChatInboxLoadingMoreRow()
        }

        if let error = viewModel.composeError {
          Text(error)
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(Color(.systemRed))
        }

        ForEach(viewModel.composeResults) { user in
          Button {
            Task {
              isCreating = true
              let created = await viewModel.createDM(with: user)
              isCreating = false
              if created != nil {
                dismiss()
              }
            }
          } label: {
            HStack(spacing: 12) {
              ChatAvatarImage(url: user.avatarUrl ?? user.avatarUrlLg, size: 40)
              VStack(alignment: .leading, spacing: 2) {
                Text(user.displayName?.isEmpty == false ? user.displayName ?? user.username : user.username)
                  .font(.system(size: 16, weight: .semibold))
                  .foregroundStyle(.primary)
                Text("@\(user.username)")
                  .font(.system(size: 13))
                  .foregroundStyle(.secondary)
              }
              Spacer()
            }
          }
          .disabled(isCreating)
        }
      }
      .navigationTitle("New message")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("Cancel") {
            dismiss()
          }
        }
      }
    }
  }
}

private extension Date {
  var chatRelativeText: String {
    let now = Date()
    let interval = max(0, now.timeIntervalSince(self))
    if interval < 60 {
      return "now"
    }
    if interval < 3600 {
      return "\(Int(interval / 60))m"
    }
    if interval < 86_400 {
      return "\(Int(interval / 3600))h"
    }
    if interval < 7 * 86_400 {
      return "\(Int(interval / 86_400))d"
    }
    return Self.chatDateFormatter.string(from: self)
  }

  private static let chatDateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.setLocalizedDateFormatFromTemplate("MMM d")
    return formatter
  }()
}

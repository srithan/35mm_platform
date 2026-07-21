import Kingfisher
import PhotosUI
import SwiftUI
import UniformTypeIdentifiers
import UIKit

struct ChatThreadView: View {
  @Environment(\.theme) private var theme
  @Environment(\.dismiss) private var dismiss
  @Environment(\.scenePhase) private var scenePhase
  @StateObject private var viewModel: ChatThreadViewModel
  @State private var selectedImage: ChatImageSelection?
  @State private var reactionTarget: ChatReactionTarget?
  @State private var deleteCandidate: ChatMessage?
  @State private var composerText = ""
  @State private var stagedAttachment: ChatStagedAttachment?
  @State private var selectedPhotoItem: PhotosPickerItem?
  @State private var isShowingFileImporter = false
  @State private var attachmentError: String?
  @State private var didScrollInitial = false

  init(thread: ChatThreadPreview, apiClient: APIClient, currentUserId: String) {
    _viewModel = StateObject(
      wrappedValue: ChatThreadViewModel(
        thread: thread,
        apiClient: apiClient,
        currentUserId: currentUserId
      )
    )
  }

  var body: some View {
    ZStack {
      VStack(spacing: 0) {
        ChatThreadHeader(
          title: title,
          subtitle: threadSubtitle,
          onBack: {
            dismiss()
          },
          onMore: {}
        )

        threadContent
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      }

    }
    .fullScreenCover(item: $selectedImage) { selection in
      ChatImageViewerView(selection: selection) {
        var transaction = Transaction()
        transaction.disablesAnimations = true
        withTransaction(transaction) {
          selectedImage = nil
        }
      }
      .presentationBackground(.black)
      .transaction { transaction in
        transaction.animation = nil
      }
    }
    .safeAreaInset(edge: .bottom, spacing: 0) {
      VStack(spacing: 0) {
        Divider()

        ChatComposerBar(
          text: $composerText,
          stagedAttachment: $stagedAttachment,
          attachmentError: attachmentError ?? viewModel.composerError,
          uploadProgress: stagedAttachment.flatMap { viewModel.uploadProgressByAttachmentId[$0.id] },
          replyingTo: viewModel.replyingTo,
          mode: viewModel.composerMode,
          isSending: viewModel.localMessageStateById.values.contains(.sending),
          selectedPhotoItem: $selectedPhotoItem,
          onTextChange: { value in
            viewModel.composerTextDidChange(value)
          },
          onSend: {
            sendComposer()
          },
          onCancelReply: {
            viewModel.setReplyingTo(nil)
          },
          onCancelEdit: {
            viewModel.cancelEditing()
            composerText = ""
          },
          onPickPhoto: {
            attachmentError = nil
          },
          onPickFile: {
            attachmentError = nil
            isShowingFileImporter = true
          }
        )
        .fixedSize(horizontal: false, vertical: true)
      }
      .background(theme.bg)
    }
    .navigationBarBackButtonHidden(true)
    .toolbar(.hidden, for: .navigationBar)
    .toolbar(.hidden, for: .tabBar)
    .task {
      await viewModel.start()
    }
    .onDisappear {
      viewModel.stop()
    }
    .fileImporter(isPresented: $isShowingFileImporter, allowedContentTypes: [.item]) { result in
      handleImportedFile(result)
    }
    .onChange(of: selectedPhotoItem) { _, item in
      guard let item else { return }
      Task { await stagePhoto(item) }
    }
    .onChange(of: scenePhase) { _, phase in
      viewModel.setForegroundActive(phase == .active)
    }
    .confirmationDialog("React", isPresented: reactionDialogPresented) {
      ForEach(ChatReactionTarget.availableEmojis, id: \.self) { emoji in
        Button(emoji) {
          guard let reactionTarget else { return }
          Task { await viewModel.toggleReaction(message: reactionTarget.message, emoji: emoji) }
        }
      }
      Button("Cancel", role: .cancel) {}
    }
    .alert("Delete message?", isPresented: deleteAlertPresented) {
      Button("Delete", role: .destructive) {
        guard let deleteCandidate else { return }
        Task { await viewModel.delete(message: deleteCandidate) }
      }
      Button("Cancel", role: .cancel) {}
    } message: {
      Text("This will replace the message with a deleted placeholder.")
    }
  }

  @ViewBuilder
  private var threadContent: some View {
    if viewModel.isLoadingInitial && viewModel.messages.isEmpty {
      ChatThreadSkeletonView()
    } else if let error = viewModel.error, viewModel.messages.isEmpty {
      ChatThreadErrorView(message: error) {
        Task { await viewModel.retry() }
      }
    } else if viewModel.messages.isEmpty {
      ChatThreadEmptyView()
    } else {
      ScrollViewReader { proxy in
        ZStack(alignment: .bottom) {
          ScrollView {
            LazyVStack(spacing: 6) {
              if viewModel.isLoadingOlder {
                ProgressView()
                  .padding(.vertical, 12)
              }

              ForEach(viewModel.messages) { message in
                messageRow(message: message, proxy: proxy)
              }

              if !viewModel.typingUsers.isEmpty {
                ChatTypingBubble(users: viewModel.typingUsers)
                  .id("typing")
              }

              Color.clear
                .frame(height: 1)
                .id("bottom")
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
          }
          .scrollDismissesKeyboard(.interactively)
          .defaultScrollAnchor(.bottom)
          .overlay(alignment: .top) {
            if let error = viewModel.error, !viewModel.messages.isEmpty {
              ChatInlineErrorBanner(message: error) {
                viewModel.clearError()
              }
              .padding(.horizontal, 14)
              .padding(.top, 4)
            }
          }

          if viewModel.hasUnseenNewMessages {
            Button {
              withAnimation(.spring(response: 0.22, dampingFraction: 0.9)) {
                proxy.scrollTo("bottom", anchor: .bottom)
              }
              viewModel.setNearBottom(true)
              viewModel.clearUnseenMessages()
            } label: {
              Label("New message", systemImage: "arrow.down")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
                .background(Capsule().fill(ChatTheme.accent))
            }
            .buttonStyle(.plain)
            .padding(.bottom, 14)
          }
        }
        .onAppear {
          scrollToInitialBottom(proxy)
        }
        .onChange(of: viewModel.messages.last?.id) { _, _ in
          if !didScrollInitial {
            scrollToInitialBottom(proxy)
            return
          }
          guard viewModel.shouldAutoScrollToBottom() else { return }
          scrollToBottom(proxy, animated: true)
        }
        .onChange(of: viewModel.typingUsers) { _, users in
          guard !users.isEmpty, viewModel.shouldAutoScrollToBottom() else { return }
          scrollToBottom(proxy, animated: true)
        }
      }
    }
  }

  private var title: String {
    if viewModel.thread.type == .dm {
      return viewModel.thread.members.first.map(displayName) ?? "Messages"
    }
    let names = viewModel.thread.members.prefix(4).map(displayName)
    return names.isEmpty ? "Group chat" : names.joined(separator: ", ")
  }

  private var threadSubtitle: String? {
    if viewModel.thread.type == .dm {
      return viewModel.thread.members.first.map { "@\($0.username)" }
    }

    return "\(viewModel.thread.members.count) members"
  }

  private func displayName(_ member: ChatMember) -> String {
    member.displayName.isEmpty ? "@\(member.username)" : member.displayName
  }

  private func scrollToInitialBottom(_ proxy: ScrollViewProxy) {
    guard !didScrollInitial, !viewModel.messages.isEmpty else { return }
    scrollToBottom(proxy, animated: false)
    didScrollInitial = true
    viewModel.setNearBottom(true)
  }

  private func scrollToBottom(_ proxy: ScrollViewProxy, animated: Bool) {
    if animated {
      withAnimation(.spring(response: 0.22, dampingFraction: 0.9)) {
        proxy.scrollTo("bottom", anchor: .bottom)
      }
      return
    }

    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction) {
      proxy.scrollTo("bottom", anchor: .bottom)
    }
  }

  private var reactionDialogPresented: Binding<Bool> {
    Binding(
      get: { reactionTarget != nil },
      set: { isPresented in
        if !isPresented {
          reactionTarget = nil
        }
      }
    )
  }

  @ViewBuilder
  private func messageRow(message: ChatMessage, proxy: ScrollViewProxy) -> some View {
    if viewModel.shouldShowDateSeparator(before: message) {
      ChatDateSeparator(date: message.createdAt)
        .id("date-\(message.id)")
    }

    ChatMessageRow(
      message: message,
      isMine: message.senderId == viewModel.currentUserId,
      showHeader: viewModel.isFirstInRun(message: message),
      isHighlighted: viewModel.highlightedMessageId == message.id,
      readReceiptSummary: viewModel.readReceiptSummary(for: message),
      localState: viewModel.localMessageStateById[message.id],
      currentUserId: viewModel.currentUserId,
      onOpenImage: { url in
        var transaction = Transaction()
        transaction.disablesAnimations = true
        withTransaction(transaction) {
          selectedImage = ChatImageSelection(url: url)
        }
      },
      onReact: {
        reactionTarget = ChatReactionTarget(message: message)
      },
      onReactEmoji: { emoji in
        Task { await viewModel.toggleReaction(message: message, emoji: emoji) }
      },
      onReply: {
        viewModel.setReplyingTo(message)
      },
      onEdit: {
        viewModel.beginEditing(message)
        composerText = message.body ?? ""
      },
      onDelete: {
        deleteCandidate = message
      },
      onRetry: {
        Task { await viewModel.retry(messageId: message.id) }
      },
      onReplyTap: {
        guard
          let replyToId = message.replyToId,
          viewModel.highlightMessage(id: replyToId)
        else {
          return
        }
        withAnimation(.spring(response: 0.24, dampingFraction: 0.9)) {
          proxy.scrollTo(replyToId, anchor: .center)
        }
      }
    )
    .id(message.id)
    .onAppear {
      if didScrollInitial {
        Task { await viewModel.loadOlderIfNeeded(currentMessageId: message.id) }
      }
      if message.id == viewModel.messages.last?.id {
        viewModel.markVisible(message: message)
      }
    }
    .onDisappear {
      if message.id == viewModel.messages.last?.id {
        viewModel.setNearBottom(false)
      }
    }
  }

  private var deleteAlertPresented: Binding<Bool> {
    Binding(
      get: { deleteCandidate != nil },
      set: { isPresented in
        if !isPresented {
          deleteCandidate = nil
        }
      }
    )
  }

  private func sendComposer() {
    let body = composerText
    let attachment = stagedAttachment
    if case .editing = viewModel.composerMode {
      Task {
        let didEdit = await viewModel.send(body: body, attachment: nil)
        if didEdit {
          composerText = ""
        }
      }
      return
    }

    composerText = ""
    stagedAttachment = nil
    attachmentError = nil
    Task {
      let didSend = await viewModel.send(body: body, attachment: attachment)
      if didSend {
        selectedPhotoItem = nil
      }
    }
  }

  private func stagePhoto(_ item: PhotosPickerItem) async {
    do {
      guard let data = try await item.loadTransferable(type: Data.self) else {
        attachmentError = "Could not read selected photo."
        return
      }
      guard data.count <= 12 * 1024 * 1024 else {
        attachmentError = "Image exceeds 12MB limit."
        return
      }
      let image = UIImage(data: data)
      let contentType = item.supportedContentTypes
        .first(where: { $0.conforms(to: .image) })?
        .preferredMIMEType ?? "image/jpeg"
      stagedAttachment = ChatStagedAttachment(
        kind: .image,
        data: data,
        filename: nil,
        contentType: contentType,
        byteCount: data.count,
        imageSize: image?.size,
        previewImage: image
      )
    } catch {
      attachmentError = error.localizedDescription
    }
  }

  private func handleImportedFile(_ result: Result<URL, Error>) {
    do {
      let url = try result.get()
      let didStart = url.startAccessingSecurityScopedResource()
      defer {
        if didStart {
          url.stopAccessingSecurityScopedResource()
        }
      }
      let data = try Data(contentsOf: url)
      guard data.count <= 12 * 1024 * 1024 else {
        attachmentError = "File exceeds 12MB limit."
        return
      }
      let contentType = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType
        ?? "application/octet-stream"
      stagedAttachment = ChatStagedAttachment(
        kind: .file,
        data: data,
        filename: url.lastPathComponent,
        contentType: contentType,
        byteCount: data.count,
        imageSize: nil,
        previewImage: nil
      )
    } catch {
      attachmentError = error.localizedDescription
    }
  }
}

private struct ChatThreadHeader: View {
  @Environment(\.theme) private var theme
  let title: String
  let subtitle: String?
  let onBack: () -> Void
  let onMore: () -> Void

  var body: some View {
    VStack(spacing: 0) {
      ZStack {
        VStack(spacing: 2) {
          Text(title)
            .font(.headline)
            .foregroundStyle(theme.text)
            .lineLimit(1)
            .minimumScaleFactor(0.76)

          if let subtitle, !subtitle.isEmpty {
            Text(subtitle)
              .font(.caption)
              .foregroundStyle(theme.textSecondary)
              .lineLimit(1)
          }
        }
        .frame(maxWidth: 190)
        .padding(.horizontal, 58)
        .accessibilityAddTraits(.isHeader)

        HStack {
          Button(action: onBack) {
            Image(systemName: "chevron.left")
              .font(.system(size: 20, weight: .bold))
              .foregroundStyle(theme.text)
              .frame(width: 42, height: 42)
              .contentShape(Circle())
          }
          .buttonStyle(.plain)
          .accessibilityLabel("Back")

          Spacer()

          Button(action: onMore) {
            Image(systemName: "ellipsis.circle")
              .font(.system(size: 22, weight: .semibold))
              .foregroundStyle(theme.text)
              .frame(width: 42, height: 42)
              .contentShape(Circle())
          }
          .buttonStyle(.plain)
          .accessibilityLabel("Conversation options")
        }
      }
      .frame(height: 64)
      .padding(.horizontal, 16)

      Divider()
    }
    .background(theme.bg)
  }
}

private struct ChatMessageRow: View {
  @Environment(\.theme) private var theme
  let message: ChatMessage
  let isMine: Bool
  let showHeader: Bool
  let isHighlighted: Bool
  let readReceiptSummary: String?
  let localState: ChatLocalMessageState?
  let currentUserId: String
  let onOpenImage: (String) -> Void
  let onReact: () -> Void
  let onReactEmoji: (String) -> Void
  let onReply: () -> Void
  let onEdit: () -> Void
  let onDelete: () -> Void
  let onRetry: () -> Void
  let onReplyTap: () -> Void

  var body: some View {
    VStack(alignment: isMine ? .trailing : .leading, spacing: 4) {
      HStack(alignment: .bottom, spacing: 8) {
        if isMine {
          Spacer(minLength: 42)
        } else {
          if showHeader {
            ChatAvatarImage(url: message.senderAvatarUrl, size: 30)
          } else {
            Color.clear
              .frame(width: 30, height: 1)
          }
        }

        ChatMessageBubble(
          message: message,
          isMine: isMine,
          isHighlighted: isHighlighted,
          localState: localState,
          onOpenImage: onOpenImage,
          onReplyTap: onReplyTap
        )
        .contextMenu {
          if !message.isDeleted {
            ForEach(ChatReactionTarget.availableEmojis, id: \.self) { emoji in
              Button(emoji) {
                onReactEmoji(emoji)
              }
            }

            Divider()

            Button {
              onReact()
            } label: {
              Label("More reactions", systemImage: "face.smiling")
            }

            Button {
              onReply()
            } label: {
              Label("Reply", systemImage: "arrowshape.turn.up.left")
            }

            if message.senderId == currentUserId && message.contentType == .text {
              Button {
                onEdit()
              } label: {
                Label("Edit", systemImage: "pencil")
              }
            }

            if message.senderId == currentUserId {
              Button(role: .destructive) {
                onDelete()
              } label: {
                Label("Delete", systemImage: "trash")
              }
            }
          }
        }

        if !isMine {
          Spacer(minLength: 42)
        }
      }

      if let localState {
        ChatLocalMessageStateView(state: localState, onRetry: onRetry)
          .padding(.trailing, isMine ? 6 : 0)
      }

      if !message.reactions.isEmpty {
        ChatReactionPills(reactions: message.reactions, isMine: isMine, onReact: onReact)
      }

      if let readReceiptSummary {
        Text(readReceiptSummary)
          .font(.system(size: 11, weight: .semibold))
          .foregroundStyle(theme.textSecondary)
          .padding(.trailing, isMine ? 6 : 0)
      }
    }
    .padding(.vertical, showHeader ? 5 : 1)
  }
}

private struct ChatMessageBubble: View {
  @Environment(\.theme) private var theme
  @Environment(\.openURL) private var openURL

  let message: ChatMessage
  let isMine: Bool
  let isHighlighted: Bool
  let localState: ChatLocalMessageState?
  let onOpenImage: (String) -> Void
  let onReplyTap: () -> Void

  var body: some View {
    VStack(alignment: contentAlignment, spacing: 8) {
      if let replySnapshot = message.replySnapshot, !message.isDeleted {
        Button(action: onReplyTap) {
          ChatReplyPreview(snapshot: replySnapshot)
        }
        .buttonStyle(.plain)
      }

      if message.isDeleted {
        Text("Message deleted")
          .font(.system(size: 15, weight: .medium))
          .italic()
          .foregroundStyle(theme.textSecondary)
      } else {
        content
      }

      if message.editedAt != nil && !message.isDeleted {
        Text("Edited")
          .font(.system(size: 10, weight: .semibold))
          .foregroundStyle(isMine ? Color.white.opacity(0.72) : Color.secondary)
      }
    }
    .padding(bubblePadding)
    .background(background)
    .overlay(highlightOverlay)
    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    .frame(maxWidth: 292, alignment: isMine ? .trailing : .leading)
    .opacity(localState == .sending ? 0.62 : 1)
  }

  @ViewBuilder
  private var content: some View {
    switch message.contentType {
    case .text:
      Text(message.body ?? "")
        .font(.system(size: isStandaloneEmojiText ? 42 : 16))
        .foregroundStyle(isMine ? .white : .primary)
        .textSelection(.enabled)
    case .image, .gif:
      if let mediaUrl = message.mediaUrl {
        VStack(alignment: contentAlignment, spacing: 7) {
          Button {
            onOpenImage(mediaUrl)
          } label: {
            ChatMediaThumbnail(message: message)
          }
          .buttonStyle(.plain)

          if let captionText {
            ChatMediaCaptionBubble(text: captionText, isMine: isMine)
          }
        }
      }
    case .file:
      ChatFileChip(message: message, isMine: isMine)
    case .link:
      ChatLinkCard(preview: message.linkPreview, fallbackBody: message.body, isMine: isMine) { url in
        openURL(url)
      }
    }
  }

  private var background: some ShapeStyle {
    if isBubblelessContent {
      return AnyShapeStyle(Color.clear)
    }
    if message.isDeleted {
      return AnyShapeStyle(ChatTheme.incomingBubble)
    }
    if isMine {
      return AnyShapeStyle(LinearGradient(
        colors: [ChatTheme.outgoingBubbleTop, ChatTheme.outgoingBubbleBottom],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      ))
    }
    return AnyShapeStyle(ChatTheme.incomingBubble)
  }

  private var bubblePadding: CGFloat {
    if isBubblelessContent { return 0 }
    return message.contentType == .image || message.contentType == .gif ? 5 : 11
  }

  private var contentAlignment: HorizontalAlignment {
    isMine ? .trailing : .leading
  }

  private var captionText: String? {
    guard message.contentType == .image || message.contentType == .gif else { return nil }
    let trimmed = message.body?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    return trimmed.isEmpty ? nil : trimmed
  }

  private var isBubblelessContent: Bool {
    !message.isDeleted && (message.contentType == .image || message.contentType == .gif || isStandaloneEmojiText)
  }

  private var isStandaloneEmojiText: Bool {
    guard
      message.contentType == .text,
      let body = message.body?.trimmingCharacters(in: .whitespacesAndNewlines),
      !body.isEmpty
    else {
      return false
    }
    let characters = body.filter { !$0.isWhitespace }
    guard !characters.isEmpty, characters.count <= 6 else { return false }
    return characters.allSatisfy { character in
      character.isEmojiCluster
    }
  }

  @ViewBuilder
  private var highlightOverlay: some View {
    if isHighlighted {
      RoundedRectangle(cornerRadius: 18, style: .continuous)
        .stroke(ChatTheme.accent, lineWidth: 3)
    }
  }
}

private struct ChatReplyPreview: View {
  @Environment(\.theme) private var theme
  let snapshot: MessageReplySnapshot

  var body: some View {
    VStack(alignment: .leading, spacing: 3) {
      Text("@\(snapshot.senderUsername)")
        .font(.system(size: 11, weight: .bold))
      Text(replyText)
        .font(.system(size: 12, weight: .medium))
        .lineLimit(2)
    }
    .foregroundStyle(theme.textSecondary)
    .padding(.leading, 8)
    .overlay(alignment: .leading) {
      RoundedRectangle(cornerRadius: 2)
        .fill(ChatTheme.accent.opacity(0.55))
        .frame(width: 3)
    }
  }

  private var replyText: String {
    if let body = snapshot.body?.trimmingCharacters(in: .whitespacesAndNewlines), !body.isEmpty {
      return body
    }
    switch snapshot.contentType {
    case .text:
      return "Message"
    case .image:
      return "Photo"
    case .gif:
      return "GIF"
    case .file:
      return "File"
    case .link:
      return "Link"
    }
  }
}

private struct ChatMediaThumbnail: View {
  @Environment(\.theme) private var theme
  let message: ChatMessage

  var body: some View {
    KFImage(URL(string: message.mediaUrl ?? ""))
      .placeholder {
        ChatBlurhashPlaceholder(blurhash: message.mediaMetadata?.blurhash)
      }
      .resizable()
      .fade(duration: 0.18)
      .scaledToFill()
      .frame(width: 244, height: mediaHeight)
      .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
      .overlay(alignment: .bottomLeading) {
        if message.contentType == .gif {
          Text("GIF")
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 7)
            .padding(.vertical, 4)
            .background(Capsule().fill(Color.black.opacity(0.68)))
            .padding(8)
        }
      }
  }

  private var mediaHeight: CGFloat {
    guard
      let width = message.mediaMetadata?.width,
      let height = message.mediaMetadata?.height,
      width > 0,
      height > 0
    else {
      return 184
    }
    let ratio = CGFloat(height) / CGFloat(width)
    return min(320, max(140, 244 * ratio))
  }
}

private struct ChatMediaCaptionBubble: View {
  @Environment(\.theme) private var theme
  let text: String
  let isMine: Bool

  var body: some View {
    Text(text)
      .font(.system(size: 16))
      .foregroundStyle(isMine ? .white : .primary)
      .textSelection(.enabled)
      .padding(.horizontal, 12)
      .padding(.vertical, 9)
      .background(background)
      .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
      .frame(maxWidth: 244, alignment: isMine ? .trailing : .leading)
  }

  private var background: some ShapeStyle {
    if isMine {
      return AnyShapeStyle(LinearGradient(
        colors: [ChatTheme.outgoingBubbleTop, ChatTheme.outgoingBubbleBottom],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      ))
    }
    return AnyShapeStyle(ChatTheme.incomingBubble)
  }
}

private struct ChatFileChip: View {
  @Environment(\.theme) private var theme
  let message: ChatMessage
  let isMine: Bool

  var body: some View {
    HStack(spacing: 10) {
      Image(systemName: "doc.fill")
        .font(.system(size: 20, weight: .semibold))
      VStack(alignment: .leading, spacing: 2) {
        Text(fileName)
          .font(.system(size: 15, weight: .semibold))
          .lineLimit(1)
        if let size = message.mediaMetadata?.size {
          Text(size.formattedFileSize)
            .font(.system(size: 12))
            .foregroundStyle(isMine ? Color.white.opacity(0.72) : Color.secondary)
        }
      }
    }
    .foregroundStyle(isMine ? .white : .primary)
  }

  private var fileName: String {
    if let body = message.body?.trimmingCharacters(in: .whitespacesAndNewlines), !body.isEmpty {
      return body
    }
    guard let mediaUrl = message.mediaUrl, let url = URL(string: mediaUrl) else {
      return "File"
    }
    return url.lastPathComponent.isEmpty ? "File" : url.lastPathComponent
  }
}

private struct ChatLinkCard: View {
  @Environment(\.theme) private var theme
  let preview: ChatLinkPreview?
  let fallbackBody: String?
  let isMine: Bool
  let open: (URL) -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      if let imageUrl = preview?.imageUrl {
        KFImage(URL(string: imageUrl))
          .placeholder {
            Rectangle().fill(theme.fillStrong)
          }
          .resizable()
          .fade(duration: 0.18)
          .scaledToFill()
          .frame(width: 232, height: 118)
          .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
      }

      if let siteName = preview?.siteName {
        Text(siteName.uppercased())
          .font(.system(size: 10, weight: .bold))
          .foregroundStyle(isMine ? Color.white.opacity(0.72) : Color.secondary)
      }

      Text(preview?.title ?? fallbackBody ?? preview?.url ?? "Link")
        .font(.system(size: 15, weight: .bold))
        .foregroundStyle(isMine ? .white : .primary)
        .lineLimit(2)

      if let description = preview?.description {
        Text(description)
          .font(.system(size: 13))
          .foregroundStyle(isMine ? Color.white.opacity(0.78) : Color.secondary)
          .lineLimit(3)
      }
    }
    .contentShape(Rectangle())
    .onTapGesture {
      guard let raw = preview?.url ?? fallbackBody, let url = URL(string: raw) else { return }
      open(url)
    }
  }
}

private struct ChatReactionPills: View {
  @Environment(\.theme) private var theme
  let reactions: [MessageReaction]
  let isMine: Bool
  let onReact: () -> Void

  var body: some View {
    HStack(spacing: 4) {
      ForEach(reactions, id: \.emoji) { reaction in
        Button(action: onReact) {
          Text("\(reaction.emoji) \(reaction.count)")
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(reaction.viewerReacted ? .white : .primary)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Capsule().fill(reaction.viewerReacted ? ChatTheme.accent : theme.fill))
            .overlay(Capsule().stroke(theme.fillStrong, lineWidth: reaction.viewerReacted ? 0 : 1))
        }
        .buttonStyle(.plain)
      }
    }
    .padding(.leading, isMine ? 0 : 34)
    .padding(.trailing, isMine ? 6 : 0)
  }
}

private struct ChatLocalMessageStateView: View {
  @Environment(\.theme) private var theme
  let state: ChatLocalMessageState
  let onRetry: () -> Void

  var body: some View {
    switch state {
    case .sending:
      HStack(spacing: 5) {
        ProgressView()
          .controlSize(.mini)
        Text("Sending")
      }
      .font(.system(size: 11, weight: .semibold))
      .foregroundStyle(theme.textSecondary)
    case .failed(let message):
      Button(action: onRetry) {
        HStack(spacing: 5) {
          Image(systemName: "exclamationmark.circle.fill")
          Text(message.isEmpty ? "Failed. Tap to retry." : "Failed. Tap to retry.")
        }
        .font(.system(size: 11, weight: .bold))
        .foregroundStyle(Color(.systemRed))
      }
      .buttonStyle(.plain)
    }
  }
}

private struct ChatComposerBar: View {
  @Environment(\.theme) private var theme
  @Binding var text: String
  @Binding var stagedAttachment: ChatStagedAttachment?
  let attachmentError: String?
  let uploadProgress: Double?
  let replyingTo: ChatMessage?
  let mode: ChatComposerMode
  let isSending: Bool
  @Binding var selectedPhotoItem: PhotosPickerItem?
  let onTextChange: (String) -> Void
  let onSend: () -> Void
  let onCancelReply: () -> Void
  let onCancelEdit: () -> Void
  let onPickPhoto: () -> Void
  let onPickFile: () -> Void

  private var isEditing: Bool {
    if case .editing = mode { return true }
    return false
  }

  private var remainingCharacters: Int {
    4000 - text.count
  }

  private var canSend: Bool {
    !isSending
      && text.count <= 4000
      && (!text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || stagedAttachment != nil || isEditing)
  }

  var body: some View {
    let attachmentIconColor = isEditing ? Color.secondary : ChatTheme.accent

    VStack(spacing: 8) {
      if let attachmentError {
        Text(attachmentError)
          .font(.system(size: 12, weight: .semibold))
          .foregroundStyle(Color(.systemRed))
          .frame(maxWidth: .infinity, alignment: .leading)
      }

      if let replyingTo, !isEditing {
        ChatComposerContextBar(
          title: "Replying to \(replyingTo.senderDisplayName.isEmpty ? "@\(replyingTo.senderUsername)" : replyingTo.senderDisplayName)",
          bodyText: replyingTo.body ?? replyingTo.contentType.composerLabel,
          onCancel: onCancelReply
        )
      }

      if case .editing(let message) = mode {
        ChatComposerContextBar(
          title: "Editing message",
          bodyText: message.body ?? "",
          onCancel: onCancelEdit
        )
      }

      if let stagedAttachment {
        ChatStagedAttachmentPreview(
          attachment: stagedAttachment,
          progress: uploadProgress,
          onRemove: {
            self.stagedAttachment = nil
          }
        )
      }

      HStack(alignment: .bottom, spacing: 8) {
        PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
          Image(systemName: "photo")
            .font(.system(size: 19, weight: .semibold))
            .foregroundStyle(attachmentIconColor)
            .frame(width: 34, height: 34)
        }
        .buttonStyle(.plain)
        .disabled(isEditing)
        .onTapGesture(perform: onPickPhoto)

        Button(action: onPickFile) {
          Image(systemName: "paperclip")
            .font(.system(size: 19, weight: .semibold))
            .foregroundStyle(attachmentIconColor)
            .frame(width: 34, height: 34)
        }
        .buttonStyle(.plain)
        .disabled(isEditing)

        ZStack(alignment: .topLeading) {
          RoundedRectangle(cornerRadius: 18, style: .continuous)
            .fill(ChatTheme.composerField)
            .overlay(
              RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(ChatTheme.composerBorder, lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 3)

          TextField(isEditing ? "Edit message" : "Message", text: $text, axis: .vertical)
            .font(.system(size: 16))
            .lineLimit(1...6)
            .padding(.horizontal, 13)
            .padding(.vertical, 10)
            .frame(minHeight: 40, maxHeight: 118, alignment: .center)
            .onChange(of: text) { _, newValue in
              onTextChange(newValue)
            }
        }
        .frame(minHeight: 40, maxHeight: 118)

        Button(action: onSend) {
          Image(systemName: isEditing ? "checkmark" : "arrow.up")
            .font(.system(size: 16, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: 34, height: 34)
            .background(Circle().fill(canSend ? ChatTheme.accent : theme.fillStrong))
        }
        .buttonStyle(.plain)
        .disabled(!canSend)
      }

      if text.count >= 3600 {
        Text("\(remainingCharacters) characters left")
          .font(.system(size: 11, weight: .bold))
          .foregroundStyle(remainingCharacters < 0 ? Color(.systemRed) : Color.secondary)
          .frame(maxWidth: .infinity, alignment: .trailing)
      }
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 9)
    .background(ChatTheme.composerBackground)
    .overlay(alignment: .top) {
      Rectangle()
        .fill(ChatTheme.composerBorder)
        .frame(height: 1)
    }
  }
}

private struct ChatComposerContextBar: View {
  @Environment(\.theme) private var theme
  let title: String
  let bodyText: String
  let onCancel: () -> Void

  var body: some View {
    HStack(spacing: 9) {
      RoundedRectangle(cornerRadius: 2)
        .fill(ChatTheme.accent)
        .frame(width: 3, height: 34)
      VStack(alignment: .leading, spacing: 2) {
        Text(title)
          .font(.system(size: 12, weight: .bold))
          .foregroundStyle(ChatTheme.accent)
        Text(bodyText)
          .font(.system(size: 12))
          .foregroundStyle(theme.textSecondary)
          .lineLimit(1)
      }
      Spacer()
      Button(action: onCancel) {
        Image(systemName: "xmark.circle.fill")
          .font(.system(size: 18, weight: .semibold))
          .foregroundStyle(theme.textSecondary)
      }
      .buttonStyle(.plain)
    }
    .padding(.horizontal, 10)
    .padding(.vertical, 7)
    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(ChatTheme.accent.opacity(0.08)))
    .overlay(
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .stroke(ChatTheme.accent.opacity(0.22), lineWidth: 1)
    )
  }
}

private struct ChatStagedAttachmentPreview: View {
  @Environment(\.theme) private var theme
  let attachment: ChatStagedAttachment
  let progress: Double?
  let onRemove: () -> Void

  var body: some View {
    HStack(spacing: 10) {
      preview
        .frame(width: 48, height: 48)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

      VStack(alignment: .leading, spacing: 4) {
        Text(title)
          .font(.system(size: 13, weight: .bold))
          .lineLimit(1)
        Text(attachment.byteCount.formattedFileSize)
          .font(.system(size: 12))
          .foregroundStyle(theme.textSecondary)
        if let progress {
          ProgressView(value: progress)
            .frame(maxWidth: 160)
        }
      }

      Spacer()

      Button(action: onRemove) {
        Image(systemName: "xmark.circle.fill")
          .font(.system(size: 19, weight: .semibold))
          .foregroundStyle(theme.textSecondary)
      }
      .buttonStyle(.plain)
    }
    .padding(8)
    .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(theme.bgSunken))
  }

  @ViewBuilder
  private var preview: some View {
    if let previewImage = attachment.previewImage {
      Image(uiImage: previewImage)
        .resizable()
        .scaledToFill()
    } else {
      ZStack {
        theme.fillStrong
        Image(systemName: "doc.fill")
          .font(.system(size: 22, weight: .semibold))
          .foregroundStyle(theme.textSecondary)
      }
    }
  }

  private var title: String {
    switch attachment.kind {
    case .image:
      return "Photo"
    case .file:
      return attachment.filename ?? "File"
    }
  }
}

private struct ChatTypingBubble: View {
  @Environment(\.theme) private var theme
  let users: [ChatThreadTypingUser]

  var body: some View {
    HStack(alignment: .bottom, spacing: 8) {
      ChatAvatarImage(url: users.first?.avatarUrl, size: 24)
      HStack(spacing: 4) {
        ForEach(0..<3, id: \.self) { index in
          Circle()
            .fill(Color.secondary)
            .frame(width: 6, height: 6)
            .opacity(index == 1 ? 0.7 : 1)
        }
      }
      .padding(.horizontal, 13)
      .padding(.vertical, 11)
      .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(ChatTheme.incomingBubble))
      Spacer()
    }
    .padding(.top, 4)
  }
}

private struct ChatDateSeparator: View {
  @Environment(\.theme) private var theme
  let date: Date

  var body: some View {
    Text(date.chatThreadSeparatorText)
      .font(.system(size: 12, weight: .bold))
      .foregroundStyle(theme.textSecondary)
      .padding(.vertical, 12)
      .frame(maxWidth: .infinity)
  }
}

private struct ChatThreadSkeletonView: View {
  @Environment(\.theme) private var theme
  var body: some View {
    ScrollView {
      LazyVStack(spacing: 12) {
        ForEach(0..<9, id: \.self) { index in
          HStack {
            if index.isMultiple(of: 3) {
              Spacer()
            }
            RoundedRectangle(cornerRadius: 18)
              .fill(theme.fillStrong)
              .frame(width: index.isMultiple(of: 2) ? 230 : 168, height: index.isMultiple(of: 4) ? 90 : 42)
            if !index.isMultiple(of: 3) {
              Spacer()
            }
          }
        }
      }
      .padding()
    }
    .redacted(reason: .placeholder)
  }
}

private struct ChatThreadErrorView: View {
  @Environment(\.theme) private var theme
  let message: String
  let retry: () -> Void

  var body: some View {
    VStack(spacing: 12) {
      Text(message)
        .font(.system(size: 16, weight: .semibold))
        .foregroundStyle(theme.textSecondary)
        .multilineTextAlignment(.center)
      Button("Retry", action: retry)
        .buttonStyle(.borderedProminent)
        .tint(ChatTheme.accent)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding()
  }
}

private struct ChatThreadEmptyView: View {
  @Environment(\.theme) private var theme
  var body: some View {
    VStack(spacing: 12) {
      Image("MessagesIcon")
        .resizable()
        .scaledToFit()
        .frame(width: 40, height: 44)
        .foregroundStyle(ChatTheme.accent.opacity(0.72))
      Text("No messages yet")
        .font(.system(size: 22, weight: .bold))
      Text("Conversation history will appear here.")
        .font(.system(size: 15))
        .foregroundStyle(theme.textSecondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding()
  }
}

private struct ChatImageSelection: Identifiable, Equatable {
  let url: String
  var id: String { url }
}

private struct ChatImageViewerView: View {
  @Environment(\.theme) private var theme
  let selection: ChatImageSelection
  let onClose: () -> Void

  var body: some View {
    ZStack {
      Color.black.ignoresSafeArea()

      ScrollView([.horizontal, .vertical], showsIndicators: false) {
        KFImage(URL(string: selection.url))
          .placeholder {
            ProgressView()
              .tint(.white)
              .frame(maxWidth: .infinity, maxHeight: .infinity)
          }
          .resizable()
          .scaledToFit()
          .containerRelativeFrame([.horizontal, .vertical])
      }
      .scrollBounceBehavior(.basedOnSize)

      VStack {
        HStack {
          Button(action: onClose) {
            Image(systemName: "xmark")
              .font(.system(size: 18, weight: .medium))
              .foregroundStyle(.white)
              .frame(width: 46, height: 46)
              .background(Color.white.opacity(0.13), in: Circle())
          }
          .buttonStyle(.plain)
          .accessibilityLabel("Close image")

          Spacer()
        }
        Spacer()
      }
      .padding(.horizontal, 20)
      .padding(.vertical, 14)
    }
    .statusBarHidden()
  }
}

private struct ChatReactionTarget: Identifiable {
  static let availableEmojis = ["❤️", "😂", "🔥", "👏", "😮", "😢"]

  let message: ChatMessage
  var id: String { message.id }
}

private enum ChatTheme {
  static let accent = Color(red: 0.0, green: 122.0 / 255.0, blue: 1.0)
  static let outgoingBubbleTop = Color(red: 10.0 / 255.0, green: 132.0 / 255.0, blue: 1.0)
  static let outgoingBubbleBottom = Color(red: 0.0, green: 112.0 / 255.0, blue: 224.0 / 255.0)
  static let incomingBubble = Color(.secondarySystemBackground)
  static let composerBackground = Color(.systemBackground)
  static let composerField = Color(.systemBackground)
  static let composerBorder = Color.black.opacity(0.07)
}

private extension Date {
  var chatThreadSeparatorText: String {
    if Calendar.current.isDateInToday(self) {
      return "Today"
    }
    if Calendar.current.isDateInYesterday(self) {
      return "Yesterday"
    }
    return Self.chatThreadSeparatorFormatter.string(from: self)
  }

  private static let chatThreadSeparatorFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.timeStyle = .short
    return formatter
  }()
}

private extension Int {
  var formattedFileSize: String {
    ByteCountFormatter.string(fromByteCount: Int64(self), countStyle: .file)
  }
}

private extension Character {
  var isEmojiCluster: Bool {
    let scalars = unicodeScalars.map { $0 }
    let hasEmojiPresentation = scalars.contains { (scalar: Unicode.Scalar) in
      scalar.properties.isEmojiPresentation
        || scalar.properties.isEmojiModifier
        || scalar.properties.isEmojiModifierBase
        || scalar.properties.isEmoji
        || scalar.value == 0xFE0F
    }
    guard hasEmojiPresentation else { return false }

    return scalars.allSatisfy { (scalar: Unicode.Scalar) in
      scalar.properties.isEmoji
        || scalar.properties.isEmojiPresentation
        || scalar.properties.isEmojiModifier
        || scalar.properties.isEmojiModifierBase
        || scalar.value == 0xFE0F
        || scalar.value == 0x200D
        || scalar.value == 0x20E3
    }
  }
}

private extension ChatMessageContentType {
  var composerLabel: String {
    switch self {
    case .text:
      return "Message"
    case .image:
      return "Photo"
    case .gif:
      return "GIF"
    case .file:
      return "File"
    case .link:
      return "Link"
    }
  }
}

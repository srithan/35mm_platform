import Kingfisher
import PhotosUI
import SwiftUI
import UniformTypeIdentifiers
import UIKit

struct ChatThreadView: View {
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
        threadContent
          .frame(maxWidth: .infinity, maxHeight: .infinity)

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

      if let selectedImage {
        ChatImageViewerView(selection: selectedImage) {
          withAnimation(.spring(response: 0.22, dampingFraction: 0.9)) {
            self.selectedImage = nil
          }
        }
        .transition(.scale(scale: 0.94).combined(with: .opacity))
        .zIndex(20)
      }
    }
    .navigationTitle(title)
    .navigationBarTitleDisplayMode(.inline)
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
                .background(Capsule().fill(Color.black.opacity(0.88)))
            }
            .buttonStyle(.plain)
            .padding(.bottom, 14)
          }
        }
        .onChange(of: viewModel.messages.last?.id) { _, _ in
          guard viewModel.shouldAutoScrollToBottom() || !didScrollInitial else { return }
          withAnimation(.spring(response: 0.22, dampingFraction: 0.9)) {
            proxy.scrollTo("bottom", anchor: .bottom)
          }
          didScrollInitial = true
        }
        .onChange(of: viewModel.typingUsers) { _, users in
          guard !users.isEmpty, viewModel.shouldAutoScrollToBottom() else { return }
          withAnimation(.spring(response: 0.22, dampingFraction: 0.9)) {
            proxy.scrollTo("bottom", anchor: .bottom)
          }
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

  private func displayName(_ member: ChatMember) -> String {
    member.displayName.isEmpty ? "@\(member.username)" : member.displayName
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
        withAnimation(.spring(response: 0.22, dampingFraction: 0.9)) {
          selectedImage = ChatImageSelection(url: url)
        }
      },
      onReact: {
        reactionTarget = ChatReactionTarget(message: message)
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
      Task { await viewModel.loadOlderIfNeeded(currentMessageId: message.id) }
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

private struct ChatMessageRow: View {
  let message: ChatMessage
  let isMine: Bool
  let showHeader: Bool
  let isHighlighted: Bool
  let readReceiptSummary: String?
  let localState: ChatLocalMessageState?
  let currentUserId: String
  let onOpenImage: (String) -> Void
  let onReact: () -> Void
  let onReply: () -> Void
  let onEdit: () -> Void
  let onDelete: () -> Void
  let onRetry: () -> Void
  let onReplyTap: () -> Void

  var body: some View {
    VStack(alignment: isMine ? .trailing : .leading, spacing: 4) {
      if !isMine && showHeader {
        HStack(spacing: 8) {
          ChatAvatarImage(url: message.senderAvatarUrl, size: 24)
          Text(displayName)
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(.secondary)
          Spacer()
        }
        .padding(.leading, 4)
      }

      HStack(alignment: .bottom, spacing: 8) {
        if isMine {
          Spacer(minLength: 42)
        } else if !showHeader {
          Color.clear.frame(width: 24, height: 1)
        }

        ChatMessageBubble(
          message: message,
          isMine: isMine,
          isHighlighted: isHighlighted,
          localState: localState,
          onOpenImage: onOpenImage,
          onReplyTap: onReplyTap
        )
        .onLongPressGesture(perform: onReact)
        .contextMenu {
          if !message.isDeleted {
            Button {
              onReact()
            } label: {
              Label("React", systemImage: "face.smiling")
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
          .foregroundStyle(.secondary)
          .padding(.trailing, isMine ? 6 : 0)
      }
    }
    .padding(.vertical, showHeader ? 5 : 1)
  }

  private var displayName: String {
    message.senderDisplayName.isEmpty ? "@\(message.senderUsername)" : message.senderDisplayName
  }
}

private struct ChatMessageBubble: View {
  @Environment(\.openURL) private var openURL

  let message: ChatMessage
  let isMine: Bool
  let isHighlighted: Bool
  let localState: ChatLocalMessageState?
  let onOpenImage: (String) -> Void
  let onReplyTap: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
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
          .foregroundStyle(.secondary)
      } else {
        content
      }

      if message.editedAt != nil && !message.isDeleted {
        Text("Edited")
          .font(.system(size: 10, weight: .semibold))
          .foregroundStyle(isMine ? Color.white.opacity(0.72) : Color.secondary)
      }
    }
    .padding(message.contentType == .image || message.contentType == .gif ? 5 : 11)
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
        .font(.system(size: 16))
        .foregroundStyle(isMine ? .white : .primary)
        .textSelection(.enabled)
    case .image, .gif:
      if let mediaUrl = message.mediaUrl {
        Button {
          onOpenImage(mediaUrl)
        } label: {
          ChatMediaThumbnail(message: message)
        }
        .buttonStyle(.plain)
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
    if message.isDeleted {
      return AnyShapeStyle(Color(.secondarySystemBackground))
    }
    if isMine {
      return AnyShapeStyle(Color.black)
    }
    return AnyShapeStyle(Color(.secondarySystemBackground))
  }

  @ViewBuilder
  private var highlightOverlay: some View {
    if isHighlighted {
      RoundedRectangle(cornerRadius: 18, style: .continuous)
        .stroke(Color(.systemBlue), lineWidth: 3)
    }
  }
}

private struct ChatReplyPreview: View {
  let snapshot: MessageReplySnapshot

  var body: some View {
    VStack(alignment: .leading, spacing: 3) {
      Text("@\(snapshot.senderUsername)")
        .font(.system(size: 11, weight: .bold))
      Text(replyText)
        .font(.system(size: 12, weight: .medium))
        .lineLimit(2)
    }
    .foregroundStyle(.secondary)
    .padding(.leading, 8)
    .overlay(alignment: .leading) {
      RoundedRectangle(cornerRadius: 2)
        .fill(Color.secondary.opacity(0.35))
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

private struct ChatFileChip: View {
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
  let preview: ChatLinkPreview?
  let fallbackBody: String?
  let isMine: Bool
  let open: (URL) -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      if let imageUrl = preview?.imageUrl {
        KFImage(URL(string: imageUrl))
          .placeholder {
            Rectangle().fill(Color(.systemGray5))
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
            .background(Capsule().fill(reaction.viewerReacted ? Color.black : Color(.tertiarySystemBackground)))
            .overlay(Capsule().stroke(Color(.systemGray5), lineWidth: reaction.viewerReacted ? 0 : 1))
        }
        .buttonStyle(.plain)
      }
    }
    .padding(.leading, isMine ? 0 : 34)
    .padding(.trailing, isMine ? 6 : 0)
  }
}

private struct ChatLocalMessageStateView: View {
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
      .foregroundStyle(.secondary)
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
            .frame(width: 34, height: 34)
        }
        .buttonStyle(.plain)
        .disabled(isEditing)
        .onTapGesture(perform: onPickPhoto)

        Button(action: onPickFile) {
          Image(systemName: "paperclip")
            .font(.system(size: 19, weight: .semibold))
            .frame(width: 34, height: 34)
        }
        .buttonStyle(.plain)
        .disabled(isEditing)

        ZStack(alignment: .topLeading) {
          RoundedRectangle(cornerRadius: 18, style: .continuous)
            .fill(Color(.secondarySystemBackground))

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
            .background(Circle().fill(canSend ? Color.black : Color(.systemGray3)))
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
    .background(.regularMaterial)
  }
}

private struct ChatComposerContextBar: View {
  let title: String
  let bodyText: String
  let onCancel: () -> Void

  var body: some View {
    HStack(spacing: 9) {
      RoundedRectangle(cornerRadius: 2)
        .fill(Color.secondary.opacity(0.35))
        .frame(width: 3, height: 34)
      VStack(alignment: .leading, spacing: 2) {
        Text(title)
          .font(.system(size: 12, weight: .bold))
        Text(bodyText)
          .font(.system(size: 12))
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }
      Spacer()
      Button(action: onCancel) {
        Image(systemName: "xmark.circle.fill")
          .font(.system(size: 18, weight: .semibold))
          .foregroundStyle(.secondary)
      }
      .buttonStyle(.plain)
    }
    .padding(.horizontal, 10)
    .padding(.vertical, 7)
    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color(.secondarySystemBackground)))
  }
}

private struct ChatStagedAttachmentPreview: View {
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
          .foregroundStyle(.secondary)
        if let progress {
          ProgressView(value: progress)
            .frame(maxWidth: 160)
        }
      }

      Spacer()

      Button(action: onRemove) {
        Image(systemName: "xmark.circle.fill")
          .font(.system(size: 19, weight: .semibold))
          .foregroundStyle(.secondary)
      }
      .buttonStyle(.plain)
    }
    .padding(8)
    .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color(.secondarySystemBackground)))
  }

  @ViewBuilder
  private var preview: some View {
    if let previewImage = attachment.previewImage {
      Image(uiImage: previewImage)
        .resizable()
        .scaledToFill()
    } else {
      ZStack {
        Color(.systemGray5)
        Image(systemName: "doc.fill")
          .font(.system(size: 22, weight: .semibold))
          .foregroundStyle(.secondary)
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
      .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Color(.secondarySystemBackground)))
      Spacer()
    }
    .padding(.top, 4)
  }
}

private struct ChatDateSeparator: View {
  let date: Date

  var body: some View {
    Text(date.chatThreadSeparatorText)
      .font(.system(size: 12, weight: .bold))
      .foregroundStyle(.secondary)
      .padding(.vertical, 12)
      .frame(maxWidth: .infinity)
  }
}

private struct ChatThreadSkeletonView: View {
  var body: some View {
    ScrollView {
      LazyVStack(spacing: 12) {
        ForEach(0..<9, id: \.self) { index in
          HStack {
            if index.isMultiple(of: 3) {
              Spacer()
            }
            RoundedRectangle(cornerRadius: 18)
              .fill(Color(.systemGray5))
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

private struct ChatThreadEmptyView: View {
  var body: some View {
    VStack(spacing: 12) {
      Image(systemName: "bubble.left.and.bubble.right")
        .font(.system(size: 42, weight: .semibold))
        .foregroundStyle(Color(.systemGray2))
      Text("No messages yet")
        .font(.system(size: 22, weight: .bold))
      Text("Conversation history will appear here.")
        .font(.system(size: 15))
        .foregroundStyle(.secondary)
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

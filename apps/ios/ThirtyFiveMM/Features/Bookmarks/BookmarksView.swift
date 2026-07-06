import SwiftUI
import UIKit

struct BookmarksView: View {
  @EnvironmentObject private var env: AppEnvironment
  @StateObject private var viewModel: BookmarksViewModel
  @State private var selectedPost: FeedPost?
  @State private var selectedImage: BookmarkImageSelection?
  @State private var moveTarget: FeedPost?
  @State private var folderEditorMode: BookmarkFolderEditorMode?
  @State private var isShowingDeleteFolderConfirmation = false

  init(apiClient: APIClient) {
    _viewModel = StateObject(wrappedValue: BookmarksViewModel(apiClient: apiClient))
  }

  var body: some View {
    VStack(spacing: 0) {
      controls
      Divider()
      content
    }
    .background(Color(.systemBackground))
    .task {
      await viewModel.loadInitial()
    }
    .refreshable {
      await viewModel.refresh()
    }
    .navigationDestination(item: $selectedPost) { post in
      PostDetailView(post: post)
        .environmentObject(env)
    }
    .fullScreenCover(item: $selectedImage) { imageSelection in
      PostImageViewerView(
        destination: imageSelection.destination,
        metrics: PostImageViewerMetrics(
          likeCount: imageSelection.post.likeCount,
          commentCount: imageSelection.post.commentCount,
          repostCount: imageSelection.post.repostCount,
          shareCount: imageSelection.post.bookmarkCount,
          isLiked: imageSelection.post.isLiked
        ),
        onClose: {
          clearSelectedImage()
        },
        onLike: {
          Task { await viewModel.toggleLike(postId: imageSelection.post.id) }
        },
        onComment: {
          clearSelectedImage()
          selectedPost = imageSelection.post
        },
        onRepost: {
          Task { await viewModel.toggleRepost(postId: imageSelection.post.id) }
        },
        onShare: {
          viewModel.copyLink(postId: imageSelection.post.id)
        }
      )
      .presentationBackground(.black)
      .transaction { transaction in
        transaction.animation = nil
      }
    }
    .sheet(item: $moveTarget) { post in
      BookmarkMoveSheet(
        post: post,
        folders: viewModel.folders,
        currentFolderId: post.bookmarkFolderId
      ) { folderId in
        Task { await viewModel.move(postId: post.id, to: folderId) }
      }
      .presentationDetents([.medium, .large])
    }
    .sheet(item: $folderEditorMode) { mode in
      BookmarkFolderEditorSheet(mode: mode) { name in
        Task {
          switch mode {
          case .create:
            await viewModel.createFolder(name: name)
          case .rename(_):
            await viewModel.renameSelectedFolder(to: name)
          }
        }
      }
      .presentationDetents([.height(240)])
    }
    .confirmationDialog(
      "Delete folder?",
      isPresented: $isShowingDeleteFolderConfirmation,
      titleVisibility: .visible
    ) {
      Button("Delete folder", role: .destructive) {
        Task { await viewModel.deleteSelectedFolder() }
      }
      Button("Cancel", role: .cancel) {}
    } message: {
      Text("Saved posts move back to Unsorted.")
    }
  }

  private var controls: some View {
    VStack(spacing: 12) {
      HStack(spacing: 10) {
        HStack(spacing: 9) {
          Image(systemName: "magnifyingglass")
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Color(.secondaryLabel))

          TextField("Search saved posts", text: $viewModel.searchText)
            .font(.system(size: 16, weight: .semibold, design: .rounded))
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()

          if !viewModel.searchText.isEmpty {
            Button {
              viewModel.searchText = ""
            } label: {
              Image(systemName: "xmark.circle.fill")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Color(.tertiaryLabel))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Clear search")
          }
        }
        .padding(.horizontal, 13)
        .frame(height: 42)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 8))

        Menu {
          Button {
            folderEditorMode = .create
          } label: {
            Label("New folder", systemImage: "folder.badge.plus")
          }

          if let selectedFolder = viewModel.selectedFolder {
            Button {
              folderEditorMode = .rename(selectedFolder.name)
            } label: {
              Label("Rename folder", systemImage: "pencil")
            }

            Button(role: .destructive) {
              isShowingDeleteFolderConfirmation = true
            } label: {
              Label("Delete folder", systemImage: "trash")
            }
          }
        } label: {
          Image(systemName: "ellipsis.circle")
            .font(.system(size: 22, weight: .semibold))
            .foregroundStyle(Color(.label))
            .frame(width: 42, height: 42)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Bookmark actions")
      }
      .padding(.horizontal, 16)

      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 8) {
          ForEach(viewModel.filters) { filter in
            BookmarkFilterChip(
              filter: filter,
              unsortedCount: viewModel.unsortedCount,
              isSelected: filter.id == viewModel.selectedFilter.id
            ) {
              viewModel.selectFilter(filter)
            }
          }
        }
        .padding(.horizontal, 16)
      }
    }
    .padding(.top, 12)
    .padding(.bottom, 10)
  }

  @ViewBuilder
  private var content: some View {
    ZStack(alignment: .top) {
      if viewModel.isLoading && viewModel.posts.isEmpty {
        ProgressView()
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      } else if let error = viewModel.error, viewModel.posts.isEmpty {
        BookmarkFailureView(message: error) {
          Task { await viewModel.loadInitial() }
        }
      } else if viewModel.visiblePosts.isEmpty {
        BookmarkEmptyView(
          isSearching: !viewModel.searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
          filter: viewModel.selectedFilter,
          createFolder: {
            folderEditorMode = .create
          }
        )
      } else {
        ScrollView {
          LazyVStack(spacing: 0) {
            ForEach(viewModel.visiblePosts) { post in
              BookmarkPostRow(
                post: post,
                folderName: folderName(for: post),
                interactor: viewModel,
                onOpenPost: {
                  selectedPost = post
                },
                onOpenImage: { destination in
                  var transaction = Transaction()
                  transaction.disablesAnimations = true
                  withTransaction(transaction) {
                    selectedImage = BookmarkImageSelection(destination: destination, post: post)
                  }
                },
                onMove: {
                  moveTarget = post
                },
                onCopyLink: {
                  viewModel.copyLink(postId: post.id)
                },
                onRemove: {
                  Task { await viewModel.toggleBookmark(postId: post.id) }
                }
              )
              .onAppear {
                if post.id == viewModel.visiblePosts.last?.id {
                  Task { await viewModel.loadMore() }
                }
              }

              Divider()
                .padding(.leading, 68)
            }

            if viewModel.isLoadingMore {
              ProgressView()
                .padding()
            }
          }
        }
        .scrollDismissesKeyboard(.interactively)
      }

      if let error = viewModel.error, !viewModel.posts.isEmpty {
        BookmarkErrorBanner(message: error) {
          viewModel.clearError()
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .transition(.move(edge: .top).combined(with: .opacity))
      }
    }
    .animation(.easeInOut(duration: 0.2), value: viewModel.error)
  }

  private func folderName(for post: FeedPost) -> String {
    guard let folderId = post.bookmarkFolderId else {
      return "Unsorted"
    }

    return viewModel.folders.first(where: { $0.id == folderId })?.name ?? "Folder"
  }

  private func clearSelectedImage() {
    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction) {
      selectedImage = nil
    }
  }
}

private struct BookmarkPostRow: View {
  let post: FeedPost
  let folderName: String
  let interactor: any PostInteracting
  let onOpenPost: () -> Void
  let onOpenImage: (PostImageDestination) -> Void
  let onMove: () -> Void
  let onCopyLink: () -> Void
  let onRemove: () -> Void

  var body: some View {
    VStack(spacing: 0) {
      HStack(spacing: 8) {
        Image(systemName: "bookmark.fill")
          .font(.system(size: 11, weight: .black))
          .foregroundStyle(Color(.secondaryLabel))

        Text(folderName)
          .font(.system(size: 12, weight: .bold, design: .rounded))
          .foregroundStyle(Color(.secondaryLabel))
          .lineLimit(1)

        Spacer(minLength: 8)

        Menu {
          Button(action: onMove) {
            Label("Move to folder", systemImage: "folder")
          }

          Button(action: onCopyLink) {
            Label("Copy link", systemImage: "link")
          }

          Button(role: .destructive, action: onRemove) {
            Label("Remove bookmark", systemImage: "bookmark.slash")
          }
        } label: {
          Image(systemName: "ellipsis")
            .font(.system(size: 15, weight: .bold))
            .foregroundStyle(Color(.secondaryLabel))
            .frame(width: 34, height: 28)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Saved post actions")
      }
      .padding(.leading, 68)
      .padding(.trailing, 12)
      .padding(.top, 10)
      .padding(.bottom, 2)

      PostCard(
        post: post,
        interactor: interactor,
        onOpenPost: onOpenPost,
        onOpenImage: onOpenImage
      )
    }
    .background(Color(.systemBackground))
  }
}

private struct BookmarkFilterChip: View {
  let filter: BookmarkFilter
  let unsortedCount: Int
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 7) {
        Image(systemName: systemImage)
          .font(.system(size: 12, weight: .black))

        Text(title)
          .font(.system(size: 14, weight: .black, design: .rounded))
          .lineLimit(1)

        if let count {
          Text(count.compactFormatted)
            .font(.system(size: 12, weight: .black, design: .rounded))
            .foregroundStyle(isSelected ? Color.white.opacity(0.82) : Color(.secondaryLabel))
        }
      }
      .foregroundStyle(isSelected ? Color.white : Color(.label))
      .padding(.horizontal, 13)
      .frame(height: 36)
      .background(
        isSelected ? Color(.label) : Color(.secondarySystemBackground),
        in: Capsule()
      )
      .overlay {
        Capsule()
          .stroke(Color(.separator).opacity(isSelected ? 0 : 0.45), lineWidth: 1)
      }
    }
    .buttonStyle(.plain)
  }

  private var title: String {
    switch filter {
    case .all:
      return "All"
    case .unsorted:
      return "Unsorted"
    case .folder(let folder):
      return folder.name
    }
  }

  private var count: Int? {
    switch filter {
    case .all:
      return nil
    case .unsorted:
      return unsortedCount
    case .folder(let folder):
      return folder.itemCount
    }
  }

  private var systemImage: String {
    switch filter {
    case .all:
      return "bookmark.fill"
    case .unsorted:
      return "tray"
    case .folder:
      return "folder.fill"
    }
  }
}

private enum BookmarkFolderEditorMode: Identifiable {
  case create
  case rename(String)

  var id: String {
    switch self {
    case .create:
      return "create"
    case .rename(_):
      return "rename"
    }
  }
}

private struct BookmarkFolderEditorSheet: View {
  @Environment(\.dismiss) private var dismiss
  @State private var name: String

  let mode: BookmarkFolderEditorMode
  let onSave: (String) -> Void

  init(mode: BookmarkFolderEditorMode, onSave: @escaping (String) -> Void) {
    self.mode = mode
    self.onSave = onSave
    switch mode {
    case .create:
      _name = State(initialValue: "")
    case .rename(let value):
      _name = State(initialValue: value)
    }
  }

  var body: some View {
    NavigationStack {
      Form {
        Section {
          TextField("Folder name", text: $name)
            .font(.system(size: 17, weight: .semibold, design: .rounded))
            .submitLabel(.done)
            .onSubmit(save)
        }
      }
      .navigationTitle(title)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") {
            dismiss()
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("Save") {
            save()
          }
          .fontWeight(.bold)
          .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
      }
    }
  }

  private var title: String {
    switch mode {
    case .create:
      return "New folder"
    case .rename(_):
      return "Rename folder"
    }
  }

  private func save() {
    let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return }

    onSave(trimmed)
    dismiss()
  }
}

private struct BookmarkMoveSheet: View {
  @Environment(\.dismiss) private var dismiss

  let post: FeedPost
  let folders: [BookmarkFolder]
  let currentFolderId: String?
  let onSelect: (String?) -> Void

  var body: some View {
    NavigationStack {
      List {
        Button {
          select(nil)
        } label: {
          BookmarkMoveRow(
            title: "Unsorted",
            subtitle: "Keep in default saved posts",
            systemImage: "tray",
            isSelected: currentFolderId == nil
          )
        }

        Section("Folders") {
          ForEach(folders) { folder in
            Button {
              select(folder.id)
            } label: {
              BookmarkMoveRow(
                title: folder.name,
                subtitle: "\(folder.itemCount.compactFormatted) saved",
                systemImage: "folder.fill",
                isSelected: currentFolderId == folder.id
              )
            }
          }
        }
      }
      .navigationTitle("Move bookmark")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") {
            dismiss()
          }
        }
      }
    }
  }

  private func select(_ folderId: String?) {
    onSelect(folderId)
    dismiss()
  }
}

private struct BookmarkMoveRow: View {
  let title: String
  let subtitle: String
  let systemImage: String
  let isSelected: Bool

  var body: some View {
    HStack(spacing: 12) {
      Image(systemName: systemImage)
        .font(.system(size: 19, weight: .semibold))
        .foregroundStyle(Color(.label))
        .frame(width: 30)

      VStack(alignment: .leading, spacing: 2) {
        Text(title)
          .font(.system(size: 16, weight: .bold, design: .rounded))
          .foregroundStyle(Color(.label))

        Text(subtitle)
          .font(.system(size: 13, weight: .semibold, design: .rounded))
          .foregroundStyle(Color(.secondaryLabel))
      }

      Spacer()

      if isSelected {
        Image(systemName: "checkmark.circle.fill")
          .font(.system(size: 20, weight: .bold))
          .foregroundStyle(Color(.label))
      }
    }
    .padding(.vertical, 4)
  }
}

private struct BookmarkEmptyView: View {
  let isSearching: Bool
  let filter: BookmarkFilter
  let createFolder: () -> Void

  var body: some View {
    VStack(spacing: 18) {
      ZStack {
        Circle()
          .fill(Color(.secondarySystemBackground))
          .frame(width: 76, height: 76)

        Image(systemName: icon)
          .font(.system(size: 30, weight: .black))
          .foregroundStyle(Color(.label))
      }

      VStack(spacing: 6) {
        Text(title)
          .font(.system(size: 22, weight: .black, design: .rounded))
          .foregroundStyle(Color(.label))
          .multilineTextAlignment(.center)

        Text(message)
          .font(.system(size: 15, weight: .semibold, design: .rounded))
          .foregroundStyle(Color(.secondaryLabel))
          .multilineTextAlignment(.center)
          .lineSpacing(2)
      }
      .padding(.horizontal, 36)

      if !isSearching {
        Button(action: createFolder) {
          Label("Create folder", systemImage: "folder.badge.plus")
            .font(.system(size: 15, weight: .black, design: .rounded))
            .padding(.horizontal, 16)
            .frame(height: 42)
        }
        .buttonStyle(.borderedProminent)
        .tint(Color(.label))
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  private var icon: String {
    isSearching ? "magnifyingglass" : "bookmark"
  }

  private var title: String {
    if isSearching {
      return "No saved posts found"
    }

    switch filter {
    case .all:
      return "No bookmarks yet"
    case .unsorted:
      return "Unsorted is empty"
    case .folder(let folder):
      return "\(folder.name) is empty"
    }
  }

  private var message: String {
    if isSearching {
      return "Try another film, creator, or phrase."
    }

    switch filter {
    case .all:
      return "Save posts from your feed, then organize the best ones into folders."
    case .unsorted:
      return "New saved posts without a folder land here."
    case .folder:
      return "Move saved posts here from All or Unsorted."
    }
  }
}

private struct BookmarkFailureView: View {
  let message: String
  let retry: () -> Void

  var body: some View {
    VStack(spacing: 14) {
      Image(systemName: "exclamationmark.triangle.fill")
        .font(.system(size: 30, weight: .bold))
        .foregroundStyle(.orange)

      Text(message)
        .font(.system(size: 15, weight: .semibold, design: .rounded))
        .foregroundStyle(Color(.secondaryLabel))
        .multilineTextAlignment(.center)
        .padding(.horizontal, 32)

      Button("Retry", action: retry)
        .buttonStyle(.borderedProminent)
        .tint(Color(.label))
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

private struct BookmarkErrorBanner: View {
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

private struct BookmarkImageSelection: Identifiable, Equatable {
  let destination: PostImageDestination
  let post: FeedPost

  var id: String {
    "\(post.id)-\(destination.url)"
  }

  static func == (lhs: BookmarkImageSelection, rhs: BookmarkImageSelection) -> Bool {
    lhs.id == rhs.id
  }
}

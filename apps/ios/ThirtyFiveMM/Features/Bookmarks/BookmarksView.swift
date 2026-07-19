import SwiftUI

struct BookmarksView: View {
  @EnvironmentObject private var env: AppEnvironment
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @StateObject private var viewModel: BookmarksViewModel
  @State private var selectedPost: FeedPost?
  @State private var selectedImage: BookmarkImageSelection?
  @State private var moveTarget: FeedPost?
  @State private var folderEditorMode: BookmarkFolderEditorMode?
  @State private var queuedFolderEditorMode: BookmarkFolderEditorMode?
  @State private var queuedMoveTarget: FeedPost?
  @State private var isDeleteConfirmationQueued = false
  @State private var isShowingFolderActions = false
  @State private var isShowingDeleteFolderConfirmation = false

  init(apiClient: APIClient) {
    _viewModel = StateObject(wrappedValue: BookmarksViewModel(apiClient: apiClient))
  }

  var body: some View {
    VStack(spacing: 0) {
      BookmarksControls(
        searchText: $viewModel.searchText,
        filters: viewModel.filters,
        unsortedCount: viewModel.unsortedCount,
        selectedFilter: viewModel.selectedFilter,
        showsFolderActions: viewModel.selectedFolder != nil,
        onClearSearch: viewModel.clearSearch,
        onSelectFilter: viewModel.selectFilter,
        onCreateFolder: showCreateFolder,
        onShowFolderActions: showFolderActions
      )

      Divider()
      content
    }
    .background(Color(uiColor: .systemBackground))
    .navigationTitle("Bookmarks")
    .navigationBarTitleDisplayMode(.inline)
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
    .fullScreenCover(item: $selectedImage, content: imageViewer)
    .sheet(item: $moveTarget) { post in
      BookmarkMoveSheet(
        folders: viewModel.folders,
        currentFolderId: post.bookmarkFolderId
      ) { folderId in
        Task { await viewModel.move(postId: post.id, to: folderId) }
      }
      .presentationDetents([.medium, .large])
    }
    .sheet(item: $folderEditorMode) { mode in
      BookmarkFolderEditorSheet(mode: mode) { name in
        await saveFolder(mode: mode, name: name)
      }
      .presentationDetents([.height(folderEditorDetentHeight)])
      .presentationBackground(Color(uiColor: .systemGroupedBackground))
    }
    .bottomActionSheet(
      isPresented: $isShowingFolderActions,
      onDismiss: finishFolderActionPresentation
    ) {
      BottomActionSheet(title: viewModel.selectedTitle, actions: folderActions)
    }
    .confirmationDialog(
      "Delete \(viewModel.selectedFolder?.name ?? "folder")?",
      isPresented: $isShowingDeleteFolderConfirmation,
      titleVisibility: .visible
    ) {
      Button("Delete folder", role: .destructive, action: deleteSelectedFolder)
      Button("Cancel", role: .cancel) {}
    } message: {
      Text("Saved posts move back to Unsorted. This cannot be undone.")
    }
  }

  @ViewBuilder
  private var content: some View {
    ZStack(alignment: .top) {
      if viewModel.isLoading && viewModel.posts.isEmpty {
        ProgressView("Loading bookmarks")
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      } else if let error = viewModel.error, viewModel.posts.isEmpty {
        BookmarkFailureView(message: error) {
          Task { await viewModel.loadInitial() }
        }
      } else if viewModel.visiblePosts.isEmpty {
        BookmarkEmptyView(
          isSearching: viewModel.isSearching,
          hasMore: viewModel.hasMore,
          filter: viewModel.selectedFilter,
          createFolder: showCreateFolder,
          searchMore: searchMore
        )
      } else {
        ScrollView {
          LazyVStack(spacing: 0) {
            ForEach(viewModel.visiblePosts) { post in
              BookmarkPostRow(
                post: post,
                folderName: folderName(for: post),
                interactor: viewModel,
                isPending: viewModel.pendingPostIDs.contains(post.id),
                onOpenPost: { selectedPost = post },
                onOpenImage: { openImage($0, post: post) },
                postActions: postActions(for: post),
                onDismissPostActions: finishPostActionPresentation
              )
              .onAppear {
                loadMoreIfNeeded(post)
              }

              Divider()
                .padding(.leading, 68)
            }

            if viewModel.isLoadingMore {
              ProgressView("Loading more")
                .padding()
            } else if viewModel.isSearching && viewModel.hasMore {
              Button("Search next page", systemImage: "magnifyingglass", action: searchMore)
                .buttonStyle(.bordered)
                .padding()
            }
          }
        }
        .scrollDismissesKeyboard(.interactively)
        .scrollIndicators(.hidden)
      }

      if let error = viewModel.error, !viewModel.posts.isEmpty {
        BookmarkErrorBanner(message: error, dismiss: viewModel.clearError)
          .padding(.horizontal)
          .padding(.top, 8)
          .transition(.move(edge: .top).combined(with: .opacity))
      }
    }
    .animation(.easeInOut(duration: 0.2), value: viewModel.error)
  }

  private var folderActions: [BottomActionSheetAction] {
    var actions: [BottomActionSheetAction] = []

    if let folder = viewModel.selectedFolder {
      actions.append(
        BottomActionSheetAction("Rename folder", systemImage: "pencil") {
          queuedFolderEditorMode = .rename(folder.name)
        }
      )
      actions.append(
        BottomActionSheetAction("Delete folder", systemImage: "trash", role: .destructive) {
          isDeleteConfirmationQueued = true
        }
      )
    }

    return actions
  }

  private func postActions(for post: FeedPost) -> [BottomActionSheetAction] {
    [
      BottomActionSheetAction("Move to folder", systemImage: "folder") {
        queuedMoveTarget = post
      },
      BottomActionSheetAction("Copy link", systemImage: "link") {
        viewModel.copyLink(postId: post.id)
      },
      BottomActionSheetAction("Remove bookmark", systemImage: "bookmark.slash", role: .destructive) {
        Task { await viewModel.toggleBookmark(postId: post.id) }
      },
    ]
  }

  private func imageViewer(_ selection: BookmarkImageSelection) -> some View {
    PostImageViewerView(
      destination: selection.destination,
      metrics: PostImageViewerMetrics(
        likeCount: selection.post.likeCount,
        commentCount: selection.post.commentCount,
        repostCount: selection.post.repostCount,
        shareCount: selection.post.bookmarkCount,
        isLiked: selection.post.isLiked
      ),
      onClose: clearSelectedImage,
      onLike: {
        Task { await viewModel.toggleLike(postId: selection.post.id) }
      },
      onComment: {
        clearSelectedImage()
        selectedPost = selection.post
      },
      onRepost: {
        Task { await viewModel.toggleRepost(postId: selection.post.id) }
      },
      onShare: {
        viewModel.copyLink(postId: selection.post.id)
      }
    )
    .presentationBackground(.black)
    .transaction { $0.animation = nil }
  }

  private func saveFolder(mode: BookmarkFolderEditorMode, name: String) async -> String? {
    let didSave: Bool
    switch mode {
    case .create:
      didSave = await viewModel.createFolder(name: name)
    case .rename:
      didSave = await viewModel.renameSelectedFolder(to: name)
    }

    return didSave ? nil : (viewModel.error ?? "Could not save folder.")
  }

  private func folderName(for post: FeedPost) -> String? {
    guard viewModel.selectedFilter == .all,
          let folderId = post.bookmarkFolderId else { return nil }
    return viewModel.folders.first(where: { $0.id == folderId })?.name
  }

  private var folderEditorDetentHeight: CGFloat {
    dynamicTypeSize.isAccessibilitySize ? 330 : 230
  }

  private func showCreateFolder() {
    folderEditorMode = .create
  }

  private func showFolderActions() {
    isShowingFolderActions = true
  }

  private func finishFolderActionPresentation() {
    if let queuedFolderEditorMode {
      self.queuedFolderEditorMode = nil
      folderEditorMode = queuedFolderEditorMode
    } else if isDeleteConfirmationQueued {
      isDeleteConfirmationQueued = false
      isShowingDeleteFolderConfirmation = true
    }
  }

  private func finishPostActionPresentation() {
    guard let queuedMoveTarget else { return }
    self.queuedMoveTarget = nil
    moveTarget = queuedMoveTarget
  }

  private func deleteSelectedFolder() {
    Task { await viewModel.deleteSelectedFolder() }
  }

  private func searchMore() {
    Task { await viewModel.loadMore() }
  }

  private func loadMoreIfNeeded(_ post: FeedPost) {
    guard post.id == viewModel.visiblePosts.last?.id else { return }
    Task { await viewModel.loadMore() }
  }

  private func openImage(_ destination: PostImageDestination, post: FeedPost) {
    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction) {
      selectedImage = BookmarkImageSelection(destination: destination, post: post)
    }
  }

  private func clearSelectedImage() {
    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction) {
      selectedImage = nil
    }
  }
}

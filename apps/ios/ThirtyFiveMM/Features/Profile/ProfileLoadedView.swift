import SwiftUI
import UIKit

struct ProfileLoadedView: View {
  @EnvironmentObject private var env: AppEnvironment

  let profile: PublicProfile
  let model: ProfileViewModel
  let service: any ProfileServicing
  let onCurrentProfileUpdated: (PublicProfile) -> Void

  @State private var selectedTab: ProfileTab = .posts
  @State private var isShowingProfileActions = false
  @State private var isShowingUnfollowConfirmation = false
  @State private var isShowingBlockConfirmation = false
  @State private var isShowingShareSheet = false
  @State private var pendingProfileAction: ProfileAction?
  @State private var editingProfile: PublicProfile?
  @State private var selectedPost: FeedPost?
  @State private var selectedImage: ProfileImageSelection?
  @State private var selectedProfileMedia: ProfileMediaSelection?

  var body: some View {
    ScrollView {
      LazyVStack(spacing: 0, pinnedViews: [.sectionHeaders]) {
        ProfileCoverPreviewView(
          url: profile.coverUrl,
          displayName: profile.displayName,
          onOpen: coverPreviewAction
        )

        ProfileHeaderView(
          profile: profile,
          isFollowMutationPending: model.isFollowingMutation,
          onOpenAvatar: avatarPreviewAction,
          onEdit: editProfile,
          onFollow: followTapped,
          onShare: shareProfile,
          onMore: showProfileActions
        )
        .background(.background)

        Section {
          if isPrivateGate {
            ContentUnavailableView(
              "This account is private",
              systemImage: "lock.fill",
              description: Text("Follow \(profile.displayName) to see their posts.")
            )
            .padding(.vertical, 32)
          } else {
            tabContent
          }
        } header: {
          ProfileTabBar(selectedTab: $selectedTab)
        }
      }
    }
    .refreshable {
      await model.refresh(selectedTab: selectedTab)
    }
    .task(id: selectedTab) {
      await model.loadTabIfNeeded(selectedTab)
    }
    .overlay(alignment: .top) {
      if let error = model.actionError {
        ProfileErrorBanner(message: error, onDismiss: model.clearActionError)
          .padding(.horizontal, 14)
          .padding(.top, 8)
      }
    }
    .navigationDestination(item: $selectedPost) { post in
      PostDetailView(post: post)
    }
    .bottomActionSheet(
      isPresented: $isShowingProfileActions,
      onDismiss: performPendingProfileAction
    ) {
      BottomActionSheet(title: "Profile actions", actions: profileActionRows)
    }
    .bottomActionSheet(isPresented: $isShowingUnfollowConfirmation) {
      BottomActionSheet(
        title: "Unfollow @\(profile.username)?",
        actions: [
          BottomActionSheetAction("Unfollow", systemImage: "person.badge.minus", role: .destructive) {
            Task { await model.toggleFollow() }
          },
          BottomActionSheetAction("Cancel", systemImage: "xmark") {},
        ]
      )
    }
    .bottomActionSheet(isPresented: $isShowingBlockConfirmation) {
      BottomActionSheet(
        title: "Block @\(profile.username)?",
        actions: [
          BottomActionSheetAction("Block @\(profile.username)", systemImage: "person.fill.xmark", role: .destructive) {
            Task { await model.block() }
          },
          BottomActionSheetAction("Cancel", systemImage: "xmark") {},
        ]
      )
    }
    .shareModal(
      isPresented: $isShowingShareSheet,
      url: profileURL,
      title: profileShareTitle,
      previewContent: profileSharePreview
    )
    .profileMediaViewer(selection: $selectedProfileMedia)
    .fullScreenCover(item: $selectedImage) { selection in
      PostImageViewerView(
        destination: selection.destination,
        metrics: PostImageViewerMetrics(
          likeCount: selection.post.likeCount,
          commentCount: selection.post.commentCount,
          repostCount: selection.post.repostCount,
          shareCount: selection.post.bookmarkCount,
          isLiked: selection.post.isLiked,
          isReposted: selection.post.isReposted
        ),
        onClose: { selectedImage = nil },
        onLike: { Task { await model.toggleLike(postId: selection.post.id) } },
        onComment: {
          selectedImage = nil
          selectedPost = selection.post
        },
        onRepost: { Task { await model.toggleRepost(postId: selection.post.id) } },
        onQuote: {
          env.presentComposer(quoting: selection.post)
        },
        onShare: {
          UIPasteboard.general.url = postURL(for: selection.post)
        }
      )
      .presentationBackground(.black)
    }
    .fullScreenCover(item: $editingProfile) { editableProfile in
      EditProfileView(profile: editableProfile, service: service) { updated in
        model.applyUpdatedProfile(updated)
        onCurrentProfileUpdated(updated)
      }
    }
  }

  @ViewBuilder
  private var tabContent: some View {
    switch selectedTab {
    case .posts:
      ProfilePostsView(model: model, onOpenPost: openPost, onOpenImage: openImage)
    case .diary:
      ProfileDiaryView(model: model, onOpenPost: openPost)
    case .lists:
      ProfileListsView(model: model)
    case .stats:
      ProfileStatsView(model: model)
    }
  }

  private var isPrivateGate: Bool {
    profile.isPrivate && !profile.isOwnProfile && profile.followState != .following
  }

  private var profileURL: URL {
    AppConstants.webBaseURLValue.appending(path: profile.username)
  }

  private var profileShareTitle: String {
    "\(profile.displayName) (@\(profile.username)) on 35mm"
  }

  private var profileSharePreview: SharePreviewContent {
    SharePreviewContent(
      type: .user,
      title: profile.displayName,
      imageURL: URL(string: profile.avatarUrlLg ?? profile.avatarUrl ?? ""),
      description: profile.bio
    )
  }

  private var avatarURL: URL? {
    (profile.avatarUrlLg ?? profile.avatarUrl).flatMap(URL.init(string:))
  }

  private var coverURL: URL? {
    profile.coverUrl.flatMap(URL.init(string:))
  }

  private var avatarPreviewAction: (() -> Void)? {
    guard avatarURL != nil else { return nil }
    return { openAvatar() }
  }

  private var coverPreviewAction: (() -> Void)? {
    guard coverURL != nil else { return nil }
    return { openCover() }
  }

  private var profileActionRows: [BottomActionSheetAction] {
    ProfileAction.available(for: profile).map { action in
      BottomActionSheetAction(
        action.title(username: profile.username),
        systemImage: action.systemImage,
        role: action.role
      ) {
        pendingProfileAction = action
      }
    }
  }

  private func postURL(for post: FeedPost) -> URL {
    AppConstants.webBaseURLValue
      .appending(path: post.author.username)
      .appending(path: "post")
      .appending(path: post.id)
  }

  private func editProfile() {
    editingProfile = profile
  }

  private func followTapped() {
    if profile.followState == .following {
      isShowingUnfollowConfirmation = true
    } else {
      Task { await model.toggleFollow() }
    }
  }

  private func showProfileActions() {
    isShowingProfileActions = true
  }

  private func shareProfile() {
    isShowingShareSheet = true
  }

  private func performPendingProfileAction() {
    guard let action = pendingProfileAction else { return }
    pendingProfileAction = nil

    switch action {
    case .copyLink:
      UIPasteboard.general.url = profileURL
    case .mute, .unmute:
      Task { await model.toggleMute() }
    case .block:
      isShowingBlockConfirmation = true
    }
  }

  private func openPost(_ post: FeedPost) {
    selectedPost = post
  }

  private func openAvatar() {
    guard let avatarURL else { return }
    selectedProfileMedia = ProfileMediaSelection(
      url: avatarURL,
      accessibilityLabel: "\(profile.displayName)'s profile photo",
      username: profile.username,
      isProfilePhoto: true
    )
  }

  private func openCover() {
    guard let coverURL else { return }
    selectedProfileMedia = ProfileMediaSelection(
      url: coverURL,
      accessibilityLabel: "\(profile.displayName)'s cover photo",
      username: profile.username,
      isProfilePhoto: false
    )
  }

  private func openImage(_ selection: ProfileImageSelection) {
    selectedImage = selection
  }
}

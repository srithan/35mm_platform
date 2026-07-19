import SwiftUI
import UIKit

struct ProfileLoadedView: View {
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

  var body: some View {
    ScrollView {
      LazyVStack(spacing: 0, pinnedViews: [.sectionHeaders]) {
        ProfileCoverView(url: profile.coverUrl)

        ProfileHeaderView(
          profile: profile,
          isFollowMutationPending: model.isFollowingMutation,
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
    .fullScreenCover(
      isPresented: $isShowingProfileActions,
      onDismiss: performPendingProfileAction
    ) {
      BottomActionSheet(title: "Profile actions", actions: profileActionRows)
    }
    .fullScreenCover(isPresented: $isShowingUnfollowConfirmation) {
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
    .fullScreenCover(isPresented: $isShowingBlockConfirmation) {
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
    .sheet(isPresented: $isShowingShareSheet) {
      ActivityShareSheet(items: [profileURL])
    }
    .fullScreenCover(item: $selectedImage) { selection in
      PostImageViewerView(
        destination: selection.destination,
        metrics: PostImageViewerMetrics(
          likeCount: selection.post.likeCount,
          commentCount: selection.post.commentCount,
          repostCount: selection.post.repostCount,
          shareCount: selection.post.bookmarkCount,
          isLiked: selection.post.isLiked
        ),
        onClose: { selectedImage = nil },
        onLike: { Task { await model.toggleLike(postId: selection.post.id) } },
        onComment: {
          selectedImage = nil
          selectedPost = selection.post
        },
        onRepost: { Task { await model.toggleRepost(postId: selection.post.id) } },
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

  private func openImage(_ selection: ProfileImageSelection) {
    selectedImage = selection
  }
}

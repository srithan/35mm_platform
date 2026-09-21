import SwiftUI
import UIKit

struct ProfileLoadedView: View {
  @EnvironmentObject private var env: AppEnvironment
  @Environment(\.accessibilityReduceMotion) private var accessibilityReduceMotion

  let profile: PublicProfile
  let model: ProfileViewModel
  let service: any ProfileServicing
  let onCurrentProfileUpdated: (PublicProfile) -> Void
  let onScrollDirectionChange: (ScrollChromeDirection) -> Void

  @State private var selectedTab: ProfileTab = .posts
  @State private var requestedTab: ProfileTab?
  @State private var pagerProgress = 0.0
  @State private var isShowingProfileActions = false
  @State private var isShowingUnfollowConfirmation = false
  @State private var isShowingBlockConfirmation = false
  @State private var isShowingShareSheet = false
  @State private var pendingProfileAction: ProfileAction?
  @State private var editingProfile: PublicProfile?
  @State private var selectedPost: FeedPost?
  @State private var selectedImage: ProfileImageSelection?
  @State private var selectedProfileMedia: ProfileMediaSelection?
  @State private var pullDistance: CGFloat = 0
  @State private var isRefreshArmed = false
  @State private var isRefreshing = false
  @State private var lastScrollMinY: CGFloat?
  @State private var lastScrollChromeDirection: ScrollChromeDirection = .top
  @State private var avatarSourceFrame: CGRect?
  @State private var coverSourceFrame: CGRect?

  var body: some View {
    ScrollView {
      LazyVStack(spacing: 0, pinnedViews: [.sectionHeaders]) {
        GeometryReader { proxy in
          Color.clear
            .preference(
              key: ProfileScrollPositionPreferenceKey.self,
              value: proxy.frame(in: .named(ProfileDesign.scrollCoordinateSpace)).minY
            )
        }
        .frame(height: 0)

        ProfileStretchyCoverView(
          url: profile.coverUrl,
          displayName: profile.displayName,
          pullDistance: pullDistance,
          isRefreshArmed: isRefreshArmed,
          isRefreshing: isRefreshing,
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
          ProfileFeedStartMarker()
            .frame(width: 0, height: 0)
            .accessibilityHidden(true)

          ProfileTabPager(
            profile: profile,
            model: model,
            selectedTab: selectedTab,
            isPrivateGate: isPrivateGate,
            onOpenPost: openPost,
            onOpenImage: openImage,
            onWillPresent: prepareTab,
            onSettled: commitPagerSelection,
            requestedTab: $requestedTab,
            progress: $pagerProgress
          )
        } header: {
          ProfileTabBar(
            selectedTab: selectedTab,
            selectionProgress: pagerProgress,
            onSelect: selectTab
          )
        }
      }
    }
    .background {
      ProfileNativeRefreshControl(isRefreshing: isRefreshing) { scrollView in
        startProfileRefresh(in: scrollView)
      }
      .frame(width: 0, height: 0)
      .accessibilityHidden(true)
    }
    .coordinateSpace(name: ProfileDesign.scrollCoordinateSpace)
    .onPreferenceChange(ProfileScrollPositionPreferenceKey.self) { minY in
      handleScrollPosition(minY)
    }
    .task(id: selectedTab) {
      guard !isPrivateGate else { return }
      await model.loadTabIfNeeded(selectedTab)
    }
    .onPreferenceChange(ProfileAvatarFramePreferenceKey.self) { frame in
      avatarSourceFrame = frame
    }
    .onPreferenceChange(ProfileCoverFramePreferenceKey.self) { frame in
      coverSourceFrame = frame
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
      isProfilePhoto: true,
      sourceFrame: avatarSourceFrame
    )
  }

  private func openCover() {
    guard let coverURL else { return }
    selectedProfileMedia = ProfileMediaSelection(
      url: coverURL,
      accessibilityLabel: "\(profile.displayName)'s cover photo",
      username: profile.username,
      isProfilePhoto: false,
      sourceFrame: coverSourceFrame
    )
  }

  private func openImage(_ selection: ProfileImageSelection) {
    selectedImage = selection
  }

  private func startProfileRefresh(in scrollView: UIScrollView) {
    guard !isRefreshing else { return }

    isRefreshing = true
    isRefreshArmed = true
    scrollToFeedStart(in: scrollView)
    scheduleSettledFeedStartScroll(in: scrollView)

    Task { @MainActor in
      await model.refresh(selectedTab: selectedTab)
      isRefreshing = false
      isRefreshArmed = false

      scrollToFeedStart(in: scrollView)
    }
  }

  private func selectTab(_ tab: ProfileTab) {
    guard tab != selectedTab, requestedTab == nil else { return }
    prepareTab(tab)

    if accessibilityReduceMotion {
      commitPagerSelection(tab)
    } else {
      requestedTab = tab
    }
  }

  private func commitPagerSelection(_ tab: ProfileTab) {
    prepareTab(tab)
    selectedTab = tab
    requestedTab = nil
  }

  private func prepareTab(_ tab: ProfileTab) {
    guard !isPrivateGate else { return }
    Task { await model.loadTabIfNeeded(tab) }
  }

  private func handleScrollPosition(_ minY: CGFloat) {
    let pullDistance = max(minY, 0)
    self.pullDistance = pullDistance

    if !isRefreshing {
      if pullDistance >= ProfileDesign.pullRefreshThreshold {
        isRefreshArmed = true
      } else if pullDistance <= 4 {
        isRefreshArmed = false
      }
    }

    let scrollOffset = max(-minY, 0)
    defer { lastScrollMinY = minY }

    guard scrollOffset > ScrollChromeDirection.topLock else {
      reportScrollChromeDirection(.top)
      return
    }

    guard let lastScrollMinY else { return }
    let delta = minY - lastScrollMinY

    if delta < -ScrollChromeDirection.hideDelta {
      reportScrollChromeDirection(.down)
    } else if delta > ScrollChromeDirection.showDelta {
      reportScrollChromeDirection(.up)
    }
  }

  private func reportScrollChromeDirection(_ direction: ScrollChromeDirection) {
    guard direction != lastScrollChromeDirection else { return }

    lastScrollChromeDirection = direction
    onScrollDirectionChange(direction)
  }

  private func scrollToFeedStart(in scrollView: UIScrollView) {
    guard let targetY = scrollView.profileFeedStartTargetOffsetY else { return }

    let minimumY = -scrollView.adjustedContentInset.top
    let maximumY = max(
      minimumY,
      scrollView.contentSize.height - scrollView.bounds.height + scrollView.adjustedContentInset.bottom
    )
    let clampedTargetY = min(max(targetY, minimumY), maximumY)
    let targetOffset = CGPoint(x: scrollView.contentOffset.x, y: clampedTargetY)

    guard abs(scrollView.contentOffset.y - targetOffset.y) > 1 else { return }

    if accessibilityReduceMotion {
      scrollView.setContentOffset(targetOffset, animated: false)
    } else {
      UIView.animate(
        withDuration: 0.28,
        delay: 0,
        options: [.beginFromCurrentState, .curveEaseOut],
        animations: {
          scrollView.setContentOffset(targetOffset, animated: false)
        }
      )
    }
  }

  private func scheduleSettledFeedStartScroll(in scrollView: UIScrollView) {
    Task { @MainActor in
      try? await Task.sleep(nanoseconds: 80_000_000)
      guard isRefreshing else { return }

      scrollToFeedStart(in: scrollView)
    }
  }
}

@MainActor
private struct ProfileFeedStartMarker: UIViewRepresentable {
  func makeUIView(context: Context) -> ProfileFeedStartMarkerView {
    ProfileFeedStartMarkerView(frame: .zero)
  }

  func updateUIView(_ uiView: ProfileFeedStartMarkerView, context: Context) {}
}

@MainActor
private final class ProfileFeedStartMarkerView: UIView {}

@MainActor
private struct ProfileNativeRefreshControl: UIViewRepresentable {
  let isRefreshing: Bool
  let onRefresh: (UIScrollView) -> Void

  func makeCoordinator() -> Coordinator {
    Coordinator(onRefresh: onRefresh)
  }

  func makeUIView(context: Context) -> ProfileNativeRefreshControlView {
    let view = ProfileNativeRefreshControlView(frame: .zero)
    view.isUserInteractionEnabled = false
    view.onHierarchyChanged = { [coordinator = context.coordinator] observerView in
      coordinator.attach(from: observerView)
    }

    return view
  }

  func updateUIView(_ uiView: ProfileNativeRefreshControlView, context: Context) {
    context.coordinator.onRefresh = onRefresh
    uiView.onHierarchyChanged = { [coordinator = context.coordinator] observerView in
      coordinator.attach(from: observerView)
    }
    uiView.attachIfPossible()
    context.coordinator.update(isRefreshing: isRefreshing)
  }

  @MainActor
  final class Coordinator: NSObject {
    var onRefresh: (UIScrollView) -> Void

    private weak var scrollView: UIScrollView?
    private let refreshControl = UIRefreshControl()

    init(onRefresh: @escaping (UIScrollView) -> Void) {
      self.onRefresh = onRefresh
      super.init()
      refreshControl.tintColor = .clear
      refreshControl.addTarget(self, action: #selector(refreshControlTriggered), for: .valueChanged)
    }

    func attach(from view: UIView) {
      guard let scrollView = view.profileNearbyScrollView, scrollView !== self.scrollView else {
        return
      }

      if self.scrollView?.refreshControl === refreshControl {
        self.scrollView?.refreshControl = nil
      }

      self.scrollView = scrollView
      scrollView.refreshControl = refreshControl
    }

    func update(isRefreshing: Bool) {
      if !isRefreshing, refreshControl.isRefreshing {
        refreshControl.endRefreshing()
      }
    }

    @objc private func refreshControlTriggered() {
      guard let scrollView else { return }

      onRefresh(scrollView)
    }
  }
}

@MainActor
private final class ProfileNativeRefreshControlView: UIView {
  var onHierarchyChanged: ((ProfileNativeRefreshControlView) -> Void)?

  override func didMoveToSuperview() {
    super.didMoveToSuperview()
    attachIfPossible()
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    attachIfPossible()
  }

  func attachIfPossible() {
    onHierarchyChanged?(self)
  }
}

@MainActor
fileprivate extension UIView {
  var profileNearbyScrollView: UIScrollView? {
    if let enclosingScrollView {
      return enclosingScrollView
    }

    var view = superview

    while let candidate = view {
      if let scrollView = candidate.firstProfileDescendant(of: UIScrollView.self) {
        return scrollView
      }

      view = candidate.superview
    }

    return nil
  }

  private var enclosingScrollView: UIScrollView? {
    var view = superview

    while let candidate = view {
      if let scrollView = candidate as? UIScrollView {
        return scrollView
      }

      view = candidate.superview
    }

    return nil
  }

  func firstProfileDescendant<T: UIView>(of type: T.Type) -> T? {
    for subview in subviews {
      if let match = subview as? T {
        return match
      }

      if let match = subview.firstProfileDescendant(of: type) {
        return match
      }
    }

    return nil
  }
}

@MainActor
private extension UIScrollView {
  var profileFeedStartTargetOffsetY: CGFloat? {
    guard let marker = firstProfileDescendant(of: ProfileFeedStartMarkerView.self) else {
      return nil
    }

    let markerMinY = marker.convert(marker.bounds, to: self).minY
    return contentOffset.y + markerMinY - ProfileDesign.tabBarHeight
  }
}

private struct ProfileScrollPositionPreferenceKey: PreferenceKey {
  static let defaultValue: CGFloat = 0

  static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
    value = nextValue()
  }
}

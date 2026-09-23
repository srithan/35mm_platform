import SwiftUI
import UIKit

struct ProfileLoadedView: View {
  @EnvironmentObject private var env: AppEnvironment
  @Environment(\.appRouteNavigator) private var appRouteNavigator
  @Environment(\.theme) private var theme
  @Environment(\.accessibilityReduceMotion) private var accessibilityReduceMotion

  let profile: PublicProfile
  let model: ProfileViewModel
  let service: any ProfileServicing
  var showsCollapsingHeader = false
  var onBack: (() -> Void)?
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
  @State private var selectedImage: ProfileImageSelection?
  @State private var selectedProfileMedia: ProfileMediaSelection?
  @State private var pullDistance: CGFloat = 0
  @State private var isRefreshArmed = false
  @State private var isRefreshing = false
  @State private var lastScrollMinY: CGFloat?
  @State private var lastScrollChromeDirection: ScrollChromeDirection = .top
  @State private var scrollOffset: CGFloat = 0
  @State private var avatarSourceFrame: CGRect?
  @State private var coverSourceFrame: CGRect?
  @State private var nameContentFrame: CGRect?
  @State private var actionsContentFrame: CGRect?

  var body: some View {
    GeometryReader { proxy in
      let topInset = showsCollapsingHeader ? proxy.safeAreaInsets.top : 0
      profileContent(topInset: topInset, width: proxy.size.width)
        .ignoresSafeArea(edges: showsCollapsingHeader ? .top : [])
    }
  }

  private func profileContent(topInset: CGFloat, width: CGFloat) -> some View {
    let headerHeight = showsCollapsingHeader
      ? topInset + ProfileDesign.collapsedHeaderContentHeight : 0

    return ScrollView {
      LazyVStack(spacing: 0, pinnedViews: [.sectionHeaders]) {
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
          onMore: showProfileActions,
          onNameFrameChange: { nameContentFrame = $0 },
          onActionsFrameChange: { actionsContentFrame = $0 }
        )
        .background(theme.bg)

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
      .coordinateSpace(name: ProfileDesign.contentCoordinateSpace)
      // Keep the expanded cover at the screen edge while the section header
      // pins at the scroll view's reserved compact-header safe area.
      .padding(.top, -headerHeight)
    }
    .safeAreaPadding(.top, headerHeight)
    .background {
      ProfileNativeRefreshControl(
        isRefreshing: isRefreshing,
        onScroll: { offset in handleScrollPosition(-offset) },
        onRefresh: startProfileRefresh
      )
      .frame(width: 0, height: 0)
      .accessibilityHidden(true)
    }
    .coordinateSpace(name: ProfileDesign.scrollCoordinateSpace)
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
      ZStack(alignment: .top) {
        if showsCollapsingHeader, let onBack {
          collapsingHeaderOverlay(topInset: topInset, width: width, onBack: onBack)
        }

        if let error = model.actionError {
          ProfileErrorBanner(message: error, onDismiss: model.clearActionError)
            .padding(.horizontal, 14)
            .padding(.top, showsCollapsingHeader ? headerHeight + 8 : 8)
        }
      }
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
    .postImageViewer(
      item: $selectedImage,
      destination: \.destination,
      transitionSource: \.transitionSource
    ) { selection, transitionSession in
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
        transitionSession: transitionSession,
        onClose: transitionSession.dismiss,
        onLike: { Task { await model.toggleLike(postId: selection.post.id) } },
        onComment: {
          appRouteNavigator(.post(PostDestination(post: selection.post)))
        },
        onRepost: { Task { await model.toggleRepost(postId: selection.post.id) } },
        onQuote: {
          env.presentComposer(quoting: selection.post)
        },
        onShare: {
          UIPasteboard.general.url = postURL(for: selection.post)
        }
      )
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

  private var collapsedHeaderSubtitle: String {
    "\(profile.filmsLoggedCount.compactFormatted) \(profile.filmsLoggedCount == 1 ? "film" : "films") logged"
  }

  private func headerRevealProgress(frame: CGRect?, topInset: CGFloat) -> Double {
    guard let frame, frame.height > 0 else { return 0 }
    let headerBottom = topInset + ProfileDesign.collapsedHeaderContentHeight
    // Frames are measured in content coordinates, so native scroll offset is
    // the only per-frame input, even after SwiftUI recycles the source rows.
    return min(max(Double((scrollOffset + headerBottom - frame.minY) / frame.height), 0), 1)
  }

  private func collapseProgress(topInset: CGFloat, width: CGFloat) -> Double {
    let coverHeight = width / ProfileDesign.coverAspectRatio
    let transformDistance = max(coverHeight - topInset - ProfileDesign.collapsedHeaderContentHeight, 1)
    return min(max(Double(scrollOffset / transformDistance), 0), 1)
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
    appRouteNavigator(.post(PostDestination(post: post)))
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
    self.scrollOffset = scrollOffset
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

  private func collapsingHeaderOverlay(
    topInset: CGFloat,
    width: CGFloat,
    onBack: @escaping () -> Void
  ) -> some View {
    ProfileNavigationHeader(
      title: profile.displayName,
      subtitle: collapsedHeaderSubtitle,
      coverUrl: profile.coverUrl,
      collapseProgress: collapseProgress(topInset: topInset, width: width),
      topInset: topInset,
      titleProgress: headerRevealProgress(frame: nameContentFrame, topInset: topInset),
      actionsProgress: headerRevealProgress(frame: actionsContentFrame, topInset: topInset),
      onBack: onBack,
      onShare: shareProfile,
      onMore: showProfileActions
    )
    .frame(height: topInset + ProfileDesign.collapsedHeaderContentHeight)
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
  let onScroll: (CGFloat) -> Void
  let onRefresh: (UIScrollView) -> Void

  func makeCoordinator() -> Coordinator {
    Coordinator(onScroll: onScroll, onRefresh: onRefresh)
  }

  static func dismantleUIView(_ uiView: ProfileNativeRefreshControlView, coordinator: Coordinator) {
    uiView.onHierarchyChanged = nil
    coordinator.detach()
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
    context.coordinator.onScroll = onScroll
    context.coordinator.onRefresh = onRefresh
    uiView.onHierarchyChanged = { [coordinator = context.coordinator] observerView in
      coordinator.attach(from: observerView)
    }
    uiView.attachIfPossible()
    context.coordinator.update(isRefreshing: isRefreshing)
  }

  @MainActor
  final class Coordinator: NSObject {
    var onScroll: (CGFloat) -> Void
    var onRefresh: (UIScrollView) -> Void

    private var offsetObservation: NSKeyValueObservation?
    private var insetObservation: NSKeyValueObservation?
    private var isScrollUpdateScheduled = false
    private weak var scrollView: UIScrollView?
    private let refreshControl = UIRefreshControl()

    init(onScroll: @escaping (CGFloat) -> Void, onRefresh: @escaping (UIScrollView) -> Void) {
      self.onScroll = onScroll
      self.onRefresh = onRefresh
      super.init()
      refreshControl.tintColor = .clear
      refreshControl.addTarget(self, action: #selector(refreshControlTriggered), for: .valueChanged)
    }

    func attach(from view: UIView) {
      guard let scrollView = view.profileNearbyScrollView, scrollView !== self.scrollView else {
        return
      }

      detach()
      self.scrollView = scrollView
      scrollView.refreshControl = refreshControl
      offsetObservation = scrollView.observe(\.contentOffset, options: [.initial, .new]) { [weak self] _, _ in
        MainActor.assumeIsolated { self?.scheduleScrollUpdate() }
      }
      insetObservation = scrollView.observe(\.adjustedContentInset, options: [.new]) { [weak self] _, _ in
        MainActor.assumeIsolated { self?.scheduleScrollUpdate() }
      }
    }

    func detach() {
      offsetObservation = nil
      insetObservation = nil
      if scrollView?.refreshControl === refreshControl {
        scrollView?.refreshControl = nil
      }
      scrollView = nil
    }

    private func scheduleScrollUpdate() {
      guard !isScrollUpdateScheduled else { return }
      isScrollUpdateScheduled = true
      // Deliver outside representable layout, coalescing to the latest native
      // offset. This remains valid after the cover leaves the lazy viewport.
      DispatchQueue.main.async { [weak self] in
        guard let self else { return }
        self.isScrollUpdateScheduled = false
        guard let scrollView = self.scrollView else { return }
        self.onScroll(scrollView.contentOffset.y + scrollView.adjustedContentInset.top)
      }
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
    return contentOffset.y + markerMinY - ProfileDesign.tabBarHeight - adjustedContentInset.top
  }
}

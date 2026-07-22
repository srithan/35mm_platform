import SwiftUI

struct ProfileTabPager: View {
  @Environment(\.layoutDirection) private var layoutDirection
  @Environment(\.accessibilityReduceMotion) private var accessibilityReduceMotion
  @Environment(\.accessibilityVoiceOverEnabled) private var accessibilityVoiceOverEnabled

  let profile: PublicProfile
  let model: ProfileViewModel
  let selectedTab: ProfileTab
  let isPrivateGate: Bool
  let onOpenPost: (FeedPost) -> Void
  let onOpenImage: (ProfileImageSelection) -> Void
  let onWillPresent: (ProfileTab) -> Void
  let onSettled: (ProfileTab) -> Void

  @Binding var requestedTab: ProfileTab?
  @Binding var progress: Double

  @State private var pageWidth: CGFloat = 0
  @State private var transitionTarget: ProfileTab?
  @State private var sourceOffset: CGFloat = 0

  var body: some View {
    ZStack(alignment: .topLeading) {
      page(selectedTab, isActive: transitionTarget == nil)
        .offset(x: sourceOffset)
    }
    .frame(maxWidth: .infinity, alignment: .topLeading)
    .overlay(alignment: .topLeading) {
      if let transitionTarget {
        page(transitionTarget, isActive: false)
          .frame(width: pageWidth, alignment: .topLeading)
          .offset(
            x: sourceOffset + selectedTab.visualDirection(
              to: transitionTarget,
              isRightToLeft: isRightToLeft
            ) * pageWidth
          )
          .allowsHitTesting(false)
          .accessibilityHidden(true)
      }
    }
    .contentShape(.rect)
    .clipped()
    .background {
      ProfilePagingPanGesture(
        isEnabled: requestedTab == nil && !accessibilityVoiceOverEnabled,
        shouldBegin: canBeginPan,
        onChanged: handlePanChanged,
        onEnded: handlePanEnded,
        onCancelled: cancelInteractiveTransition
      )
    }
    .onGeometryChange(for: CGFloat.self) { geometry in
      geometry.size.width
    } action: { width in
      pageWidth = width
      beginRequestedTransitionIfPossible()
    }
    .onChange(of: requestedTab) {
      beginRequestedTransitionIfPossible()
    }
    .onChange(of: selectedTab) { _, tab in
      guard transitionTarget == nil else { return }
      progress = Double(tab.index)
    }
    .onDisappear {
      resetTransition(to: selectedTab)
    }
  }

  private var isRightToLeft: Bool {
    layoutDirection == .rightToLeft
  }

  private func page(_ tab: ProfileTab, isActive: Bool) -> some View {
    ProfileTabPage(
      tab: tab,
      profile: profile,
      model: model,
      isActive: isActive,
      isPrivateGate: isPrivateGate,
      onOpenPost: onOpenPost,
      onOpenImage: onOpenImage
    )
  }

  private func canBeginPan(horizontalVelocity: CGFloat) -> Bool {
    requestedTab == nil
      && transitionTarget == nil
      && pageWidth > 0
      && selectedTab.adjacentTab(
        for: horizontalVelocity,
        isRightToLeft: isRightToLeft
      ) != nil
  }

  private func handlePanChanged(_ translation: CGFloat) {
    guard requestedTab == nil, pageWidth > 0 else { return }
    let target = selectedTab.adjacentTab(
      for: translation,
      isRightToLeft: isRightToLeft
    )
    if transitionTarget != target {
      transitionTarget = target
      if let target {
        onWillPresent(target)
      }
    }

    sourceOffset = target == nil
      ? translation * 0.18
      : translation
    progress = ProfileTab.dragProgress(
      from: selectedTab,
      translation: sourceOffset,
      pageWidth: pageWidth,
      isRightToLeft: isRightToLeft
    )
  }

  private func handlePanEnded(_ translation: CGFloat, velocity: CGFloat) {
    guard let target = transitionTarget else {
      cancelInteractiveTransition()
      return
    }

    let targetDirection = selectedTab.visualDirection(
      to: target,
      isRightToLeft: isRightToLeft
    )
    let shouldSettle = ProfileTab.shouldSettleDrag(
      translation: translation,
      predictedTranslation: translation + (velocity * ProfileDesign.tabSwipeProjectionTime),
      pageWidth: pageWidth,
      targetDirection: targetDirection
    )

    if shouldSettle {
      settleTransition(to: target, targetDirection: targetDirection)
    } else {
      cancelInteractiveTransition()
    }
  }

  private func beginRequestedTransitionIfPossible() {
    guard let target = requestedTab,
          target != selectedTab,
          transitionTarget == nil,
          pageWidth > 0 else {
      return
    }

    transitionTarget = target
    sourceOffset = 0
    onWillPresent(target)

    let targetDirection = selectedTab.visualDirection(
      to: target,
      isRightToLeft: isRightToLeft
    )

    if accessibilityReduceMotion {
      completeTransition(to: target)
      return
    }

    Task { @MainActor in
      await Task.yield()
      guard transitionTarget == target else { return }
      settleTransition(to: target, targetDirection: targetDirection)
    }
  }

  private func settleTransition(to target: ProfileTab, targetDirection: CGFloat) {
    guard transitionTarget == target else { return }

    if accessibilityReduceMotion {
      completeTransition(to: target)
      return
    }

    withAnimation(ProfileDesign.tabTransition) {
      sourceOffset = -targetDirection * pageWidth
      progress = Double(target.index)
    } completion: {
      guard transitionTarget == target else { return }
      completeTransition(to: target)
    }
  }

  private func cancelInteractiveTransition() {
    guard transitionTarget != nil || sourceOffset != 0 else { return }

    if accessibilityReduceMotion {
      resetTransition(to: selectedTab)
      return
    }

    withAnimation(ProfileDesign.tabTransition) {
      sourceOffset = 0
      progress = Double(selectedTab.index)
    } completion: {
      guard requestedTab == nil else { return }
      resetTransition(to: selectedTab)
    }
  }

  private func completeTransition(to target: ProfileTab) {
    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction) {
      sourceOffset = 0
      transitionTarget = nil
      progress = Double(target.index)
      onSettled(target)
    }
  }

  private func resetTransition(to tab: ProfileTab) {
    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction) {
      sourceOffset = 0
      transitionTarget = nil
      progress = Double(tab.index)
    }
  }
}

import Kingfisher
import SwiftUI
import UIKit

struct PostImageViewerMetrics {
  let likeCount: Int
  let commentCount: Int
  let repostCount: Int
  let shareCount: Int
  let isLiked: Bool
}

struct PostImageViewerView: View {
  @Environment(\.dismiss) private var dismiss

  let destination: PostImageDestination
  let metrics: PostImageViewerMetrics
  let onClose: () -> Void
  let onLike: () -> Void
  let onComment: () -> Void
  let onRepost: () -> Void
  let onShare: () -> Void

  @State private var isShowingActions = false
  @State private var selectedIndex: Int

  init(
    destination: PostImageDestination,
    metrics: PostImageViewerMetrics,
    onClose: @escaping () -> Void,
    onLike: @escaping () -> Void,
    onComment: @escaping () -> Void,
    onRepost: @escaping () -> Void,
    onShare: @escaping () -> Void
  ) {
    self.destination = destination
    self.metrics = metrics
    self.onClose = onClose
    self.onLike = onLike
    self.onComment = onComment
    self.onRepost = onRepost
    self.onShare = onShare
    _selectedIndex = State(initialValue: destination.initialIndex)
  }

  var body: some View {
    ZStack {
      Color.black
        .ignoresSafeArea()

      imageSurface

      VStack {
        topControls
        Spacer()
        bottomActions
      }
      .padding(.horizontal, 20)
      .padding(.vertical, 14)
    }
    .statusBarHidden()
    .fullScreenCover(isPresented: $isShowingActions) {
      BottomActionSheet(
        title: "Image actions",
        sections: [
          BottomActionSheetSection(actions: [
            BottomActionSheetAction("Copy link", systemImage: "link") {
              UIPasteboard.general.string = currentImageURL
            },
          ]),
          BottomActionSheetSection(actions: [
            BottomActionSheetAction("Save", systemImage: "square.and.arrow.down") {
              // TODO: Save image to Photos after photo-library permission flow is added.
            },
            BottomActionSheetAction("Report", systemImage: "exclamationmark.bubble", role: .destructive) {
              // TODO: Open report flow when moderation API exists.
            },
          ]),
        ]
      )
    }
  }

  private var imageSurface: some View {
    TabView(selection: $selectedIndex) {
      ForEach(destination.urls.indices, id: \.self) { index in
        KFImage(URL(string: destination.urls[index]))
          .placeholder {
            ProgressView()
              .tint(.white)
              .frame(maxWidth: .infinity, maxHeight: .infinity)
          }
          .resizable()
          .scaledToFit()
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .accessibilityLabel("Image \(index + 1) of \(destination.urls.count)")
          .tag(index)
      }
    }
    .tabViewStyle(.page(indexDisplayMode: .never))
  }

  private var topControls: some View {
    ZStack {
      HStack {
        circleButton(systemImage: "xmark") {
          onClose()
        }
        .accessibilityLabel("Close image")

        Spacer()

        circleButton(systemImage: "ellipsis") {
          isShowingActions = true
        }
        .accessibilityLabel("Image actions")
      }

      if destination.urls.count > 1 {
        Text("\(selectedIndex + 1) / \(destination.urls.count)")
          .font(.subheadline.weight(.semibold))
          .monospacedDigit()
          .foregroundStyle(.white)
          .padding(.horizontal, 12)
          .padding(.vertical, 7)
          .background(Color.black.opacity(0.45), in: Capsule())
          .accessibilityLabel("Image \(selectedIndex + 1) of \(destination.urls.count)")
      }
    }
  }

  private var currentImageURL: String {
    destination.urls[selectedIndex]
  }

  private var bottomActions: some View {
    HStack(spacing: 28) {
      viewerAction(
        image: Image(metrics.isLiked ? "PostActionHeartFilled" : "PostActionHeart"),
        count: metrics.likeCount,
        isActive: metrics.isLiked,
        action: onLike
      )

      viewerAction(image: Image("PostActionComment"), count: metrics.commentCount) {
        onClose()
        onComment()
      }

      viewerAction(image: Image("PostActionRepost"), count: metrics.repostCount, action: onRepost)
      viewerAction(image: Image(systemName: "paperplane"), count: metrics.shareCount, action: onShare)
    }
    .padding(.bottom, 8)
  }

  private func circleButton(systemImage: String, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      Image(systemName: systemImage)
        .font(.system(size: 18, weight: .medium))
        .foregroundStyle(.white)
        .frame(width: 46, height: 46)
        .background(Color.white.opacity(0.13), in: Circle())
    }
    .buttonStyle(.plain)
  }

  private func viewerAction(
    image: Image,
    count: Int,
    isActive: Bool = false,
    action: @escaping () -> Void
  ) -> some View {
    Button(action: action) {
      HStack(spacing: 8) {
        image
          .resizable()
          .scaledToFit()
          .frame(width: 24, height: 24)

        if count > 0 {
          Text(count.compactFormatted)
            .font(.system(size: 18, weight: .bold, design: .rounded))
            .monospacedDigit()
        }
      }
      .foregroundStyle(isActive ? Color(red: 1.0, green: 0.02, blue: 0.22) : .white)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
  }
}

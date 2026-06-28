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
              UIPasteboard.general.string = destination.url
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
    ScrollView([.horizontal, .vertical], showsIndicators: false) {
      KFImage(URL(string: destination.url))
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
  }

  private var topControls: some View {
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
  }

  private var bottomActions: some View {
    HStack(spacing: 28) {
      viewerAction(
        systemImage: metrics.isLiked ? "heart.fill" : "heart",
        count: metrics.likeCount,
        isActive: metrics.isLiked,
        action: onLike
      )

      viewerAction(systemImage: "bubble.right", count: metrics.commentCount) {
        onClose()
        onComment()
      }

      viewerAction(systemImage: "arrow.2.squarepath", count: metrics.repostCount, action: onRepost)
      viewerAction(systemImage: "paperplane", count: metrics.shareCount, action: onShare)
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
    systemImage: String,
    count: Int,
    isActive: Bool = false,
    action: @escaping () -> Void
  ) -> some View {
    Button(action: action) {
      HStack(spacing: 8) {
        Image(systemName: systemImage)
          .font(.system(size: 24, weight: .medium))

        Text(count.compactFormatted)
          .font(.system(size: 18, weight: .bold, design: .rounded))
          .monospacedDigit()
      }
      .foregroundStyle(isActive ? Color(red: 1.0, green: 0.02, blue: 0.22) : .white)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
  }
}

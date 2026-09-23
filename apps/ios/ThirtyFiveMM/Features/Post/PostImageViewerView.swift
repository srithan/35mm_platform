import Kingfisher
import SwiftUI
import UIKit

struct PostImageViewerMetrics {
  let likeCount: Int
  let commentCount: Int
  let repostCount: Int
  let shareCount: Int
  let isLiked: Bool
  let isReposted: Bool
}

enum PostImageViewerLayout {
  static let topChromeInset: CGFloat = 86
  static let bottomChromeInset: CGFloat = 132

  static func fittedImageSize(imageSize: CGSize?, in containerSize: CGSize) -> CGSize {
    guard
      let imageSize,
      imageSize.width > 0,
      imageSize.height > 0,
      containerSize.width > 0,
      containerSize.height > 0
    else {
      return containerSize
    }

    let scale = containerSize.width / imageSize.width
    return CGSize(width: imageSize.width * scale, height: imageSize.height * scale)
  }

  static func fittedImageFrame(
    imageSize: CGSize?,
    in containerSize: CGSize,
    topInset: CGFloat = topChromeInset,
    bottomInset: CGFloat = bottomChromeInset
  ) -> CGRect {
    let availableHeight = max(1, containerSize.height - topInset - bottomInset)
    let availableSize = CGSize(width: containerSize.width, height: availableHeight)
    let fittedSize = fittedImageSize(imageSize: imageSize, in: availableSize)
    let originX = max(0, (containerSize.width - fittedSize.width) / 2)
    let originY = topInset + max(0, (availableHeight - fittedSize.height) / 2)

    return CGRect(origin: CGPoint(x: originX, y: originY), size: fittedSize)
  }
}

struct PostImageViewerView: View {
  @Environment(\.theme) private var theme

  let destination: PostImageDestination
  let metrics: PostImageViewerMetrics
  let onClose: () -> Void
  let onLike: () -> Void
  let onComment: () -> Void
  let onRepost: () -> Void
  let onQuote: (() -> Void)?
  let onShare: () -> Void

  @State private var isShowingActions = false
  @State private var isShowingRepostActions = false
  @State private var selectedIndex: Int
  @StateObject private var imageSaver = ImageSaveCoordinator()

  init(
    destination: PostImageDestination,
    metrics: PostImageViewerMetrics,
    onClose: @escaping () -> Void,
    onLike: @escaping () -> Void,
    onComment: @escaping () -> Void,
    onRepost: @escaping () -> Void,
    onQuote: (() -> Void)? = nil,
    onShare: @escaping () -> Void
  ) {
    self.destination = destination
    self.metrics = metrics
    self.onClose = onClose
    self.onLike = onLike
    self.onComment = onComment
    self.onRepost = onRepost
    self.onQuote = onQuote
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
    .bottomActionSheet(isPresented: $isShowingActions) {
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
              guard let url = URL(string: currentImageURL) else { return }
              imageSaver.saveImage(at: url)
            },
          ]),
        ]
      )
    }
    .alert(item: $imageSaver.alert) { alert in
      Alert(
        title: Text(alert.title),
        message: Text(alert.message),
        dismissButton: .default(Text("OK"))
      )
    }
    .bottomActionSheet(isPresented: $isShowingRepostActions) {
      BottomActionSheet(
        title: "Repost options",
        actions: [
          BottomActionSheetAction(
            metrics.isReposted ? "Undo repost" : "Repost",
            systemImage: "arrow.2.squarepath",
            action: onRepost
          ),
          BottomActionSheetAction("Quote", systemImage: "quote.bubble") {
            onClose()
            onQuote?()
          },
        ]
      )
    }
  }

  private var imageSurface: some View {
    TabView(selection: $selectedIndex) {
      ForEach(destination.urls.indices, id: \.self) { index in
        PostImageViewerPage(
          url: destination.urls[index],
          index: index,
          count: destination.urls.count,
          onShowActions: {
            isShowingActions = true
          },
          onClose: onClose
        )
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
    .frame(height: 54)
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
        accessibilityLabel: metrics.isLiked ? "Unlike post" : "Like post",
        action: onLike
      )

      viewerAction(
        image: Image("PostActionComment"),
        count: metrics.commentCount,
        accessibilityLabel: "Open comments"
      ) {
        onClose()
        onComment()
      }

      viewerAction(
        image: Image(metrics.isReposted ? "PostActionRepostFilled" : "PostActionRepost"),
        count: metrics.repostCount,
        isActive: metrics.isReposted,
        activeColor: theme.repost,
        accessibilityLabel: metrics.isReposted
          ? "Repost options, reposted"
          : "Repost options, not reposted"
      ) {
        if onQuote == nil {
          onRepost()
        } else {
          isShowingRepostActions = true
        }
      }
      viewerAction(
        image: Image(systemName: "paperplane"),
        count: metrics.shareCount,
        accessibilityLabel: "Share post",
        action: onShare
      )
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
    activeColor: Color = DesignSystem.Colors.like,
    accessibilityLabel: String,
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
            .font(.headline)
            .monospacedDigit()
        }
      }
      .foregroundStyle(isActive ? activeColor : .white)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .accessibilityLabel(accessibilityLabel)
  }
}

private struct PostImageViewerPage: View {
  let url: String
  let index: Int
  let count: Int
  let onShowActions: () -> Void
  let onClose: () -> Void

  @State private var imageSize: CGSize?

  var body: some View {
    GeometryReader { proxy in
      let fittedFrame = PostImageViewerLayout.fittedImageFrame(
        imageSize: imageSize,
        in: proxy.size
      )

      ZStack(alignment: .topLeading) {
        Color.black
          .contentShape(Rectangle())
          .onTapGesture(perform: onClose)

        KFImage(URL(string: url))
          .placeholder {
            ProgressView()
              .tint(.white)
              .frame(width: fittedFrame.width, height: fittedFrame.height)
          }
          .onSuccess { result in
            imageSize = result.image.size
          }
          .resizable()
          .scaledToFit()
          .frame(width: fittedFrame.width, height: fittedFrame.height)
          .contentShape(Rectangle())
          .offset(x: fittedFrame.minX, y: fittedFrame.minY)
          .accessibilityLabel("Image \(index + 1) of \(count)")
          .onTapGesture {}
          .onLongPressGesture(perform: onShowActions)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
    .ignoresSafeArea()
  }
}

import Kingfisher
import SwiftUI

struct ImageViewerView: View {
  @Environment(\.verticalSizeClass) private var verticalSizeClass
  @Environment(\.accessibilityReduceMotion) private var accessibilityReduceMotion

  private static let regularCircularImageSize = 240.0
  private static let compactCircularImageSize = 168.0
  private static let regularCoverImageMaxHeight = 420.0
  private static let compactCoverImageMaxHeight = 220.0
  private static let entranceDuration = 0.42
  private static let exitDuration = 0.22
  private static let backdropTargetOpacity = 0.82

  let url: URL
  let accessibilityLabel: String
  let footerText: String
  let isCircular: Bool
  let sourceFrame: CGRect?
  let onClose: () -> Void

  @State private var isPresented = false
  @State private var isClosing = false
  @State private var imageFrame: CGRect?
  @State private var didRequestPresentation = false

  var body: some View {
    ZStack {
      Color.black
        .opacity(isPresented ? Self.backdropTargetOpacity : 0)
        .ignoresSafeArea()
        .onTapGesture(perform: close)

      VStack(spacing: 16) {
        Spacer(minLength: verticalSpacing)

        KFImage(url)
          .placeholder {
            ProgressView()
              .tint(.white)
              .frame(maxWidth: .infinity, maxHeight: .infinity)
          }
          .onFailureView {
            ContentUnavailableView(
              "Image unavailable",
              systemImage: "photo.badge.exclamationmark",
              description: Text("This image couldn't be loaded.")
            )
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
          }
          .retry(maxCount: 2, interval: .seconds(1))
          .resizable()
          .aspectRatio(contentMode: isCircular ? .fill : .fit)
          .frame(
            width: isCircular ? circularImageSize : nil,
            height: isCircular ? circularImageSize : nil
          )
          .frame(
            maxWidth: isCircular ? nil : .infinity,
            maxHeight: isCircular ? nil : coverImageMaxHeight
          )
          .clipShape(isCircular ? AnyShape(Circle()) : AnyShape(Rectangle()))
          .overlay {
            if isCircular {
              Circle().stroke(.white.opacity(0.18), lineWidth: 1)
            }
          }
          .background {
            GeometryReader { proxy in
              Color.clear
                .onAppear {
                  imageFrame = proxy.frame(in: .global)
                  presentWhenReady()
                }
                .onChange(of: proxy.size) { _, _ in
                  imageFrame = proxy.frame(in: .global)
                  presentWhenReady()
                }
            }
          }
          .accessibilityLabel(accessibilityLabel)
          .scaleEffect(presentationScale)
          .offset(presentationOffset)
          .opacity(isPresented ? 1 : 0)
          .blur(radius: imageBlur)
          .animation(contentAnimation, value: isPresented)
          .onTapGesture {}

        Text(footerText)
          .font(.headline)
          .foregroundStyle(.white)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
          .accessibilityAddTraits(.isHeader)
          .opacity(isPresented ? 1 : 0)
          .offset(y: isPresented || accessibilityReduceMotion ? 0 : 16)
          .animation(contentAnimation.delay(accessibilityReduceMotion ? 0 : 0.04), value: isPresented)

        Spacer(minLength: verticalSpacing)
      }
      .padding(.horizontal, 24)

      VStack {
        HStack {
          Button("Close image", systemImage: "xmark", action: close)
            .labelStyle(.iconOnly)
            .font(.system(size: 18, weight: .medium))
            .foregroundStyle(.white)
            .frame(width: 46, height: 46)
            .background(Color.white.opacity(0.13), in: .circle)
            .buttonStyle(.plain)
            .opacity(isPresented ? 1 : 0)
            .scaleEffect(isPresented || accessibilityReduceMotion ? 1 : 0.86)
            .animation(contentAnimation.delay(accessibilityReduceMotion ? 0 : 0.08), value: isPresented)

          Spacer()
        }

        Spacer()
      }
      .padding(.horizontal, 20)
      .padding(.vertical, 14)
    }
    .statusBarHidden()
    .onAppear {
      didRequestPresentation = true
      presentWhenReady()
    }
  }

  private var circularImageSize: Double {
    verticalSizeClass == .compact
      ? Self.compactCircularImageSize
      : Self.regularCircularImageSize
  }

  private var coverImageMaxHeight: Double {
    verticalSizeClass == .compact
      ? Self.compactCoverImageMaxHeight
      : Self.regularCoverImageMaxHeight
  }

  private var verticalSpacing: Double {
    verticalSizeClass == .compact ? 24 : 64
  }

  private var presentationScale: CGFloat {
    guard !accessibilityReduceMotion, !isPresented else { return 1 }
    guard let sourceFrame, let imageFrame, imageFrame.width > 0, imageFrame.height > 0 else {
      return isCircular ? 0.68 : 0.94
    }

    let widthScale = sourceFrame.width / imageFrame.width
    let heightScale = sourceFrame.height / imageFrame.height
    return min(max(min(widthScale, heightScale), 0.1), 1)
  }

  private var presentationOffset: CGSize {
    guard !accessibilityReduceMotion, !isPresented else { return .zero }
    guard let sourceFrame, let imageFrame else { return .zero }

    return CGSize(
      width: sourceFrame.midX - imageFrame.midX,
      height: sourceFrame.midY - imageFrame.midY
    )
  }

  private var imageBlur: CGFloat {
    accessibilityReduceMotion || isPresented ? 0 : 14
  }

  private var contentAnimation: Animation {
    accessibilityReduceMotion
      ? .easeOut(duration: 0.12)
      : .spring(duration: Self.entranceDuration, bounce: 0.18)
  }

  private var exitAnimation: Animation {
    accessibilityReduceMotion
      ? .easeOut(duration: 0.1)
      : .smooth(duration: Self.exitDuration, extraBounce: 0)
  }

  private var canPresentFromMeasuredSource: Bool {
    accessibilityReduceMotion || sourceFrame == nil || imageFrame != nil
  }

  private func presentWhenReady() {
    guard didRequestPresentation, !isPresented, !isClosing, canPresentFromMeasuredSource else { return }

    if accessibilityReduceMotion {
      isPresented = true
      return
    }

    withAnimation(contentAnimation) {
      isPresented = true
    }
  }

  private func close() {
    guard !isClosing else { return }
    isClosing = true

    if accessibilityReduceMotion {
      withAnimation(exitAnimation) {
        isPresented = false
      }
      onClose()
      return
    }

    withAnimation(exitAnimation, completionCriteria: .logicallyComplete) {
      isPresented = false
    } completion: {
      onClose()
    }
  }
}

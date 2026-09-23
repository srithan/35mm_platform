import Kingfisher
import Photos
import SwiftUI
import UIKit

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
  @State private var isShowingActions = false
  @StateObject private var imageSaver = ImageSaveCoordinator()

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
          .onLongPressGesture {
            isShowingActions = true
          }

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

          Button("Image actions", systemImage: "ellipsis", action: {
            isShowingActions = true
          })
          .labelStyle(.iconOnly)
          .font(.system(size: 18, weight: .medium))
          .foregroundStyle(.white)
          .frame(width: 46, height: 46)
          .background(Color.white.opacity(0.13), in: .circle)
          .buttonStyle(.plain)
          .opacity(isPresented ? 1 : 0)
          .scaleEffect(isPresented || accessibilityReduceMotion ? 1 : 0.86)
          .animation(contentAnimation.delay(accessibilityReduceMotion ? 0 : 0.08), value: isPresented)
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
    .bottomActionSheet(isPresented: $isShowingActions) {
      BottomActionSheet(
        title: "Image actions",
        actions: [
          BottomActionSheetAction("Copy link", systemImage: "link") {
            UIPasteboard.general.url = url
          },
          BottomActionSheetAction("Save", systemImage: "square.and.arrow.down") {
            imageSaver.saveImage(at: url)
          },
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

struct ImageSaveAlert: Identifiable {
  let id = UUID()
  let title: String
  let message: String
}

@MainActor
final class ImageSaveCoordinator: NSObject, ObservableObject {
  @Published var alert: ImageSaveAlert?

  private var isSaving = false

  func saveImage(at url: URL) {
    guard !isSaving else { return }
    isSaving = true

    Task {
      let hasAccess = await requestPhotoAddAccess()
      guard hasAccess else {
        finish(title: "Photos access needed", message: "Allow 35mm to add photos, then try again.")
        return
      }

      do {
        let image = try await loadImage(at: url)
        try await writeToPhotoLibrary(image)
        finish(title: "Saved", message: "Image saved to Photos.")
      } catch {
        finish(title: "Could not save image", message: "The image could not be saved. Try again when the image finishes loading.")
      }
    }
  }

  private func finish(title: String, message: String) {
    isSaving = false
    alert = ImageSaveAlert(title: title, message: message)
  }

  private func requestPhotoAddAccess() async -> Bool {
    let status = PHPhotoLibrary.authorizationStatus(for: .addOnly)
    switch status {
    case .authorized, .limited:
      return true
    case .notDetermined:
      let newStatus = await PHPhotoLibrary.requestAuthorization(for: .addOnly)
      return newStatus == .authorized || newStatus == .limited
    case .denied, .restricted:
      return false
    @unknown default:
      return false
    }
  }

  private func loadImage(at url: URL) async throws -> UIImage {
    try await withCheckedThrowingContinuation { continuation in
      KingfisherManager.shared.retrieveImage(with: url) { result in
        switch result {
        case .success(let value):
          continuation.resume(returning: value.image)
        case .failure(let error):
          continuation.resume(throwing: error)
        }
      }
    }
  }

  private func writeToPhotoLibrary(_ image: UIImage) async throws {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      PHPhotoLibrary.shared().performChanges {
        PHAssetChangeRequest.creationRequestForAsset(from: image)
      } completionHandler: { success, error in
        if let error {
          continuation.resume(throwing: error)
        } else if success {
          continuation.resume()
        } else {
          continuation.resume(throwing: CocoaError(.fileWriteUnknown))
        }
      }
    }
  }
}

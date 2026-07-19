import Kingfisher
import SwiftUI

struct ImageViewerView: View {
  @Environment(\.verticalSizeClass) private var verticalSizeClass

  private static let regularCircularImageSize = 240.0
  private static let compactCircularImageSize = 168.0
  private static let regularCoverImageMaxHeight = 420.0
  private static let compactCoverImageMaxHeight = 220.0

  let url: URL
  let accessibilityLabel: String
  let footerText: String
  let isCircular: Bool
  let onClose: () -> Void

  var body: some View {
    ZStack {
      Color.black.ignoresSafeArea()

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
          .accessibilityLabel(accessibilityLabel)

        Text(footerText)
          .font(.headline)
          .foregroundStyle(.white)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
          .accessibilityAddTraits(.isHeader)

        Spacer(minLength: verticalSpacing)
      }
      .padding(.horizontal, 24)

      VStack {
        HStack {
          Button("Close image", systemImage: "xmark", action: onClose)
            .labelStyle(.iconOnly)
            .font(.system(size: 18, weight: .medium))
            .foregroundStyle(.white)
            .frame(width: 46, height: 46)
            .background(Color.white.opacity(0.13), in: .circle)
            .buttonStyle(.plain)

          Spacer()
        }

        Spacer()
      }
      .padding(.horizontal, 20)
      .padding(.vertical, 14)
    }
    .statusBarHidden()
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
}

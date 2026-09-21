import SwiftUI

struct ProfileStretchyCoverView: View {
  let url: String?
  let displayName: String
  let pullDistance: CGFloat
  let isRefreshArmed: Bool
  let isRefreshing: Bool
  let onOpen: (() -> Void)?

  var body: some View {
    Color.clear
      .containerRelativeFrame(.horizontal)
      .aspectRatio(ProfileDesign.coverAspectRatio, contentMode: .fit)
      .overlay(alignment: .top) {
        GeometryReader { proxy in
          let stretchDistance = max(proxy.frame(in: .named(ProfileDesign.scrollCoordinateSpace)).minY, pullDistance, 0)
          let coverHeight = proxy.size.height + stretchDistance

          ZStack(alignment: .top) {
            coverContent
              .frame(width: proxy.size.width, height: coverHeight)
              .clipped()
              .offset(y: -stretchDistance)
              .background {
                Color.clear
                  .preference(key: ProfileCoverFramePreferenceKey.self, value: proxy.frame(in: .global))
              }

            refreshIndicator(distance: stretchDistance)
              .position(
                x: proxy.size.width / 2,
                y: refreshIndicatorCenterY(baseHeight: proxy.size.height, pullDistance: stretchDistance)
              )
          }
          .frame(width: proxy.size.width, height: proxy.size.height, alignment: .top)
        }
      }
  }

  @ViewBuilder
  private func refreshIndicator(distance: CGFloat) -> some View {
    if distance > 8 || isRefreshArmed || isRefreshing {
      Group {
        if isRefreshing || isRefreshArmed || distance >= ProfileDesign.pullRefreshThreshold {
          ProgressView()
            .controlSize(.regular)
            .tint(.white)
        } else {
          Image(systemName: "arrow.down")
            .font(.system(.headline, weight: .semibold))
            .foregroundStyle(.white)
        }
      }
        .frame(width: 20, height: 20)
        .padding(10)
        .background(.black.opacity(0.28), in: .circle)
        .opacity(isRefreshing || isRefreshArmed ? 1 : min(1, Double(distance / ProfileDesign.pullRefreshThreshold)))
        .accessibilityLabel(refreshAccessibilityLabel(distance: distance))
    }
  }

  private func refreshAccessibilityLabel(distance: CGFloat) -> String {
    if isRefreshing {
      return "Refreshing profile"
    }

    if isRefreshArmed || distance >= ProfileDesign.pullRefreshThreshold {
      return "Release to refresh profile"
    }

    return "Pull down to refresh profile"
  }

  private func refreshIndicatorCenterY(baseHeight: CGFloat, pullDistance: CGFloat) -> CGFloat {
    max(24, (baseHeight - pullDistance) / 2)
  }

  @ViewBuilder
  private var coverContent: some View {
    if let onOpen {
      Button(action: onOpen) {
        ProfileCoverView(url: url, preservesAspectRatio: false)
      }
      .buttonStyle(.plain)
      .accessibilityLabel("View \(displayName)'s cover photo")
      .accessibilityIdentifier("profile.cover.preview")
    } else {
      ProfileCoverView(url: url, preservesAspectRatio: false)
    }
  }
}

struct ProfileCoverFramePreferenceKey: PreferenceKey {
  static let defaultValue: CGRect? = nil

  static func reduce(value: inout CGRect?, nextValue: () -> CGRect?) {
    value = nextValue() ?? value
  }
}

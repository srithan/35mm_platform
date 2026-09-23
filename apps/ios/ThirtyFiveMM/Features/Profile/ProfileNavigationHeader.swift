import SwiftUI

struct ProfileNavigationHeader: View {
  @Environment(\.theme) private var theme
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  let title: String
  var subtitle: String?
  var coverUrl: String?
  var collapseProgress = 0.0
  var topInset: CGFloat?
  var titleProgress = 0.0
  var actionsProgress = 0.0
  var showsBackButton = true
  let onBack: () -> Void
  var onShare: (() -> Void)?
  var onMore: (() -> Void)?

  var body: some View {
    GeometryReader { proxy in
      let safeTop = topInset ?? proxy.safeAreaInsets.top
      let progress = easedProgress(collapseProgress)
      let headerHeight = safeTop + ProfileDesign.collapsedHeaderContentHeight

      ZStack(alignment: .top) {
        headerBackground(progress: progress)
          .frame(width: proxy.size.width, height: headerHeight)
          .clipped()
          .opacity(progress)
          .accessibilityHidden(true)

        HStack(spacing: 14) {
          if showsBackButton {
            headerCircleButton(
              systemImage: "chevron.left",
              accessibilityLabel: "Back",
              accessibilityHint: "Returns to the previous screen",
              action: onBack
            )
          }

          titleStack
            .opacity(titleOpacity)
            .offset(y: reduceMotion ? 0 : 8 * (1 - titleOpacity))
            .accessibilityHidden(titleOpacity < 0.5)

          Spacer(minLength: 8)

          if let onShare {
            headerCircleButton(
              systemImage: "square.and.arrow.up",
              accessibilityLabel: "Share profile",
              accessibilityHint: "Opens sharing options",
              action: onShare
            )
            .opacity(actionOpacity)
            .offset(y: reduceMotion ? 0 : 4 * (1 - actionOpacity))
            .allowsHitTesting(actionOpacity > 0.5)
            .accessibilityHidden(actionOpacity <= 0.5)
          }

          if let onMore {
            headerCircleButton(
              systemImage: "ellipsis",
              accessibilityLabel: "Profile actions",
              accessibilityHint: "Opens profile actions",
              action: onMore
            )
            .opacity(actionOpacity)
            .offset(y: reduceMotion ? 0 : 4 * (1 - actionOpacity))
            .allowsHitTesting(actionOpacity > 0.5)
            .accessibilityHidden(actionOpacity <= 0.5)
          }
        }
        .padding(.horizontal, 16)
        .frame(height: ProfileDesign.collapsedHeaderContentHeight)
        .padding(.top, safeTop)
      }
      .frame(maxWidth: .infinity, maxHeight: headerHeight, alignment: .top)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .accessibilityElement(children: .contain)
  }

  @ViewBuilder
  private func headerBackground(progress: Double) -> some View {
    ZStack {
      ProfileCoverView(url: coverUrl, preservesAspectRatio: false)
        .blur(radius: 18 * progress)
        .scaleEffect(1.08)

      Rectangle()
        .fill(.black.opacity(0.12 + (0.33 * progress)))

      LinearGradient(
        colors: [.black.opacity(0.2 + (0.12 * progress)), .black.opacity(0.04 + (0.06 * progress))],
        startPoint: .top,
        endPoint: .bottom
      )
    }
    .background(theme.bg)
    .clipped()
  }

  private var titleStack: some View {
    VStack(alignment: .leading, spacing: 1) {
      Text(title)
        .font(.system(size: 20, weight: .bold))
        .foregroundStyle(.white)
        .lineLimit(1)
        .minimumScaleFactor(0.82)

      if let subtitle, !subtitle.isEmpty {
        Text(subtitle)
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(.white.opacity(0.92))
          .lineLimit(1)
          .minimumScaleFactor(0.82)
      }
    }
    .accessibilityAddTraits(.isHeader)
  }

  private var titleOpacity: Double {
    easedProgress(titleProgress)
  }

  private var actionOpacity: Double {
    easedProgress(actionsProgress)
  }

  private func easedProgress(_ value: Double) -> Double {
    let progress = min(max(value, 0), 1)
    return progress * progress * (3 - 2 * progress)
  }

  private func headerCircleButton(
    systemImage: String,
    accessibilityLabel: String,
    accessibilityHint: String,
    action: @escaping () -> Void
  ) -> some View {
    Button(action: action) {
      Image(systemName: systemImage)
        .font(.system(size: 18, weight: .semibold))
        .foregroundStyle(.white)
        .frame(
          width: ProfileDesign.coverBackButtonVisibleSize,
          height: ProfileDesign.coverBackButtonVisibleSize
        )
        .background(.black.opacity(circleBackgroundOpacity), in: Circle())
        .overlay {
          Circle()
            .stroke(.white.opacity(0.16), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.24), radius: 8, y: 2)
    }
    .frame(
      width: ProfileDesign.coverBackButtonTapSize,
      height: ProfileDesign.coverBackButtonTapSize
    )
    .contentShape(Rectangle())
    .buttonStyle(.plain)
    .accessibilityLabel(accessibilityLabel)
    .accessibilityHint(accessibilityHint)
  }

  private var circleBackgroundOpacity: Double {
    0.38 + (min(max(collapseProgress, 0), 1) * 0.1)
  }
}

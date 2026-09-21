import SwiftUI

/// Bounded local artwork repeated at an exact cycle boundary for seamless motion.
struct WelcomeHeroView: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.scenePhase) private var scenePhase
  @State private var animationStart = Date()
  @State private var isVisible = false

  var body: some View {
    GeometryReader { proxy in
      let columnWidth = max(0, (proxy.size.width - 64) / 3)
      let posterHeight = columnWidth * 1.5
      let cycleHeight = (posterHeight + 10) * 3
      // Enough copies to cover the viewport even at the end of a cycle.
      let copies = Int(ceil(proxy.size.height / cycleHeight)) + 1

      TimelineView(.animation(minimumInterval: 1.0 / 30, paused: reduceMotion || !isVisible || scenePhase != .active)) { timeline in
        let elapsed = reduceMotion ? 0 : max(0, timeline.date.timeIntervalSince(animationStart))

        HStack(alignment: .top, spacing: 10) {
          ForEach(0..<3) { column in
            let speed = column == 1 ? 12.0 : 9.0
            let phase = (elapsed * speed + Double(column) * 38)
              .truncatingRemainder(dividingBy: cycleHeight)

            VStack(spacing: 10) {
              ForEach(0..<(copies * 3), id: \.self) { row in
                Image("WelcomePoster\(column * 3 + row % 3 + 1)")
                  .resizable()
                  .scaledToFill()
                  .frame(width: columnWidth, height: posterHeight)
                  .clipShape(RoundedRectangle(cornerRadius: 20))
              }
            }
            .offset(y: -phase)
          }
        }
        .frame(maxWidth: .infinity, alignment: .top)
        .frame(height: proxy.size.height, alignment: .top)
        .clipped()
      }
      .overlay(alignment: .top) {
        LinearGradient(
          colors: [AuthPalette.paper, AuthPalette.paper.opacity(0.75), AuthPalette.paper.opacity(0)],
          startPoint: .top,
          endPoint: .bottom
        )
        .frame(height: min(100, proxy.size.height * 0.25))
      }
      .overlay(alignment: .bottom) {
        LinearGradient(
          colors: [AuthPalette.paper.opacity(0), AuthPalette.paper.opacity(0.75), AuthPalette.paper],
          startPoint: .top,
          endPoint: .bottom
        )
        .frame(height: min(150, proxy.size.height * 0.4))
      }
    }
    .accessibilityHidden(true)
    .allowsHitTesting(false)
    .onAppear {
      animationStart = Date()
      isVisible = true
    }
    .onDisappear { isVisible = false }
  }
}

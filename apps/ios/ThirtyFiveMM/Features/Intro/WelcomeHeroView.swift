import SwiftUI

struct WelcomeHeroView: View {
  var body: some View {
    GeometryReader { proxy in
      let width = proxy.size.width
      let height = proxy.size.height
      let glowDiameter = min(width * 0.72, 300)

      ZStack(alignment: .bottom) {
        LinearGradient(
          colors: [
            Color(red: 0.27, green: 0.07, blue: 0.06),
            DesignSystem.Colors.accent,
            Color(red: 0.95, green: 0.45, blue: 0.17),
            AuthPalette.reelGold,
          ],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        )

        Circle()
          .fill(
            RadialGradient(
              colors: [.white.opacity(0.78), .white.opacity(0.18), .clear],
              center: .center,
              startRadius: 8,
              endRadius: 150
            )
          )
          .frame(width: glowDiameter, height: glowDiameter)
          .blur(radius: 7)
          .offset(x: width * 0.32, y: -height * 0.34)

        RoundedRectangle(cornerRadius: 56)
          .stroke(.white.opacity(0.14), lineWidth: 2)
          .frame(width: width * 0.78, height: height * 0.40)
          .rotationEffect(.degrees(-7))
          .offset(x: -width * 0.22, y: -height * 0.05)

        RoundedRectangle(cornerRadius: 48)
          .stroke(.white.opacity(0.10), lineWidth: 2)
          .frame(width: width * 0.68, height: height * 0.34)
          .rotationEffect(.degrees(8))
          .offset(x: width * 0.29, y: -height * 0.10)

        Canvas { context, size in
          let specks: [(x: CGFloat, y: CGFloat, radius: CGFloat)] = [
            (0.12, 0.24, 2.0),
            (0.22, 0.42, 1.2),
            (0.35, 0.18, 1.6),
            (0.68, 0.28, 1.3),
            (0.78, 0.46, 2.1),
            (0.89, 0.21, 1.1),
          ]

          for speck in specks {
            let rect = CGRect(
              x: size.width * speck.x,
              y: size.height * speck.y,
              width: speck.radius * 2,
              height: speck.radius * 2
            )
            context.fill(Path(ellipseIn: rect), with: .color(.white.opacity(0.72)))
          }
        }

        VStack(spacing: 12) {
          Image(systemName: "film.stack.fill")
            .font(.system(size: 34, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: 76, height: 76)
            .background(.white.opacity(0.16), in: RoundedRectangle(cornerRadius: 22))
            .overlay {
              RoundedRectangle(cornerRadius: 22)
                .stroke(.white.opacity(0.36), lineWidth: 1)
            }
            .shadow(color: .black.opacity(0.18), radius: 20, y: 10)

          Text(AppConstants.appName)
            .font(.system(.title2, design: .serif, weight: .bold))
            .foregroundStyle(.white)
        }
        .position(x: width / 2, y: height * 0.43)

        ZStack(alignment: .bottom) {
          Ellipse()
            .fill(AuthPalette.paper.opacity(0.72))
            .frame(width: width * 0.72, height: 112)
            .blur(radius: 18)
            .offset(x: -width * 0.34, y: 20)

          Ellipse()
            .fill(.white.opacity(0.78))
            .frame(width: width * 0.84, height: 130)
            .blur(radius: 22)
            .offset(x: width * 0.30, y: 30)

          Ellipse()
            .fill(AuthPalette.paper.opacity(0.94))
            .frame(width: width * 0.88, height: 105)
            .blur(radius: 14)
            .offset(y: 46)
        }
        .frame(height: height * 0.38)

        LinearGradient(
          colors: [.clear, AuthPalette.paper.opacity(0.74), AuthPalette.paper],
          startPoint: .top,
          endPoint: .bottom
        )
        .frame(height: height * 0.38)
      }
      .clipped()
    }
    .accessibilityHidden(true)
  }
}

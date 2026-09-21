import SwiftUI

struct IntroView: View {
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize

  var body: some View {
    NavigationStack {
      GeometryReader { proxy in
        let needsScrolling = dynamicTypeSize > .large || proxy.size.height < 500

        ScrollView {
          VStack(spacing: 0) {
            Image("LaunchWordmark")
              .renderingMode(.template)
              .resizable()
              .scaledToFit()
              .foregroundStyle(AuthPalette.ink)
              .frame(width: 112, height: 42)
              .padding(.top, 4)
              .padding(.bottom, 16)
              .accessibilityLabel("35mm")

            WelcomeHeroView()
              .frame(minHeight: 100, maxHeight: needsScrolling ? 220 : .infinity)
              .layoutPriority(-1)

            VStack(spacing: 8) {
              Text("Your cinema. Your people.")
                .font(.system(.title, weight: .bold))
                .italic()
                .accessibilityAddTraits(.isHeader)

              Text("The social network for all things cinema.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }
            .foregroundStyle(AuthPalette.ink)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, 24)
            .padding(.top, 8)
            .padding(.bottom, 24)

            VStack(spacing: 10) {
              NavigationLink {
                SignUpView()
              } label: {
                Text("Sign up")
                  .font(.headline)
                  .frame(maxWidth: .infinity)
                  .padding(.vertical, 17)
                  .foregroundStyle(AuthPalette.paper)
                  .background(AuthPalette.ink, in: Capsule())
              }
              .accessibilityHint("Create your 35mm account")

              NavigationLink {
                SignInView()
              } label: {
                Text("Log in")
                  .font(.headline)
                  .frame(maxWidth: .infinity)
                  .padding(.vertical, 17)
                  .foregroundStyle(AuthPalette.ink)
                  .background(AuthPalette.field, in: Capsule())
              }
              .accessibilityHint("Sign in to an existing 35mm account")
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 24)

            Text("By continuing, you agree to our [Terms of Service](https://35mm.in/terms) and acknowledge our [Privacy Policy](https://35mm.in/privacy).")
              .font(.footnote)
              .foregroundStyle(AuthPalette.ink.opacity(0.75))
              .tint(AuthPalette.ink)
              .multilineTextAlignment(.center)
              .padding(.horizontal, 32)
              .padding(.top, 14)
              .padding(.bottom, 4)
          }
          .frame(maxWidth: 560)
          .frame(maxWidth: .infinity)
          .frame(height: needsScrolling ? nil : proxy.size.height, alignment: .top)
        }
        .scrollIndicators(.hidden)
        .scrollDisabled(!needsScrolling)
        .background(AuthPalette.paper)
      }
      .ignoresSafeArea(.keyboard)
      // The navigation host owns the slide. Do not also interpolate welcome
      // frames as the destination's keyboard and navigation bar disappear.
      .transaction { transaction in
        transaction.animation = nil
      }
      .background { AuthPalette.paper.ignoresSafeArea() }
      .toolbar(.hidden, for: .navigationBar)
    }
  }
}

import SwiftUI

private let introHeadline = "Your life,\nin film."
private let introSubtitle =
  "Track what you watch, share your take, and discover what moves you next."

struct IntroView: View {
  var body: some View {
    NavigationStack {
      GeometryReader { proxy in
        ScrollView {
          VStack(spacing: 0) {
            WelcomeHeroView()
              .frame(height: min(max(330, proxy.size.height * 0.56), 480))

            VStack(spacing: 14) {
              Text(introHeadline)
                .font(.system(.largeTitle, design: .serif, weight: .regular))
                .foregroundStyle(AuthPalette.ink)
                .multilineTextAlignment(.center)
                .lineSpacing(-2)
                .accessibilityAddTraits(.isHeader)

              Text(introSubtitle)
                .font(.body)
                .foregroundStyle(AuthPalette.ink.opacity(0.62))
                .multilineTextAlignment(.center)
                .lineSpacing(3)
                .frame(maxWidth: 340)
            }
            .padding(.horizontal, 28)
            .padding(.top, 4)
            .padding(.bottom, 32)
          }
          .frame(maxWidth: .infinity)
          .frame(minHeight: proxy.size.height, alignment: .top)
        }
        .scrollIndicators(.hidden)
        .background(AuthPalette.paper)
        .ignoresSafeArea(edges: .top)
        .safeAreaInset(edge: .bottom, spacing: 0) {
          VStack(spacing: 2) {
            NavigationLink {
              SignUpView()
            } label: {
              Text("Start your journey")
                .font(.headline)
                .frame(maxWidth: .infinity)
                .frame(minHeight: 58)
                .foregroundStyle(.white)
                .background(AuthPalette.ink, in: Capsule())
            }
            .buttonStyle(.plain)
            .accessibilityHint("Create your 35mm account")

            HStack(spacing: 4) {
              Text("Already have an account?")
                .foregroundStyle(AuthPalette.ink.opacity(0.62))

              NavigationLink("Log in") {
                SignInView()
              }
              .foregroundStyle(AuthPalette.ink)
              .bold()
            }
            .font(.footnote)
            .frame(minHeight: 44)
          }
          .padding(.horizontal, 24)
          .padding(.top, 10)
          .background(AuthPalette.paper)
        }
      }
      .toolbar(.hidden, for: .navigationBar)
    }
  }
}

import SwiftUI

private let signInTitle = "Sign in"
private let createAccountTitle = "Create account"
private let introHeadline = "FOR THE WATCHLIST.\nFOR THE TAKES."
private let introSubtitle =
  "Track films, post reactions, and find your next obsession with people who watch like you do."

struct IntroView: View {
  var body: some View {
    NavigationStack {
      GeometryReader { proxy in
        VStack(spacing: 0) {
          AuthPosterHero(height: min(max(300, proxy.size.height * 0.46), 430))

          VStack(spacing: 22) {
            AuthHeadline(title: introHeadline, subtitle: introSubtitle)

            VStack(spacing: 14) {
              NavigationLink {
                SignInView()
              } label: {
                AuthNavigationPill(
                  title: signInTitle,
                  systemImage: "person.crop.circle.fill",
                  variant: .secondary
                )
              }

              NavigationLink {
                SignUpView()
              } label: {
                AuthNavigationPill(
                  title: createAccountTitle,
                  systemImage: "film.stack.fill",
                  variant: .primary
                )
              }
            }
          }
          .padding(.horizontal, 24)
          .padding(.top, 4)
          .padding(.bottom, 26)
          .frame(maxWidth: .infinity)
          .frame(maxHeight: .infinity, alignment: .top)
        }
        .frame(width: proxy.size.width, height: proxy.size.height, alignment: .top)
        .clipped()
        .background(AuthScreenBackground())
      }
      .toolbar(.hidden, for: .navigationBar)
    }
  }
}

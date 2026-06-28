import SwiftUI

private let signInNavigationTitle = "Sign in"
private let emailLabel = "Email"
private let passwordLabel = "Password"
private let primaryButtonTitle = "Sign in"
private let verificationCodeLabel = "Verification code"
private let verifyButtonTitle = "Verify"
private let forgotPasswordTitle = "Forgot password?"
private let createAccountTitle = "Create account"
private let signInHeadline = "WELCOME BACK.\nROLL CAMERA."
private let signInSubtitle = "Jump into your feed, ratings, and the films everyone is arguing about."

struct SignInView: View {
  private enum Field: Hashable {
    case email
    case password
    case verificationCode
  }

  @EnvironmentObject private var env: AppEnvironment
  @StateObject private var viewModel = AuthViewModel()
  @FocusState private var focusedField: Field?

  var body: some View {
    GeometryReader { proxy in
      ScrollViewReader { scrollProxy in
        ScrollView(showsIndicators: false) {
          VStack(spacing: 0) {
            AuthPosterHero(height: max(220, proxy.size.height * 0.27), compact: true)

            VStack(spacing: 24) {
              AuthHeadline(title: signInHeadline, subtitle: signInSubtitle)

              VStack(spacing: 12) {
                AuthEmailField(title: emailLabel, text: $viewModel.email)
                  .focused($focusedField, equals: .email)
                  .onTapGesture {
                    scrollTo(.email, using: scrollProxy)
                  }
                  .id(Field.email)
                AuthPasswordField(title: passwordLabel, text: $viewModel.password)
                  .focused($focusedField, equals: .password)
                  .onTapGesture {
                    scrollTo(.password, using: scrollProxy)
                  }
                  .id(Field.password)

                if viewModel.requiresSecondFactor {
                  AuthCodeField(title: verificationCodeLabel, text: $viewModel.verificationCode)
                    .focused($focusedField, equals: .verificationCode)
                    .onTapGesture {
                      scrollTo(.verificationCode, using: scrollProxy)
                    }
                    .id(Field.verificationCode)
                }
              }

              if let error = viewModel.error {
                AuthErrorBanner(message: error)
              }

              VStack(spacing: 16) {
                AuthActionButton(
                  title: viewModel.requiresSecondFactor ? verifyButtonTitle : primaryButtonTitle,
                  isLoading: viewModel.isLoading
                ) {
                  Task {
                    if viewModel.requiresSecondFactor {
                      await viewModel.verifySecondFactor(authManager: env.authManager)
                    } else {
                      await viewModel.signIn(authManager: env.authManager)
                    }
                  }
                }

                Button(forgotPasswordTitle) {
                  // TODO: Stage 1 follow-up: wire Clerk password reset flow.
                }
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(AuthPalette.ink.opacity(0.68))

                NavigationLink {
                  SignUpView()
                } label: {
                  Text(createAccountTitle)
                    .font(.system(size: 15, weight: .black, design: .rounded))
                    .foregroundStyle(AuthPalette.socialAccent)
                }
              }
            }
            .padding(.horizontal, 24)
            .padding(.top, 10)
            .padding(.bottom, 140)
          }
          .frame(maxWidth: .infinity)
          .frame(minHeight: proxy.size.height, alignment: .top)
        }
        .scrollDismissesKeyboard(.interactively)
        .onChange(of: focusedField) { _, field in
          guard let field else { return }
          withAnimation(.snappy(duration: 0.28)) {
            scrollProxy.scrollTo(field, anchor: .center)
          }
        }
        .background(AuthScreenBackground())
      }
    }
    .navigationTitle(signInNavigationTitle)
    .navigationBarTitleDisplayMode(.inline)
    .toolbarBackground(.hidden, for: .navigationBar)
  }

  private func scrollTo(_ field: Field, using scrollProxy: ScrollViewProxy) {
    focusedField = field
    withAnimation(.snappy(duration: 0.28)) {
      scrollProxy.scrollTo(field, anchor: .center)
    }
  }
}

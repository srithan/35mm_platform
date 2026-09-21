import SwiftUI

private let signInNavigationTitle = "Log in"
private let emailLabel = "Email or username"
private let passwordLabel = "Password"
private let primaryButtonTitle = "Log in"
private let verificationCodeLabel = "Verification code"
private let verifyButtonTitle = "Verify"
private let forgotPasswordTitle = "Forgot password?"
private let createAccountTitle = "Create account"

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
      VStack(alignment: .leading, spacing: 28) {
        VStack(spacing: 20) {
          AuthIdentifierField(title: emailLabel, text: $viewModel.email, showsLabel: true)
            .focused($focusedField, equals: .email)
            .id(Field.email)

          AuthPasswordField(title: passwordLabel, text: $viewModel.password, showsLabel: true)
            .focused($focusedField, equals: .password)
            .id(Field.password)

          if viewModel.requiresSecondFactor {
            AuthCodeField(title: verificationCodeLabel, text: $viewModel.verificationCode)
              .focused($focusedField, equals: .verificationCode)
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
            viewModel.error = "Password reset is not available in the SwiftUI app yet."
          }
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(AuthPalette.ink.opacity(0.68))

          NavigationLink {
            SignUpView()
          } label: {
            Text(createAccountTitle)
              .font(.system(size: 15, weight: .semibold))
              .foregroundStyle(AuthPalette.socialAccent)
          }
        }
      }
      .padding(.horizontal, 24)
      .padding(.top, 16)
      .padding(.bottom, 40)
      .frame(maxWidth: .infinity)
      .frame(minHeight: proxy.size.height, alignment: .top)
      .background(AuthScreenBackground())
      .task(id: viewModel.requiresSecondFactor) {
        await Task.yield()
        focusedField = viewModel.requiresSecondFactor ? .verificationCode : .email
      }
    }
    .navigationTitle(signInNavigationTitle)
    .navigationBarTitleDisplayMode(.inline)
    .toolbarBackground(.hidden, for: .navigationBar)
  }
}

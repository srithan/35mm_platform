import SwiftUI

private let signUpNavigationTitle = "Create account"
private let fullNameLabel = "Full name"
private let usernameLabel = "Username"
private let signUpEmailLabel = "Email"
private let signUpPasswordLabel = "Password"
private let confirmPasswordLabel = "Confirm password"
private let verificationCodeLabel = "Verification code"
private let continueButtonTitle = "Continue"
private let createAccountButtonTitle = "Create account"
private let verifyEmailButtonTitle = "Verify email"
private let existingAccountTitle = "Already have an account?"
private let signInLinkTitle = "Sign in"

private enum SignUpStep: Int, CaseIterable {
  case identity
  case credentials
  case verification
}

private enum UsernameCheckState: Equatable {
  case idle
  case checking
  case available
  case unavailable(String)
}

struct SignUpView: View {
  private enum Field: Hashable {
    case fullName
    case username
    case email
    case password
    case confirmPassword
    case verificationCode
  }

  @EnvironmentObject private var env: AppEnvironment
  @StateObject private var viewModel = AuthViewModel()
  @State private var step: SignUpStep = .identity
  @State private var usernameState: UsernameCheckState = .idle
  @FocusState private var focusedField: Field?

  private var normalizedUsername: String {
    viewModel.username.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
  }

  private var usernameStatusText: String? {
    switch usernameState {
    case .idle:
      return normalizedUsername.isEmpty ? nil : "2+ chars"
    case .checking:
      return "Checking"
    case .available:
      return "Available"
    case .unavailable(let reason):
      return reason
    }
  }

  private var usernameStatusColor: Color {
    switch usernameState {
    case .available:
      return AuthPalette.socialAccent
    case .unavailable:
      return AuthPalette.error
    case .checking, .idle:
      return AuthPalette.ink.opacity(0.54)
    }
  }

  private var canContinueFromIdentity: Bool {
    viewModel.fullName.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2
      && normalizedUsername.count >= 2
      && usernameState == .available
  }

  private var canSubmitCredentials: Bool {
    viewModel.email.trimmingCharacters(in: .whitespacesAndNewlines).contains("@")
      && viewModel.password.count >= 8
      && viewModel.password == viewModel.confirmPassword
  }

  var body: some View {
    GeometryReader { proxy in
      ScrollViewReader { scrollProxy in
        ScrollView(showsIndicators: false) {
          VStack(spacing: 0) {
            AuthPosterHero(height: max(190, proxy.size.height * 0.22), compact: true)

            VStack(spacing: 22) {
              SignUpProgress(step: step)

              AuthHeadline(title: headlineTitle, subtitle: headlineSubtitle)

              VStack(spacing: 12) {
                switch step {
                case .identity:
                  identityFields(scrollProxy)
                case .credentials:
                  credentialFields(scrollProxy)
                case .verification:
                  verificationFields(scrollProxy)
                }
              }

              if let error = viewModel.error {
                AuthErrorBanner(message: error)
              }

              actionArea(scrollProxy)
            }
            .padding(.horizontal, 24)
            .padding(.top, 10)
            .padding(.bottom, 150)
          }
          .frame(maxWidth: .infinity)
          .frame(minHeight: proxy.size.height, alignment: .top)
        }
        .scrollDismissesKeyboard(.interactively)
        .task(id: normalizedUsername) {
          await checkUsernameAvailability()
        }
        .onChange(of: focusedField) { _, field in
          guard let field else { return }
          withAnimation(.snappy(duration: 0.28)) {
            scrollProxy.scrollTo(field, anchor: .center)
          }
        }
        .onChange(of: viewModel.requiresEmailVerification) { _, requiresVerification in
          guard requiresVerification else { return }
          withAnimation(.snappy(duration: 0.28)) {
            step = .verification
            viewModel.error = nil
          }
          focusedField = .verificationCode
        }
        .background(AuthScreenBackground())
      }
    }
    .navigationTitle(signUpNavigationTitle)
    .navigationBarTitleDisplayMode(.inline)
    .toolbarBackground(.hidden, for: .navigationBar)
  }

  private var headlineTitle: String {
    switch step {
    case .identity:
      return "CLAIM YOUR\n35MM."
    case .credentials:
      return "LOCK IN\nYOUR LOGIN."
    case .verification:
      return "CHECK YOUR\nINBOX."
    }
  }

  private var headlineSubtitle: String {
    switch step {
    case .identity:
      return "Start with the same profile fields as web: name and username."
    case .credentials:
      return "Add an email and password to create your account."
    case .verification:
      return "Enter the code we sent so your account can go live."
    }
  }

  @ViewBuilder
  private func identityFields(_ scrollProxy: ScrollViewProxy) -> some View {
    AuthNameField(title: fullNameLabel, text: $viewModel.fullName)
      .focused($focusedField, equals: .fullName)
      .onTapGesture {
        scrollTo(.fullName, using: scrollProxy)
      }
      .id(Field.fullName)

    AuthUsernameField(
      title: usernameLabel,
      text: $viewModel.username,
      trailingStatus: usernameStatusText,
      statusColor: usernameStatusColor
    )
    .focused($focusedField, equals: .username)
    .onTapGesture {
      scrollTo(.username, using: scrollProxy)
    }
    .id(Field.username)
  }

  @ViewBuilder
  private func credentialFields(_ scrollProxy: ScrollViewProxy) -> some View {
    AuthEmailField(title: signUpEmailLabel, text: $viewModel.email)
      .focused($focusedField, equals: .email)
      .onTapGesture {
        scrollTo(.email, using: scrollProxy)
      }
      .id(Field.email)

    AuthPasswordField(
      title: signUpPasswordLabel,
      text: $viewModel.password,
      contentType: .newPassword
    )
    .focused($focusedField, equals: .password)
    .onTapGesture {
      scrollTo(.password, using: scrollProxy)
    }
    .id(Field.password)

    AuthPasswordField(
      title: confirmPasswordLabel,
      text: $viewModel.confirmPassword,
      contentType: .newPassword
    )
    .focused($focusedField, equals: .confirmPassword)
    .onTapGesture {
      scrollTo(.confirmPassword, using: scrollProxy)
    }
    .id(Field.confirmPassword)
  }

  @ViewBuilder
  private func verificationFields(_ scrollProxy: ScrollViewProxy) -> some View {
    AuthCodeField(title: verificationCodeLabel, text: $viewModel.verificationCode)
      .focused($focusedField, equals: .verificationCode)
      .onTapGesture {
        scrollTo(.verificationCode, using: scrollProxy)
      }
      .id(Field.verificationCode)
  }

  @ViewBuilder
  private func actionArea(_ scrollProxy: ScrollViewProxy) -> some View {
    VStack(spacing: 16) {
      switch step {
      case .identity:
        AuthActionButton(
          title: continueButtonTitle,
          isLoading: false,
          isDisabled: !canContinueFromIdentity
        ) {
          viewModel.error = nil
          withAnimation(.snappy(duration: 0.28)) {
            step = .credentials
          }
          scrollTo(.email, using: scrollProxy)
        }

      case .credentials:
        VStack(spacing: 10) {
          AuthActionButton(
            title: createAccountButtonTitle,
            isLoading: viewModel.isLoading,
            isDisabled: !canSubmitCredentials
          ) {
            Task {
              await viewModel.signUp(authManager: env.authManager)
            }
          }

          Button {
            viewModel.error = nil
            withAnimation(.snappy(duration: 0.28)) {
              step = .identity
            }
            scrollTo(.username, using: scrollProxy)
          } label: {
            Text("Edit profile details")
              .font(.system(size: 13, weight: .black, design: .rounded))
              .foregroundStyle(AuthPalette.socialAccent)
          }
        }

      case .verification:
        AuthActionButton(
          title: verifyEmailButtonTitle,
          isLoading: viewModel.isLoading,
          isDisabled: viewModel.verificationCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        ) {
          Task {
            await viewModel.verifySignUp(authManager: env.authManager)
          }
        }
      }

      NavigationLink {
        SignInView()
      } label: {
        HStack(spacing: 5) {
          Text(existingAccountTitle)
            .foregroundStyle(AuthPalette.ink.opacity(0.58))
          Text(signInLinkTitle)
            .foregroundStyle(AuthPalette.socialAccent)
        }
        .font(.system(size: 15, weight: .black, design: .rounded))
      }
    }
  }

  private func scrollTo(_ field: Field, using scrollProxy: ScrollViewProxy) {
    focusedField = field
    withAnimation(.snappy(duration: 0.28)) {
      scrollProxy.scrollTo(field, anchor: .center)
    }
  }

  private func checkUsernameAvailability() async {
    let username = normalizedUsername

    guard !username.isEmpty else {
      usernameState = .idle
      return
    }

    guard username.count >= 2 else {
      usernameState = .unavailable("Too short")
      return
    }

    guard username.range(of: #"^[a-zA-Z0-9._]+$"#, options: .regularExpression) != nil else {
      usernameState = .unavailable("Invalid")
      return
    }

    usernameState = .checking

    do {
      try await Task.sleep(nanoseconds: 450_000_000)
      try Task.checkCancellation()
      let response: UsernameAvailability = try await env.apiClient.request(
        .checkUsernameAvailability(username)
      )
      usernameState = response.available
        ? .available
        : .unavailable(response.reason ?? "Taken")
    } catch is CancellationError {
      return
    } catch {
      usernameState = .unavailable("Check failed")
    }
  }
}

private struct SignUpProgress: View {
  let step: SignUpStep

  var body: some View {
    HStack(spacing: 8) {
      ForEach(SignUpStep.allCases, id: \.self) { item in
        Capsule()
          .fill(item.rawValue <= step.rawValue ? AuthPalette.ink : AuthPalette.ink.opacity(0.14))
          .frame(width: item == step ? 26 : 8, height: 8)
      }
    }
    .animation(.snappy(duration: 0.24), value: step)
  }
}

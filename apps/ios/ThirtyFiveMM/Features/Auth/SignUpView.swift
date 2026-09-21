import SwiftUI

private let fullNameLabel = "Full name"
private let usernameLabel = "Username"
private let signUpEmailLabel = "Email"
private let signUpPasswordLabel = "Password"
private let dateOfBirthLabel = "Date of birth"
private let verificationCodeLabel = "Verification code"
private let continueButtonTitle = "Continue"
private let createAccountButtonTitle = "Create account"
private let verifyEmailButtonTitle = "Verify email"
private let existingAccountTitle = "Already have an account?"
private let signInLinkTitle = "Sign in"

private enum SignUpStep: Int, CaseIterable {
  case name
  case username
  case email
  case password
  case birthDate
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
    case dateOfBirth
    case verificationCode
  }

  @EnvironmentObject private var env: AppEnvironment
  @StateObject private var viewModel = AuthViewModel()
  @State private var step: SignUpStep = .name
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

  private var canContinueFromName: Bool {
    viewModel.fullName.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2
  }

  private var canContinueFromUsername: Bool {
    normalizedUsername.count >= 2
      && usernameState == .available
  }

  private var canContinueFromEmail: Bool {
    !trimmedEmail.isEmpty
  }

  private var canContinueFromPassword: Bool {
    viewModel.password.count >= 8
  }

  private var trimmedEmail: String {
    viewModel.email.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private var isEmailValid: Bool {
    trimmedEmail.range(
      of: #"^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$"#,
      options: [.regularExpression, .caseInsensitive]
    ) != nil
  }

  var body: some View {
    GeometryReader { proxy in
      VStack(alignment: .leading, spacing: 26) {
        AuthHeadline(
          title: headlineTitle,
          subtitle: headlineSubtitle,
          alignment: .leading
        )

        VStack(spacing: 12) {
          switch step {
          case .name:
            nameField()
          case .username:
            usernameField()
          case .email:
            emailField()
          case .password:
            passwordField()
          case .birthDate:
            birthDateFields()
          case .verification:
            verificationFields()
          }
        }

        if let error = viewModel.error {
          AuthErrorBanner(message: error)
        }

        actionArea()
      }
      .padding(.horizontal, 24)
      .padding(.top, 38)
      .padding(.bottom, 40)
      .frame(maxWidth: .infinity)
      .frame(minHeight: proxy.size.height, alignment: .top)
      .background(AuthScreenBackground())
      .task(id: normalizedUsername) {
        await checkUsernameAvailability()
      }
      .task(id: step) {
        await focusActiveField()
      }
      .onChange(of: viewModel.email) { _, _ in
        guard step == .email else { return }
        viewModel.error = nil
      }
      .onChange(of: viewModel.requiresEmailVerification) { _, requiresVerification in
        guard requiresVerification else { return }
        withAnimation(.snappy(duration: 0.28)) {
          step = .verification
          viewModel.error = nil
        }
      }
    }
    .navigationTitle("")
    .navigationBarTitleDisplayMode(.inline)
    .toolbarBackground(.hidden, for: .navigationBar)
    .toolbar {
      ToolbarItem(placement: .principal) {
        SignUpProgress(step: step)
          .accessibilityElement(children: .ignore)
          .accessibilityLabel("Sign up progress")
          .accessibilityValue("Step \(step.rawValue + 1) of \(SignUpStep.allCases.count)")
      }
    }
  }

  private var headlineTitle: String {
    switch step {
    case .name:
      return "What's your name?"
    case .username:
      return "Choose your username."
    case .email:
      return "What's your email?"
    case .password:
      return "Create a password"
    case .birthDate:
      return "What's your date of birth?"
    case .verification:
      return "Enter the confirmation code."
    }
  }

  private var headlineSubtitle: String {
    switch step {
    case .name:
      return "This appears on your 35mm profile."
    case .username:
      return "People can find you at this @handle."
    case .email:
      return "You'll need to confirm this email later."
    case .password:
      return "Use at least 8 characters."
    case .birthDate:
      return "Your birthday stays private."
    case .verification:
      return "Enter the 6-digit code we sent to \(viewModel.email.trimmingCharacters(in: .whitespacesAndNewlines))."
    }
  }

  @ViewBuilder
  private func nameField() -> some View {
    AuthNameField(title: fullNameLabel, text: $viewModel.fullName)
      .focused($focusedField, equals: .fullName)
      .id(Field.fullName)
  }

  @ViewBuilder
  private func usernameField() -> some View {
    AuthUsernameField(
      title: usernameLabel,
      text: $viewModel.username,
      trailingStatus: usernameStatusText,
      statusColor: usernameStatusColor
    )
    .focused($focusedField, equals: .username)
    .id(Field.username)
  }

  @ViewBuilder
  private func emailField() -> some View {
    AuthEmailField(title: signUpEmailLabel, text: $viewModel.email)
      .focused($focusedField, equals: .email)
      .id(Field.email)
  }

  @ViewBuilder
  private func passwordField() -> some View {
    AuthPasswordField(
      title: signUpPasswordLabel,
      text: $viewModel.password,
      contentType: .newPassword
    )
    .focused($focusedField, equals: .password)
    .id(Field.password)
  }

  @ViewBuilder
  private func birthDateFields() -> some View {
    AuthDateField(title: dateOfBirthLabel, date: $viewModel.dateOfBirth)
      .id(Field.dateOfBirth)
  }

  @ViewBuilder
  private func verificationFields() -> some View {
    AuthCodeField(title: verificationCodeLabel, text: $viewModel.verificationCode)
      .focused($focusedField, equals: .verificationCode)
      .id(Field.verificationCode)
  }

  @ViewBuilder
  private func actionArea() -> some View {
    VStack(spacing: 16) {
      switch step {
      case .name:
        AuthActionButton(
          title: continueButtonTitle,
          isLoading: false,
          isDisabled: !canContinueFromName
        ) {
          viewModel.error = nil
          withAnimation(.snappy(duration: 0.28)) {
            step = .username
          }
        }

      case .username:
        AuthActionButton(
          title: continueButtonTitle,
          isLoading: false,
          isDisabled: !canContinueFromUsername
        ) {
          viewModel.error = nil
          withAnimation(.snappy(duration: 0.28)) {
            step = .email
          }
        }

      case .email:
        AuthActionButton(
          title: continueButtonTitle,
          isLoading: false,
          isDisabled: !canContinueFromEmail
        ) {
          guard isEmailValid else {
            viewModel.error = "Email address must be a valid email address."
            focusedField = .email
            return
          }

          viewModel.error = nil
          withAnimation(.snappy(duration: 0.28)) {
            step = .password
          }
        }

      case .password:
        VStack(spacing: 10) {
          AuthActionButton(
            title: continueButtonTitle,
            isLoading: false,
            isDisabled: !canContinueFromPassword
          ) {
            viewModel.error = nil
            withAnimation(.snappy(duration: 0.28)) {
              step = .birthDate
            }
          }

          Button {
            viewModel.error = nil
            withAnimation(.snappy(duration: 0.28)) {
              step = .email
            }
          } label: {
            Text("Edit email")
              .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(AuthPalette.socialAccent)
          }
        }

      case .birthDate:
        VStack(spacing: 10) {
          AuthActionButton(
            title: createAccountButtonTitle,
            isLoading: viewModel.isLoading
          ) {
            Task {
              guard isEmailValid else {
                viewModel.error = "Email address must be a valid email address."
                withAnimation(.snappy(duration: 0.28)) {
                  step = .email
                }
                return
              }

              await viewModel.signUp(authManager: env.authManager)
            }
          }

          Button {
            viewModel.error = nil
            withAnimation(.snappy(duration: 0.28)) {
              step = .password
            }
          } label: {
            Text("Edit password")
              .font(.system(size: 13, weight: .semibold))
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
        .font(.system(size: 15, weight: .semibold))
      }
    }
  }

  private func focusActiveField() async {
    await Task.yield()

    switch step {
    case .name:
      focusedField = .fullName
    case .username:
      focusedField = .username
    case .email:
      focusedField = .email
    case .password:
      focusedField = .password
    case .birthDate:
      focusedField = nil
    case .verification:
      focusedField = .verificationCode
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

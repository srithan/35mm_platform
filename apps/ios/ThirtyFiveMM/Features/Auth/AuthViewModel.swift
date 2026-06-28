import Foundation

@MainActor
final class AuthViewModel: ObservableObject {
  @Published var fullName = ""
  @Published var username = ""
  @Published var email = ""
  @Published var password = ""
  @Published var confirmPassword = ""
  @Published var verificationCode = ""
  @Published var requiresEmailVerification = false
  @Published var requiresSecondFactor = false
  @Published var isLoading = false
  @Published var error: String?

  func signIn(authManager: AuthManager) async {
    await runAuthAction {
      try await authManager.signIn(
        email: email.trimmingCharacters(in: .whitespacesAndNewlines),
        password: password
      )
    }
  }

  func signUp(authManager: AuthManager) async {
    let trimmedName = fullName.trimmingCharacters(in: .whitespacesAndNewlines)
    guard trimmedName.count >= 2 else {
      error = "Full name must be at least 2 characters."
      return
    }

    let normalizedUsername = username.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    guard normalizedUsername.count >= 2 else {
      error = "Username must be at least 2 characters."
      return
    }

    guard normalizedUsername.range(of: #"^[a-zA-Z0-9._]+$"#, options: .regularExpression) != nil else {
      error = "Letters, numbers, dots and underscores only."
      return
    }

    guard password.count >= 8 else {
      error = "Password must be at least 8 characters."
      return
    }

    guard password == confirmPassword else {
      error = "Passwords do not match."
      return
    }

    await runAuthAction {
      try await authManager.signUp(
        fullName: trimmedName,
        username: normalizedUsername,
        email: email.trimmingCharacters(in: .whitespacesAndNewlines),
        password: password
      )
    }
  }

  func verifySignUp(authManager: AuthManager) async {
    await runAuthAction {
      try await authManager.verifySignUp(
        emailCode: verificationCode.trimmingCharacters(in: .whitespacesAndNewlines)
      )
    }
  }

  func verifySecondFactor(authManager: AuthManager) async {
    await runAuthAction {
      try await authManager.verifySecondFactor(
        code: verificationCode.trimmingCharacters(in: .whitespacesAndNewlines)
      )
    }
  }

  private func runAuthAction(_ action: () async throws -> Void) async {
    isLoading = true
    error = nil

    do {
      try await action()
    } catch let apiError as APIError {
      if case .httpError(_, let code, _) = apiError,
        code == "EMAIL_VERIFICATION_REQUIRED"
      {
        requiresEmailVerification = true
      }

      if case .httpError(_, let code, _) = apiError,
        code == "SECOND_FACTOR_REQUIRED"
      {
        requiresSecondFactor = true
      }

      error = apiError.errorDescription
    } catch {
      self.error = error.localizedDescription
    }

    isLoading = false
  }
}

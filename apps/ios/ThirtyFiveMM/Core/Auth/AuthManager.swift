import ClerkKit
import Foundation

enum AuthState: Equatable {
  case loading
  case signedOut
  case onboarding
  case authenticated(userId: String)
  case sessionUnavailable(message: String)
}

@MainActor
final class AuthManager: ObservableObject, TokenProvider {
  @Published private(set) var authState: AuthState = .loading

  var authStateStream: AsyncStream<AuthState> {
    AsyncStream { continuation in
      continuation.yield(authState)
      stateContinuations.append(continuation)
    }
  }

  private let clerk: Clerk
  private var apiClient: APIClient?
  private var authEventsTask: Task<Void, Never>?
  private var startupTask: Task<Void, Never>?
  private var pendingSecondFactorSignIn: SignIn?
  private var pendingSecondFactorType: SignIn.MfaType?
  private var stateContinuations: [AsyncStream<AuthState>.Continuation] = []

  init(clerk: Clerk) {
    self.clerk = clerk
  }

  deinit {
    authEventsTask?.cancel()
    startupTask?.cancel()
    for continuation in stateContinuations {
      continuation.finish()
    }
  }

  func start(apiClient: APIClient) {
    self.apiClient = apiClient

    authEventsTask?.cancel()
    authEventsTask = Task { [weak self] in
      guard let self else { return }

      for await event in clerk.auth.events {
        await handle(event: event)
      }
    }

    startupTask?.cancel()
    startupTask = Task { [weak self] in
      guard let self else { return }
      await completeStartup()
    }
  }

  func getToken() async throws -> String? {
    try await clerk.auth.getToken()
  }

  func signIn(email: String, password: String) async throws {
    if clerk.session != nil {
      try await completeAuthenticatedFlow()
      return
    }

    var signIn = try await clerk.auth.signInWithPassword(
      identifier: email,
      password: password
    )

    if signIn.status == .needsSecondFactor {
      signIn = try await prepareSecondFactor(for: signIn)
      pendingSecondFactorSignIn = signIn
      throw APIError.httpError(
        statusCode: 400,
        code: "SECOND_FACTOR_REQUIRED",
        message: "Enter your verification code."
      )
    }

    if signIn.status != .complete {
      throw APIError.httpError(
        statusCode: 400,
        code: "AUTH_INCOMPLETE",
        message: "Additional sign-in verification is required."
      )
    }

    try await activateSessionIfNeeded(signIn.createdSessionId)
    try await completeAuthenticatedFlow()
  }

  func verifySecondFactor(code: String) async throws {
    guard var signIn = pendingSecondFactorSignIn,
      let type = pendingSecondFactorType
    else {
      throw APIError.httpError(
        statusCode: 400,
        code: "SIGN_IN_NOT_FOUND",
        message: "Start sign-in again."
      )
    }

    signIn = try await signIn.verifyMfaCode(code, type: type)

    guard signIn.status == .complete else {
      pendingSecondFactorSignIn = signIn
      throw APIError.httpError(
        statusCode: 400,
        code: "AUTH_INCOMPLETE",
        message: "Additional sign-in verification is required."
      )
    }

    pendingSecondFactorSignIn = nil
    pendingSecondFactorType = nil
    try await activateSessionIfNeeded(signIn.createdSessionId)
    try await completeAuthenticatedFlow()
  }

  func signUp(
    fullName: String,
    username: String,
    email: String,
    password: String
  ) async throws {
    let nameParts = fullName
      .trimmingCharacters(in: .whitespacesAndNewlines)
      .split(whereSeparator: \.isWhitespace)
    let firstName = nameParts.first.map(String.init)
    let lastName = nameParts.dropFirst().joined(separator: " ")

    let signUp = try await clerk.auth.signUp(
      emailAddress: email,
      password: password,
      firstName: firstName,
      lastName: lastName.isEmpty ? nil : lastName,
      username: username.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    )

    if signUp.status != .complete {
      _ = try await signUp.sendEmailCode()
      throw APIError.httpError(
        statusCode: 400,
        code: "EMAIL_VERIFICATION_REQUIRED",
        message: "Enter the verification code sent to your email."
      )
    }

    try await activateSessionIfNeeded(signUp.createdSessionId)
    try await completeAuthenticatedFlow()
  }

  func verifySignUp(emailCode: String) async throws {
    guard var signUp = clerk.auth.currentSignUp else {
      throw APIError.httpError(
        statusCode: 400,
        code: "SIGN_UP_NOT_FOUND",
        message: "Start account creation again."
      )
    }

    signUp = try await signUp.verifyEmailCode(emailCode)

    if signUp.status != .complete {
      throw APIError.httpError(
        statusCode: 400,
        code: "AUTH_INCOMPLETE",
        message: "Additional sign-up verification is required."
      )
    }

    try await activateSessionIfNeeded(signUp.createdSessionId)
    try await completeAuthenticatedFlow()
  }

  func signOut() async throws {
    try await clerk.auth.signOut()
    setAuthState(.signedOut)
  }

  func refreshAfterOnboarding() async {
    await refreshSession()
  }

  func retryAuthenticatedFlow() async {
    setAuthState(.loading)
    await refreshSession()
  }

  private func handle(event: AuthEvent) async {
    switch event {
    case .signedOut, .accountDeleted:
      setAuthState(.signedOut)
    case .signInCompleted, .signUpCompleted, .sessionChanged:
      await refreshSession()
    case .signInNeedsContinuation, .signUpNeedsContinuation, .tokenRefreshed:
      break
    }
  }

  private func refreshSession() async {
    guard clerk.session != nil else {
      setAuthState(.signedOut)
      return
    }

    do {
      try await completeAuthenticatedFlow()
    } catch {
      await handleAuthenticatedFlowFailure(error)
    }
  }

  private func completeStartup() async {
    await waitForClerkToLoad()
    await refreshSession()
  }

  private func waitForClerkToLoad() async {
    let timeout = Date().addingTimeInterval(8)

    while !clerk.isLoaded && Date() < timeout && !Task.isCancelled {
      try? await Task.sleep(nanoseconds: 100_000_000)
    }

    if !clerk.isLoaded {
      #if DEBUG
        print("Clerk did not finish initial load before timeout.")
      #endif
    }
  }

  private func completeAuthenticatedFlow() async throws {
    guard let apiClient else {
      throw APIError.unknown
    }

    let profile = try await AuthBootstrap.bootstrap(apiClient: apiClient)
    let onboardingStatus: OnboardingStatus = try await apiClient.request(
      .getOnboardingStatus()
    )

    if onboardingStatus.completed {
      setAuthState(.authenticated(userId: profile.userId))
    } else {
      setAuthState(.onboarding)
    }
  }

  private func activateSessionIfNeeded(_ sessionId: String?) async throws {
    guard let sessionId else {
      return
    }

    try await clerk.auth.setActive(sessionId: sessionId)
  }

  private func handleAuthenticatedFlowFailure(_ error: Error) async {
    if error is CancellationError {
      return
    }

    if case APIError.unauthorized = error {
      try? await clerk.auth.signOut()
      setAuthState(.signedOut)
      return
    }

    #if DEBUG
      print("Authenticated session bootstrap failed: \(error.localizedDescription)")
    #endif

    let message =
      if let apiError = error as? APIError {
        apiError.errorDescription ?? "We could not finish restoring your session."
      } else {
        error.localizedDescription
      }

    setAuthState(.sessionUnavailable(message: message))
  }

  private func prepareSecondFactor(for signIn: SignIn) async throws -> SignIn {
    let factors = signIn.supportedSecondFactors ?? []

    if factors.contains(where: { $0.strategy == .totp }) {
      pendingSecondFactorType = .totp
      return signIn
    }

    if factors.contains(where: { $0.strategy == .emailCode }) {
      pendingSecondFactorType = .emailCode
      return try await signIn.sendMfaEmailCode()
    }

    if factors.contains(where: { $0.strategy == .phoneCode }) {
      pendingSecondFactorType = .phoneCode
      return try await signIn.sendMfaPhoneCode()
    }

    if factors.contains(where: { $0.strategy == .backupCode }) {
      pendingSecondFactorType = .backupCode
      return signIn
    }

    throw APIError.httpError(
      statusCode: 400,
      code: "UNSUPPORTED_SECOND_FACTOR",
      message: "This sign-in verification method is not supported yet."
    )
  }

  private func setAuthState(_ nextState: AuthState) {
    authState = nextState
    for continuation in stateContinuations {
      continuation.yield(nextState)
    }
  }
}

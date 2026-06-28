@MainActor
protocol TokenProvider: AnyObject {
  func getToken() async throws -> String?
}

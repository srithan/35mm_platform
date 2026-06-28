import Foundation

@MainActor
final class APIClient {
  private let baseURL: URL
  private weak var tokenProvider: TokenProvider?
  private let urlSession: URLSession
  private let decoder: JSONDecoder
  private let encoder: JSONEncoder

  init(
    baseURL: URL,
    tokenProvider: TokenProvider,
    urlSession: URLSession = .shared
  ) {
    self.baseURL = baseURL
    self.tokenProvider = tokenProvider
    self.urlSession = urlSession

    decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    decoder.dateDecodingStrategy = .custom(Self.decodeISO8601Date)

    encoder = JSONEncoder()
    encoder.keyEncodingStrategy = .convertToSnakeCase
    encoder.dateEncodingStrategy = .iso8601
  }

  func request<T: Decodable>(_ endpoint: APIEndpoint) async throws -> T {
    var request = try makeURLRequest(for: endpoint)

    if let token = try await tokenProvider?.getToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    do {
      let (data, response) = try await urlSession.data(for: request)
      guard let httpResponse = response as? HTTPURLResponse else {
        throw APIError.unknown
      }

      guard (200..<300).contains(httpResponse.statusCode) else {
        throw mapErrorResponse(data: data, statusCode: httpResponse.statusCode)
      }

      do {
        return try decoder.decode(T.self, from: data)
      } catch {
        throw APIError.decodingError(error)
      }
    } catch let apiError as APIError {
      throw apiError
    } catch {
      throw APIError.networkError(error)
    }
  }

  private func makeURLRequest(for endpoint: APIEndpoint) throws -> URLRequest {
    let path =
      endpoint.path.hasPrefix("/")
      ? String(endpoint.path.dropFirst())
      : endpoint.path

    var components = URLComponents(
      url: baseURL.appendingPathComponent(path),
      resolvingAgainstBaseURL: false
    )
    components?.queryItems = endpoint.queryItems.isEmpty ? nil : endpoint.queryItems

    guard let url = components?.url else {
      throw APIError.unknown
    }

    var request = URLRequest(url: url)
    request.httpMethod = endpoint.method.rawValue
    request.setValue("application/json", forHTTPHeaderField: "Accept")

    if let body = endpoint.body {
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      request.httpBody = try encoder.encode(AnyEncodable(body))
    }

    return request
  }

  private func mapErrorResponse(data: Data, statusCode: Int) -> APIError {
    if statusCode == 401 {
      return .unauthorized
    }

    if statusCode == 404 {
      return .notFound
    }

    if let response = try? decoder.decode(APIErrorResponse.self, from: data) {
      return .httpError(
        statusCode: statusCode,
        code: response.code,
        message: response.message
      )
    }

    return .httpError(
      statusCode: statusCode,
      code: "HTTP_\(statusCode)",
      message: HTTPURLResponse.localizedString(forStatusCode: statusCode)
    )
  }

  nonisolated private static func decodeISO8601Date(from decoder: Decoder) throws -> Date {
    let container = try decoder.singleValueContainer()
    let value = try container.decode(String.self)

    let fractionalFormatter = ISO8601DateFormatter()
    fractionalFormatter.formatOptions = [
      .withInternetDateTime,
      .withFractionalSeconds,
    ]

    if let date = fractionalFormatter.date(from: value) {
      return date
    }

    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]

    if let date = formatter.date(from: value) {
      return date
    }

    throw DecodingError.dataCorruptedError(
      in: container,
      debugDescription: "Invalid ISO 8601 date: \(value)"
    )
  }
}

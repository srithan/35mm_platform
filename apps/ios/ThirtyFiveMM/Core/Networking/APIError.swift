import Foundation

struct APIErrorResponse: Codable {
  let code: String
  let message: String
}

enum APIError: Error, LocalizedError {
  case httpError(statusCode: Int, code: String, message: String)
  case decodingError(Error)
  case networkError(Error)
  case unauthorized
  case notFound
  case unknown

  var errorDescription: String? {
    switch self {
    case .httpError(_, _, let message):
      return message
    case .decodingError(let error):
      return "Decoding error: \(error.localizedDescription)"
    case .networkError(let error):
      return error.localizedDescription
    case .unauthorized:
      return "You must be signed in."
    case .notFound:
      return "Not found."
    case .unknown:
      return "An unknown error occurred."
    }
  }
}

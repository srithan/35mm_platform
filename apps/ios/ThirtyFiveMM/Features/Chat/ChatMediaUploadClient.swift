import Foundation

struct MediaPresignRequest: Encodable {
  let kind: String
  let contentType: String
  let contentLength: Int
}

struct MediaPresignResponse: Decodable {
  let uploadUrl: String
  let publicUrl: String
  let objectKey: String
  let contentType: String
  let cacheControl: String?
  let expiresInSeconds: Int
  let variants: MediaPresignVariants
}

struct MediaPresignVariants: Decodable {
  let thumb: String?
  let feed: String?
  let full: String?
  let sm: String?
  let lg: String?
  let `default`: String?
}

extension APIEndpoint {
  static func presignMediaUpload(
    kind: String,
    contentType: String,
    contentLength: Int
  ) -> APIEndpoint {
    APIEndpoint(
      path: "/v1/media/presign",
      method: .post,
      body: MediaPresignRequest(
        kind: kind,
        contentType: contentType,
        contentLength: contentLength
      )
    )
  }
}

@MainActor
extension APIClient {
  func presignPostMediaUpload(contentType: String, contentLength: Int) async throws -> MediaPresignResponse {
    try await request(.presignMediaUpload(
      kind: "post_media",
      contentType: contentType,
      contentLength: contentLength
    ))
  }
}

enum ChatMediaUploadError: LocalizedError {
  case uploadFailed(statusCode: Int, message: String)

  var errorDescription: String? {
    switch self {
    case .uploadFailed(_, let message):
      return message
    }
  }
}

enum ChatPresignedMediaUploader {
  static func upload(
    data: Data,
    to presign: MediaPresignResponse,
    progress: @escaping @MainActor (Double) -> Void
  ) async throws {
    await progress(0.15)

    guard let url = URL(string: presign.uploadUrl) else {
      throw APIError.unknown
    }

    var request = URLRequest(url: url)
    request.httpMethod = "PUT"
    request.setValue(presign.contentType, forHTTPHeaderField: "Content-Type")
    request.setValue(
      presign.cacheControl ?? "public, max-age=31536000, immutable",
      forHTTPHeaderField: "Cache-Control"
    )

    let (responseData, response) = try await URLSession.shared.upload(for: request, from: data)
    guard let httpResponse = response as? HTTPURLResponse else {
      throw APIError.unknown
    }

    guard (200..<300).contains(httpResponse.statusCode) else {
      let body = String(data: responseData, encoding: .utf8)
      throw ChatMediaUploadError.uploadFailed(
        statusCode: httpResponse.statusCode,
        message: body?.isEmpty == false ? body ?? "Upload failed" : "Upload failed"
      )
    }

    await progress(1)
  }
}

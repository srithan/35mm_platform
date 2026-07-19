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

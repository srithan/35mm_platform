struct PaginatedResponse<T: Decodable>: Decodable {
  let items: [T]
  let nextCursor: String?
  let hasMore: Bool
}

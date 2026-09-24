import SwiftUI

@MainActor
final class DiscoverSearchModel: ObservableObject {
  @Published var query = ""
  @Published private(set) var recent: [String] = []
  @Published private(set) var results: [CatalogTitle] = []
  @Published private(set) var loading = false
  @Published private(set) var error: String?
  @Published private(set) var hasMore = false
  private var cursor: String?
  private var generation = 0
  private var historyKey: String?
  private var hasConfiguredAccount = false
  private let defaults: UserDefaults

  init(defaults: UserDefaults = .standard) { self.defaults = defaults }

  var normalizedQuery: String { String(query.trimmingCharacters(in: .whitespacesAndNewlines).prefix(200)) }

  /// Returns true only when the account scope actually changes. Navigation
  /// reappearance must not reset the query or the owning view's search mode.
  @discardableResult
  func useAccount(_ id: String?) -> Bool {
    let nextKey = id.map { "discover.recent.v1.\($0)" }
    guard !hasConfiguredAccount || nextKey != historyKey else { return false }
    hasConfiguredAccount = true
    invalidate()
    query = ""
    historyKey = nextKey
    recent = historyKey.flatMap { defaults.stringArray(forKey: $0) }.map { Array($0.prefix(50)) } ?? []
    return true
  }

  func remember() {
    let value = normalizedQuery
    guard !value.isEmpty, let historyKey else { return }
    recent.removeAll { $0.caseInsensitiveCompare(value) == .orderedSame }
    recent.insert(value, at: 0)
    recent = Array(recent.prefix(50))
    defaults.set(recent, forKey: historyKey)
  }

  func remove(_ value: String) {
    recent.removeAll { $0 == value }
    if let historyKey { defaults.set(recent, forKey: historyKey) }
  }

  func clear() {
    recent = []
    if let historyKey { defaults.removeObject(forKey: historyKey) }
  }

  func prepareSearch() {
    invalidate()
    loading = !normalizedQuery.isEmpty
  }

  func invalidate() {
    generation += 1
    results = []
    error = nil
    cursor = nil
    hasMore = false
    loading = false
  }

  func search(client: APIClient, more: Bool = false) async {
    let value = normalizedQuery
    guard !value.isEmpty, !more || (hasMore && !loading) else { return }
    if !more { invalidate() }
    let requestGeneration = generation
    loading = true
    error = nil
    defer { if requestGeneration == generation { loading = false } }
    do {
      let page: PaginatedResponse<CatalogTitle> = try await client.request(
        .getCatalogTitles(query: value, type: nil, cursor: more ? cursor : nil, limit: 24)
      )
      guard !Task.isCancelled, generation == requestGeneration, normalizedQuery == value else { return }
      var seen = Set(results.map(\.id))
      results.append(contentsOf: page.items.filter { seen.insert($0.id).inserted })
      cursor = page.nextCursor
      hasMore = page.hasMore && page.nextCursor != nil
    } catch {
      guard !Task.isCancelled, generation == requestGeneration, normalizedQuery == value else { return }
      self.error = error.localizedDescription
    }
  }
}

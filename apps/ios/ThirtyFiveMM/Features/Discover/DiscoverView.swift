import Kingfisher
import SwiftUI

@MainActor
final class DiscoverViewModel: ObservableObject {
  @Published private(set) var explore: DiscoverExplorePayload?
  @Published private(set) var television: DiscoverTelevisionPayload?
  @Published private(set) var nowPlaying: [TMDBDiscoverTitle] = []
  @Published private(set) var searchResults: [TMDBDiscoverTitle] = []
  @Published private(set) var isLoading = false
  @Published private(set) var error: String?
  @Published var searchText = ""
  @Published var selectedTab: DiscoverTab = .explore
  @Published var streamingProviderID: Int?

  private let service: DiscoverServing
  private var generation = 0

  init(service: DiscoverServing) {
    self.service = service
  }

  convenience init() {
    self.init(service: WebDiscoverAPI())
  }

  var isSearching: Bool { !normalizedSearch.isEmpty }

  func loadCurrent(force: Bool = false) async {
    generation += 1
    let requestGeneration = generation
    error = nil
    isLoading = true

    do {
      if isSearching {
        searchResults = []
        let results = try await service.search(query: normalizedSearch)
        guard requestGeneration == generation else { return }
        searchResults = unique(results)
      } else {
        switch selectedTab {
        case .explore:
          if force || explore == nil {
            explore = try await service.explore(providerID: streamingProviderID)
          }
        case .television:
          if force || television == nil {
            television = try await service.television()
          }
        case .nowPlaying:
          if force || nowPlaying.isEmpty {
            nowPlaying = unique(try await service.nowPlaying())
          }
        }
      }
    } catch {
      guard requestGeneration == generation else { return }
      self.error = error.localizedDescription
    }

    if requestGeneration == generation { isLoading = false }
  }

  func selectTab(_ tab: DiscoverTab) async {
    guard selectedTab != tab else { return }
    selectedTab = tab
    searchText = ""
    searchResults = []
    await loadCurrent()
  }

  func selectStreamingProvider(_ id: Int?) async {
    guard streamingProviderID != id else { return }
    streamingProviderID = id
    guard let current = explore else {
      await loadCurrent()
      return
    }

    generation += 1
    let requestGeneration = generation
    error = nil
    isLoading = true
    do {
      let streaming = unique(try await service.streaming(providerID: id))
      guard requestGeneration == generation else { return }
      explore = DiscoverExplorePayload(
        popular: current.popular,
        nowPlaying: current.nowPlaying,
        trending: current.trending,
        topRated: current.topRated,
        streaming: streaming
      )
    } catch {
      guard requestGeneration == generation else { return }
      self.error = error.localizedDescription
    }
    if requestGeneration == generation { isLoading = false }
  }

  private var normalizedSearch: String {
    searchText.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private func unique(_ titles: [TMDBDiscoverTitle]) -> [TMDBDiscoverTitle] {
    var seen = Set<Int>()
    return titles.filter { seen.insert($0.tmdbId).inserted }
  }
}

struct DiscoverView: View {
  @Environment(\.theme) private var theme
  @StateObject private var viewModel: DiscoverViewModel
  @State private var searchTask: Task<Void, Never>?
  private let apiClient: APIClient

  init(apiClient: APIClient) {
    self.apiClient = apiClient
    _viewModel = StateObject(wrappedValue: DiscoverViewModel())
  }

  var body: some View {
    ScrollView {
      LazyVStack(alignment: .leading, spacing: 0) {
        header
        tabStrip
        content
      }
      .padding(.bottom, 40)
    }
    .background(theme.bg)
    .navigationTitle("Discover")
    .navigationBarTitleDisplayMode(.inline)
    .searchable(
      text: $viewModel.searchText,
      placement: .navigationBarDrawer(displayMode: .always),
      prompt: "Search films, directors, actors…"
    )
    .textInputAutocapitalization(.never)
    .autocorrectionDisabled()
    .onChange(of: viewModel.searchText) { _, _ in scheduleSearch() }
    .task { await viewModel.loadCurrent() }
    .refreshable { await viewModel.loadCurrent(force: true) }
    .onDisappear { searchTask?.cancel() }
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("THIS WEEK'S PROGRAM")
        .font(.caption2.weight(.bold))
        .tracking(1.8)
        .foregroundStyle(theme.accent)
      Text("Discover")
        .font(.system(.largeTitle, design: .serif, weight: .bold))
        .accessibilityAddTraits(.isHeader)
      Text("Curated by your circle, current releases, and catalog paths that still need a permanent 35mm home.")
        .font(.subheadline)
        .foregroundStyle(theme.textSecondary)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 20)
    .padding(.top, 18)
    .padding(.bottom, 22)
  }

  private var tabStrip: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 8) {
        ForEach(DiscoverTab.allCases) { tab in
          Button {
            Task { await viewModel.selectTab(tab) }
          } label: {
            Text(tab.rawValue)
              .font(.subheadline.weight(.semibold))
              .foregroundStyle(viewModel.selectedTab == tab ? Color.white : Color.primary)
              .padding(.horizontal, 16)
              .frame(minHeight: 40)
              .background(
                viewModel.selectedTab == tab ? Color.primary : theme.bgSunken,
                in: Capsule()
              )
          }
          .buttonStyle(.plain)
          .accessibilityAddTraits(viewModel.selectedTab == tab ? .isSelected : [])
        }
      }
      .padding(.horizontal, 20)
    }
    .padding(.bottom, 22)
  }

  @ViewBuilder
  private var content: some View {
    VStack(alignment: .leading, spacing: 18) {
      if let error = viewModel.error, !hasNoVisibleContent {
        DiscoverErrorBanner(message: error) {
          Task { await viewModel.loadCurrent(force: true) }
        }
        .padding(.horizontal, 20)
      }

      Group {
        if viewModel.isLoading && hasNoVisibleContent {
          DiscoverPageSkeleton()
        } else if let error = viewModel.error, hasNoVisibleContent {
          CatalogLoadState(
            systemImage: "wifi.exclamationmark",
            title: "Discovery unavailable",
            message: error,
            actionTitle: "Try Again"
          ) { Task { await viewModel.loadCurrent(force: true) } }
        } else if viewModel.isSearching {
          searchResults
        } else {
          switch viewModel.selectedTab {
          case .explore: exploreContent
          case .television: televisionContent
          case .nowPlaying: nowPlayingContent
          }
        }
      }
    }
  }

  private var hasNoVisibleContent: Bool {
    if viewModel.isSearching { return viewModel.searchResults.isEmpty }
    switch viewModel.selectedTab {
    case .explore: return viewModel.explore == nil
    case .television: return viewModel.television == nil
    case .nowPlaying: return viewModel.nowPlaying.isEmpty
    }
  }

  @ViewBuilder
  private var exploreContent: some View {
    if let data = viewModel.explore {
      let popular = unique(data.popular)
      let nowPlaying = unique(data.nowPlaying)
      let hero = popular.first
      let secondHero = nowPlaying.dropFirst().first
      let featuredIDs = Set([hero?.tmdbId, secondHero?.tmdbId].compactMap { $0 })
      let popularShelf = popular.filter { !featuredIDs.contains($0.tmdbId) }
      let nowPlayingShelf = nowPlaying.filter { !featuredIDs.contains($0.tmdbId) }

      VStack(alignment: .leading, spacing: 0) {
        if let hero {
          DiscoverTitleLink(title: hero, apiClient: apiClient) {
            DiscoverHeroCard(title: hero, label: "Popular pick")
          }
          .padding(.horizontal, 20)
        }

        SprocketDivider()

        DiscoverStreamingShelf(
          titles: unique(data.streaming).prefixArray(8),
          selectedProviderID: viewModel.streamingProviderID,
          apiClient: apiClient
        ) { id in
          Task { await viewModel.selectStreamingProvider(id) }
        }

        TicketDivider()

        DiscoverFilmShelf(
          title: "Trending across 35mm",
          subtitle: "Updated weekly",
          titles: unique(data.trending).prefixArray(14),
          apiClient: apiClient
        )

        DiscoverRankedShelf(
          titles: unique(data.topRated).prefixArray(10),
          apiClient: apiClient
        )
        .padding(.top, 34)

        TicketDivider()

        DiscoverFilmShelf(
          title: "Now playing",
          subtitle: "Fresh releases",
          titles: nowPlayingShelf.prefixArray(14),
          apiClient: apiClient
        )

        DiscoverFilmShelf(
          eyebrow: "CATALOG",
          title: "Popular films",
          subtitle: "Most watched",
          titles: popularShelf.prefixArray(14),
          apiClient: apiClient
        )
        .padding(.top, 34)

        if let secondHero {
          DiscoverTitleLink(title: secondHero, apiClient: apiClient) {
            DiscoverHeroCard(title: secondHero, label: "Now playing")
          }
          .padding(.horizontal, 20)
          .padding(.top, 34)
        }

        DiscoverMoodShelves(
          titles: unique(popularShelf + nowPlayingShelf),
          apiClient: apiClient
        )
        .padding(.top, 34)
      }
    }
  }

  @ViewBuilder
  private var televisionContent: some View {
    if let data = viewModel.television {
      VStack(alignment: .leading, spacing: 34) {
        DiscoverFilmShelf(
          title: "Popular TV Shows",
          titles: unique(data.popular).prefixArray(14),
          apiClient: apiClient
        )
        DiscoverFilmShelf(
          title: "On The Air",
          titles: unique(data.onTheAir).prefixArray(14),
          apiClient: apiClient
        )
        DiscoverFilmShelf(
          title: "Top Rated TV Shows",
          titles: unique(data.topRated).prefixArray(14),
          apiClient: apiClient
        )
      }
    }
  }

  private var nowPlayingContent: some View {
    DiscoverPosterGrid(
      title: "Now Playing",
      titles: viewModel.nowPlaying,
      apiClient: apiClient
    )
  }

  @ViewBuilder
  private var searchResults: some View {
    if viewModel.searchResults.isEmpty && !viewModel.isLoading {
      CatalogLoadState(
        systemImage: "film.stack",
        title: "No titles found",
        message: "Try another film, director, or actor.",
        actionTitle: nil,
        action: nil
      )
    } else {
      DiscoverPosterGrid(
        title: "Search results",
        titles: viewModel.searchResults,
        apiClient: apiClient
      )
    }
  }

  private func scheduleSearch() {
    searchTask?.cancel()
    searchTask = Task {
      do {
        try await Task.sleep(for: .milliseconds(400))
      } catch {
        return
      }
      guard !Task.isCancelled else { return }
      await viewModel.loadCurrent()
    }
  }

  private func unique(_ titles: [TMDBDiscoverTitle]) -> [TMDBDiscoverTitle] {
    var seen = Set<Int>()
    return titles.filter { seen.insert($0.tmdbId).inserted }
  }
}

private struct DiscoverTitleLink<Label: View>: View {
  @Environment(\.theme) private var theme
  let title: TMDBDiscoverTitle
  let apiClient: APIClient
  @ViewBuilder let label: () -> Label

  var body: some View {
    NavigationLink {
      DiscoverTitleResolverView(title: title, apiClient: apiClient)
    } label: {
      label()
    }
    .buttonStyle(.plain)
  }
}

private struct DiscoverTitleResolverView: View {
  @Environment(\.theme) private var theme
  let title: TMDBDiscoverTitle
  let apiClient: APIClient
  @State private var catalogTitle: CatalogTitle?
  @State private var finished = false
  @State private var resolutionError: String?

  var body: some View {
    Group {
      if let catalogTitle {
        TitleDetailView(titleID: catalogTitle.id, apiClient: apiClient)
      } else if let resolutionError {
        CatalogLoadState(
          systemImage: "wifi.exclamationmark",
          title: "Could not resolve title",
          message: resolutionError,
          actionTitle: "Try Again"
        ) { Task { await resolve() } }
      } else if finished {
        ContentUnavailableView {
          Label("Native title pending", systemImage: "film.stack")
        } description: {
          Text("\(title.displayTitle) is available in Discover but has not been linked to its permanent 35mm catalog record yet.")
        } actions: {
          Link("Open web title", destination: webTitleURL)
            .buttonStyle(.borderedProminent)
        }
      } else {
        ProgressView("Resolving 35mm title")
      }
    }
    .navigationTitle(title.displayTitle)
    .navigationBarTitleDisplayMode(.inline)
    .task {
      guard !finished else { return }
      await resolve()
    }
  }

  private func resolve() async {
    finished = false
    resolutionError = nil
    do {
      catalogTitle = try await CatalogAPI(client: apiClient).resolveTMDBTitle(id: title.tmdbId)
    } catch {
      resolutionError = error.localizedDescription
    }
    finished = true
  }

  private var webTitleURL: URL {
    AppConstants.webBaseURLValue.appending(path: "title/\(title.resolvedMediaType)/\(title.tmdbId)")
  }
}

private struct DiscoverHeroCard: View {
  @Environment(\.theme) private var theme
  let title: TMDBDiscoverTitle
  let label: String

  var body: some View {
    ZStack(alignment: .bottomLeading) {
      CatalogImage(url: title.backdropURL ?? title.posterURL, contentMode: .fill)
        .frame(height: 330)
        .overlay {
          LinearGradient(
            colors: [.clear, .black.opacity(0.2), .black.opacity(0.9)],
            startPoint: .top,
            endPoint: .bottom
          )
        }

      VStack(alignment: .leading, spacing: 8) {
        Text(label.uppercased())
          .font(.caption2.weight(.bold))
          .tracking(1.4)
          .foregroundStyle(theme.accent)
        Text(title.displayTitle)
          .font(.system(.title, design: .serif, weight: .bold))
          .foregroundStyle(theme.bg)
          .lineLimit(2)
        Text([title.yearText, title.resolvedMediaType == "tv" ? "Series" : nil]
          .compactMap { $0 }.joined(separator: " · "))
          .font(.subheadline.weight(.medium))
          .foregroundStyle(.white.opacity(0.76))
        if let overview = title.overview, !overview.isEmpty {
          Text(overview)
            .font(.caption)
            .foregroundStyle(.white.opacity(0.76))
            .lineLimit(3)
        }
      }
      .padding(20)
    }
    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    .accessibilityElement(children: .combine)
    .accessibilityHint("Opens title page")
  }
}

private struct DiscoverFilmShelf: View {
  @Environment(\.theme) private var theme
  var eyebrow: String?
  let title: String
  var subtitle: String?
  let titles: [TMDBDiscoverTitle]
  let apiClient: APIClient

  var body: some View {
    if !titles.isEmpty {
      VStack(alignment: .leading, spacing: 14) {
        VStack(alignment: .leading, spacing: 3) {
          if let eyebrow {
            Text(eyebrow)
              .font(.caption2.weight(.bold))
              .tracking(1.4)
              .foregroundStyle(theme.accent)
          }
          Text(title)
            .font(.system(.title2, design: .serif, weight: .bold))
            .accessibilityAddTraits(.isHeader)
          if let subtitle {
            Text(subtitle).font(.caption).foregroundStyle(theme.textSecondary)
          }
        }
        .padding(.horizontal, 20)

        ScrollView(.horizontal, showsIndicators: false) {
          LazyHStack(alignment: .top, spacing: 14) {
            ForEach(titles) { title in
              DiscoverTitleLink(title: title, apiClient: apiClient) {
                DiscoverPosterCard(title: title)
                  .frame(width: 132)
              }
            }
          }
          .padding(.horizontal, 20)
        }
      }
    }
  }
}

private struct DiscoverStreamingShelf: View {
  @Environment(\.theme) private var theme
  let titles: [TMDBDiscoverTitle]
  let selectedProviderID: Int?
  let apiClient: APIClient
  let onSelectProvider: (Int?) -> Void

  var body: some View {
    if !titles.isEmpty {
      VStack(alignment: .leading, spacing: 14) {
        Text("What's streaming right now")
          .font(.system(.title2, design: .serif, weight: .bold))
          .padding(.horizontal, 20)
          .accessibilityAddTraits(.isHeader)

        ScrollView(.horizontal, showsIndicators: false) {
          HStack(spacing: 8) {
            ForEach(DiscoverStreamingProvider.options) { provider in
              Button(provider.label) { onSelectProvider(provider.id) }
                .font(.caption.weight(.semibold))
                .foregroundStyle(selectedProviderID == provider.id ? Color.white : Color.primary)
                .padding(.horizontal, 12)
                .frame(minHeight: 34)
                .background(
                  selectedProviderID == provider.id ? Color.primary : Color.clear,
                  in: Capsule()
                )
                .overlay {
                  Capsule().stroke(Color.primary.opacity(0.16))
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(selectedProviderID == provider.id ? .isSelected : [])
            }
          }
          .padding(.horizontal, 20)
        }

        ScrollView(.horizontal, showsIndicators: false) {
          LazyHStack(alignment: .top, spacing: 14) {
            ForEach(titles) { title in
              DiscoverTitleLink(title: title, apiClient: apiClient) {
                DiscoverPosterCard(title: title, badge: providerLabel)
                  .frame(width: 122)
              }
            }
          }
          .padding(.horizontal, 20)
        }
      }
    }
  }

  private var providerLabel: String {
    DiscoverStreamingProvider.options.first { $0.id == selectedProviderID }?.label ?? "Streaming"
  }
}

private struct DiscoverRankedShelf: View {
  @Environment(\.theme) private var theme
  let titles: [TMDBDiscoverTitle]
  let apiClient: APIClient

  var body: some View {
    if !titles.isEmpty {
      VStack(alignment: .leading, spacing: 18) {
        Text("CATALOG RANKED")
          .font(.caption2.weight(.bold))
          .tracking(1.5)
          .foregroundStyle(theme.accent)
        Text("Top rated right now")
          .font(.system(.title, design: .serif, weight: .bold))
          .foregroundStyle(.white)

        ForEach(Array(titles.enumerated()), id: \.element.id) { index, title in
          DiscoverTitleLink(title: title, apiClient: apiClient) {
            HStack(spacing: 13) {
              Text(String(index + 1).paddingLeft(toLength: 2, withPad: "0"))
                .font(.system(.title2, design: .serif, weight: .bold))
                .foregroundStyle(theme.bg.opacity(0.32))
                .frame(width: 38)
              CatalogImage(url: title.posterURL, contentMode: .fill)
                .frame(width: 42, height: 62)
                .clipShape(RoundedRectangle(cornerRadius: 4))
              VStack(alignment: .leading, spacing: 4) {
                Text(title.displayTitle)
                  .font(.subheadline.weight(.semibold))
                  .foregroundStyle(theme.bg)
                  .lineLimit(1)
                Text([title.yearText, "★ " + title.starRating.formatted(.number.precision(.fractionLength(1)))]
                  .compactMap { $0 }.joined(separator: " · "))
                  .font(.caption)
                  .foregroundStyle(theme.bg.opacity(0.58))
              }
              Spacer()
            }
            .padding(.vertical, 6)
            .overlay(alignment: .bottom) {
              Divider().overlay(theme.bg.opacity(0.1))
            }
          }
        }
      }
      .padding(20)
      .background(theme.text, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
      .padding(.horizontal, 20)
    }
  }
}

private struct DiscoverMoodShelves: View {
  @Environment(\.theme) private var theme
  let titles: [TMDBDiscoverTitle]
  let apiClient: APIClient

  var body: some View {
    VStack(alignment: .leading, spacing: 34) {
      DiscoverFilmShelf(
        title: "Sci-fi, drama & mystery",
        titles: matching([878, 18, 9648]),
        apiClient: apiClient
      )
      DiscoverFilmShelf(
        title: "Adventure, fantasy & history",
        titles: matching([12, 14, 36, 10752]),
        apiClient: apiClient
      )
    }
  }

  private func matching(_ genres: Set<Int>) -> [TMDBDiscoverTitle] {
    let matches = titles.filter { !genres.isDisjoint(with: $0.genreIds) }
    guard matches.count >= 5 else { return [] }
    return Array(matches.prefix(12))
  }
}

private struct DiscoverPosterGrid: View {
  @Environment(\.theme) private var theme
  let title: String
  let titles: [TMDBDiscoverTitle]
  let apiClient: APIClient

  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      Text(title)
        .font(.system(.title2, design: .serif, weight: .bold))
        .padding(.horizontal, 20)
        .accessibilityAddTraits(.isHeader)
      LazyVGrid(
        columns: [GridItem(.adaptive(minimum: 132, maximum: 210), spacing: 16)],
        alignment: .leading,
        spacing: 24
      ) {
        ForEach(titles) { title in
          DiscoverTitleLink(title: title, apiClient: apiClient) {
            DiscoverPosterCard(title: title)
          }
        }
      }
      .padding(.horizontal, 20)
    }
  }
}

private struct DiscoverPosterCard: View {
  @Environment(\.theme) private var theme
  let title: TMDBDiscoverTitle
  var badge: String?

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      CatalogImage(url: title.posterURL, contentMode: .fill)
        .aspectRatio(2 / 3, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
        .overlay(alignment: .bottomLeading) {
          if let badge {
            Text(badge.uppercased())
              .font(.system(size: 9, weight: .bold, design: .monospaced))
              .padding(.horizontal, 6)
              .padding(.vertical, 4)
              .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 4))
              .padding(7)
          }
        }
      Text(title.displayTitle)
        .font(.caption.weight(.semibold))
        .foregroundStyle(theme.text)
        .lineLimit(2)
      Text([title.yearText, title.resolvedMediaType == "tv" ? "Series" : nil]
        .compactMap { $0 }.joined(separator: " · "))
        .font(.caption2)
        .foregroundStyle(theme.textSecondary)
        .lineLimit(1)
    }
    .accessibilityElement(children: .combine)
    .accessibilityHint("Opens title page")
  }
}

private struct SprocketDivider: View {
  @Environment(\.theme) private var theme
  var body: some View {
    HStack(spacing: 16) {
      ForEach(0..<14, id: \.self) { _ in
        Circle().fill(Color.primary.opacity(0.18)).frame(width: 5, height: 5)
      }
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 34)
    .accessibilityHidden(true)
  }
}

private struct TicketDivider: View {
  @Environment(\.theme) private var theme
  var body: some View {
    Divider()
      .overlay(Color.primary.opacity(0.12))
      .padding(.horizontal, 20)
      .padding(.vertical, 34)
      .accessibilityHidden(true)
  }
}

private struct DiscoverPageSkeleton: View {
  @Environment(\.theme) private var theme
  var body: some View {
    VStack(alignment: .leading, spacing: 28) {
      RoundedRectangle(cornerRadius: 18)
        .fill(theme.bgSunken)
        .frame(height: 330)
      ForEach(0..<3, id: \.self) { _ in
        VStack(alignment: .leading, spacing: 12) {
          RoundedRectangle(cornerRadius: 4)
            .fill(theme.bgSunken)
            .frame(width: 190, height: 24)
          HStack(spacing: 14) {
            ForEach(0..<3, id: \.self) { _ in
              RoundedRectangle(cornerRadius: 7)
                .fill(theme.bgSunken)
                .frame(width: 112, height: 168)
            }
          }
        }
      }
    }
    .padding(.horizontal, 20)
    .redacted(reason: .placeholder)
    .accessibilityLabel("Loading Discover")
  }
}

private struct DiscoverErrorBanner: View {
  @Environment(\.theme) private var theme
  let message: String
  let retry: () -> Void

  var body: some View {
    HStack(alignment: .top, spacing: 12) {
      Image(systemName: "wifi.exclamationmark")
        .foregroundStyle(theme.accent)
      Text(message)
        .font(.caption)
        .foregroundStyle(theme.textSecondary)
        .frame(maxWidth: .infinity, alignment: .leading)
      Button("Retry", action: retry)
        .font(.caption.weight(.semibold))
    }
    .padding(12)
    .background(theme.bgSunken, in: RoundedRectangle(cornerRadius: 10))
    .accessibilityElement(children: .combine)
  }
}

struct CatalogImage: View {
  @Environment(\.theme) private var theme
  let url: String?
  var contentMode: SwiftUI.ContentMode = .fill

  var body: some View {
    KFImage(url.flatMap(URL.init(string:)))
      .placeholder {
        ZStack {
          theme.bgSunken
          Image(systemName: "film")
            .font(.title3)
            .foregroundStyle(theme.textTertiary)
        }
      }
      .retry(maxCount: 2, interval: .seconds(1))
      .fade(duration: 0.18)
      .resizable()
      .aspectRatio(contentMode: contentMode)
      .clipped()
  }
}

struct CatalogLoadState: View {
  @Environment(\.theme) private var theme
  let systemImage: String
  let title: String
  let message: String
  let actionTitle: String?
  let action: (() -> Void)?

  var body: some View {
    ContentUnavailableView {
      Label(title, systemImage: systemImage)
    } description: {
      Text(message)
    } actions: {
      if let actionTitle, let action {
        Button(actionTitle, action: action)
          .buttonStyle(.borderedProminent)
      }
    }
  }
}

private extension Collection {
  func prefixArray(_ maxLength: Int) -> [Element] { Array(prefix(maxLength)) }
}

private extension String {
  func paddingLeft(toLength: Int, withPad character: Character) -> String {
    guard count < toLength else { return self }
    return String(repeating: String(character), count: toLength - count) + self
  }
}

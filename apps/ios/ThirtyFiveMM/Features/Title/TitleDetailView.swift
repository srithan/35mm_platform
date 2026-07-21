import Kingfisher
import SwiftUI
import UIKit

enum TitleDetailTab: String, CaseIterable, Identifiable {
  case overview = "Overview"
  case reviews = "Reviews"

  var id: String { rawValue }
}

@MainActor
final class TitleDetailViewModel: ObservableObject {
  @Published private(set) var detail: CatalogTitleDetail?
  @Published private(set) var credits: [CatalogCredit] = []
  @Published private(set) var media: [CatalogMedia] = []
  @Published private(set) var reviews: [FeedPost] = []
  @Published private(set) var isLoading = false
  @Published private(set) var isLoadingReviews = false
  @Published private(set) var isLoadingMoreReviews = false
  @Published private(set) var isUpdatingWatchlist = false
  @Published private(set) var isInWatchlist = false
  @Published private(set) var hasMoreReviews = false
  @Published private(set) var error: String?
  @Published private(set) var reviewsError: String?

  private let titleID: String
  private let service: CatalogServing
  private var reviewsCursor: String?
  private var didRequestReviews = false
  private let reviewPageLimit = 20

  init(titleID: String, service: CatalogServing) {
    self.titleID = titleID
    self.service = service
  }

  convenience init(titleID: String, apiClient: APIClient) {
    self.init(titleID: titleID, service: CatalogAPI(client: apiClient))
  }

  func load() async {
    guard !isLoading else { return }
    isLoading = true
    error = nil

    do {
      let loadedDetail = try await service.title(id: titleID)
      detail = loadedDetail

      do {
        let response = try await service.credits(titleId: titleID, cursor: nil, limit: 24)
        credits = response.items
      } catch {
        self.error = "Title loaded, but credits are unavailable: \(error.localizedDescription)"
      }

      do {
        let response = try await service.media(titleId: titleID, type: nil, cursor: nil, limit: 30)
        media = response.items
      } catch {
        self.error = "Title loaded, but media are unavailable: \(error.localizedDescription)"
      }

      if let filmID = loadedDetail.legacyFilmId {
        do {
          isInWatchlist = try await service.watchlistStatus(filmId: filmID).isInWatchlist
        } catch {
          if case APIError.unauthorized = error {
            isInWatchlist = false
          }
        }
      }
    } catch {
      self.error = error.localizedDescription
    }

    isLoading = false
  }

  func loadReviewsIfNeeded() async {
    guard !didRequestReviews else { return }
    didRequestReviews = true
    await loadReviews(reset: true)
  }

  func retryReviews() async {
    didRequestReviews = true
    await loadReviews(reset: true)
  }

  func loadMoreReviews() async {
    guard hasMoreReviews, !isLoadingReviews, !isLoadingMoreReviews else { return }
    await loadReviews(reset: false)
  }

  func toggleWatchlist() async {
    guard let filmID = detail?.legacyFilmId, !isUpdatingWatchlist else { return }
    let previous = isInWatchlist
    isInWatchlist.toggle()
    isUpdatingWatchlist = true
    error = nil

    do {
      if previous {
        _ = try await service.removeFromWatchlist(filmId: filmID)
      } else {
        _ = try await service.addToWatchlist(filmId: filmID)
      }
    } catch {
      isInWatchlist = previous
      self.error = error.localizedDescription
    }

    isUpdatingWatchlist = false
  }

  func toggleReviewLike(postID: String) async {
    guard let index = reviews.firstIndex(where: { $0.id == postID }) else { return }
    let original = reviews[index]
    reviews[index] = original.toggledLike()

    do {
      if original.isLiked {
        try await service.unlikeReview(postId: postID)
      } else {
        try await service.likeReview(postId: postID)
      }
    } catch {
      if let current = reviews.firstIndex(where: { $0.id == postID }) {
        reviews[current] = original
      }
      reviewsError = error.localizedDescription
    }
  }

  var backdropURL: String? {
    media.first(where: { $0.type == "backdrop" })?.url
      ?? media.first(where: { $0.type == "still" })?.url
      ?? detail?.primaryMedia?.url
  }

  var castPreview: [CatalogCredit] {
    Array(credits.filter { $0.department == "cast" && $0.person != nil }.prefix(12))
  }

  private func loadReviews(reset: Bool) async {
    guard let filmID = detail?.legacyFilmId else {
      reviews = []
      hasMoreReviews = false
      reviewsError = nil
      return
    }

    if reset {
      isLoadingReviews = true
      reviewsCursor = nil
      reviewsError = nil
    } else {
      isLoadingMoreReviews = true
    }

    do {
      let response = try await service.reviews(
        filmId: filmID,
        cursor: reset ? nil : reviewsCursor,
        limit: reviewPageLimit
      )
      if reset {
        reviews = response.items
      } else {
        var seen = Set(reviews.map(\.id))
        reviews.append(contentsOf: response.items.filter { seen.insert($0.id).inserted })
      }
      reviewsCursor = response.nextCursor
      hasMoreReviews = response.hasMore
    } catch {
      reviewsError = error.localizedDescription
      if reset { reviews = [] }
    }

    isLoadingReviews = false
    isLoadingMoreReviews = false
  }
}

struct TitleDetailView: View {
  @Environment(\.theme) private var theme
  @Environment(\.openURL) private var openURL
  @StateObject private var viewModel: TitleDetailViewModel
  @State private var selectedTab: TitleDetailTab = .overview
  @State private var isShowingActions = false
  private let apiClient: APIClient

  init(titleID: String, apiClient: APIClient) {
    self.apiClient = apiClient
    _viewModel = StateObject(
      wrappedValue: TitleDetailViewModel(titleID: titleID, apiClient: apiClient)
    )
  }

  var body: some View {
    Group {
      if viewModel.isLoading && viewModel.detail == nil {
        TitleLoadingView()
      } else if let detail = viewModel.detail {
        ScrollView {
          LazyVStack(alignment: .leading, spacing: 0) {
            hero(detail)
            actionBar(detail)
            tabPicker

            if selectedTab == .overview {
              overview(detail)
            } else {
              TitleReviewsView(viewModel: viewModel, apiClient: apiClient)
                .task { await viewModel.loadReviewsIfNeeded() }
            }
          }
          .padding(.bottom, 40)
        }
        .background(theme.bg)
        .refreshable { await viewModel.load() }
      } else {
        CatalogLoadState(
          systemImage: "exclamationmark.triangle",
          title: "Title unavailable",
          message: viewModel.error ?? "This title could not be loaded.",
          actionTitle: "Try Again"
        ) {
          Task { await viewModel.load() }
        }
      }
    }
    .navigationTitle(viewModel.detail?.primaryTitle ?? "Title")
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        Button {
          isShowingActions = true
        } label: {
          Image(systemName: "ellipsis.circle")
        }
        .disabled(viewModel.detail == nil)
        .accessibilityLabel("Title actions")
      }
    }
    .task {
      if viewModel.detail == nil { await viewModel.load() }
    }
    .bottomActionSheet(isPresented: $isShowingActions) {
      titleActions
    }
  }

  private func hero(_ detail: CatalogTitleDetail) -> some View {
    ZStack(alignment: .bottom) {
      CatalogImage(url: viewModel.backdropURL, contentMode: .fill)
        .frame(height: 410)
        .overlay {
          LinearGradient(
            colors: [.black.opacity(0.05), .black.opacity(0.2), .black.opacity(0.92)],
            startPoint: .top,
            endPoint: .bottom
          )
        }

      HStack(alignment: .bottom, spacing: 18) {
        CatalogImage(url: detail.primaryMedia?.url, contentMode: .fill)
          .frame(width: 112, height: 168)
          .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
          .overlay {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
              .stroke(.white.opacity(0.22), lineWidth: 1)
          }
          .shadow(color: .black.opacity(0.35), radius: 16, y: 8)

        VStack(alignment: .leading, spacing: 8) {
          Text(detail.card.kindLabel.uppercased())
            .font(.caption2.weight(.bold))
            .tracking(1.6)
            .foregroundStyle(.white.opacity(0.72))

          Text(detail.primaryTitle)
            .font(.system(.title, design: .serif, weight: .bold))
            .foregroundStyle(.white)
            .lineLimit(3)
            .minimumScaleFactor(0.8)

          Text(metadataLine(detail))
            .font(.subheadline.weight(.medium))
            .foregroundStyle(.white.opacity(0.78))
            .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.horizontal, 20)
      .padding(.bottom, 24)
    }
    .accessibilityElement(children: .combine)
  }

  private func actionBar(_ detail: CatalogTitleDetail) -> some View {
    HStack(spacing: 10) {
      if detail.legacyFilmId != nil {
        Button {
          Task { await viewModel.toggleWatchlist() }
        } label: {
          Label(
            viewModel.isInWatchlist ? "On watchlist" : "Watchlist",
            systemImage: viewModel.isInWatchlist ? "bookmark.fill" : "bookmark"
          )
          .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .tint(.primary)
        .disabled(viewModel.isUpdatingWatchlist)
      }

      Button {
        selectedTab = .reviews
      } label: {
        Label("Reviews", systemImage: "text.bubble")
          .frame(maxWidth: .infinity)
      }
      .buttonStyle(.bordered)

      Button {
        isShowingActions = true
      } label: {
        Image(systemName: "ellipsis")
          .frame(width: 32, height: 20)
      }
      .buttonStyle(.bordered)
      .accessibilityLabel("More title actions")
    }
    .controlSize(.large)
    .padding(.horizontal, 20)
    .padding(.vertical, 18)
  }

  private var tabPicker: some View {
    Picker("Title section", selection: $selectedTab) {
      ForEach(TitleDetailTab.allCases) { tab in
        Text(tab.rawValue).tag(tab)
      }
    }
    .pickerStyle(.segmented)
    .padding(.horizontal, 20)
    .padding(.bottom, 28)
  }

  private func overview(_ detail: CatalogTitleDetail) -> some View {
    VStack(alignment: .leading, spacing: 34) {
      if let synopsis = detail.synopsis, !synopsis.isEmpty {
        TitleSection(title: "About") {
          Text(synopsis)
            .font(.body)
            .foregroundStyle(theme.textSecondary)
            .lineSpacing(5)
            .fixedSize(horizontal: false, vertical: true)
        }
      }

      TitleSection(title: "At a glance") {
        VStack(spacing: 0) {
          TitleFactRow(label: "Type", value: detail.card.kindLabel)
          if let year = detail.card.yearText {
            Divider().padding(.leading, 112)
            TitleFactRow(label: "Year", value: year)
          }
          if let runtime = detail.runtimeMinutes {
            Divider().padding(.leading, 112)
            TitleFactRow(label: "Runtime", value: runtimeText(runtime))
          }
          if !detail.originCountries.isEmpty {
            Divider().padding(.leading, 112)
            TitleFactRow(label: "Country", value: detail.originCountries.joined(separator: ", "))
          }
          if !detail.spokenLanguages.isEmpty {
            Divider().padding(.leading, 112)
            TitleFactRow(label: "Languages", value: detail.spokenLanguages.joined(separator: ", "))
          }
        }
        .background(theme.bgSunken, in: RoundedRectangle(cornerRadius: 14))
      }

      if !viewModel.castPreview.isEmpty {
        TitleSection(title: "Cast") {
          ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(alignment: .top, spacing: 14) {
              ForEach(viewModel.castPreview) { credit in
                CastCreditCard(credit: credit)
              }
            }
          }

          NavigationLink {
            CastCrewView(titleID: detail.id, title: detail.primaryTitle, apiClient: apiClient)
          } label: {
            Label("See all cast and crew", systemImage: "arrow.right")
              .font(.subheadline.weight(.semibold))
          }
          .padding(.top, 14)
        }
      }
    }
    .padding(.horizontal, 20)
  }

  private var titleActions: some View {
    BottomActionSheet(
      title: viewModel.detail?.primaryTitle ?? "Title actions",
      sections: [
        BottomActionSheetSection(actions: watchlistActions),
        BottomActionSheetSection(actions: externalActions),
      ].filter { !$0.actions.isEmpty }
    )
  }

  private var watchlistActions: [BottomActionSheetAction] {
    guard viewModel.detail?.legacyFilmId != nil else { return [] }
    return [
      BottomActionSheetAction(
        viewModel.isInWatchlist ? "Remove from watchlist" : "Add to watchlist",
        systemImage: viewModel.isInWatchlist ? "bookmark.slash" : "bookmark"
      ) {
        Task { await viewModel.toggleWatchlist() }
      }
    ]
  }

  private var externalActions: [BottomActionSheetAction] {
    var actions = [
      BottomActionSheetAction("Copy title", systemImage: "doc.on.doc") {
        UIPasteboard.general.string = viewModel.detail?.primaryTitle
      }
    ]
    if let url = viewModel.detail?.imdbURL {
      actions.append(
        BottomActionSheetAction("Open IMDb", systemImage: "arrow.up.right.square") {
          openURL(url)
        }
      )
    }
    return actions
  }

  private func metadataLine(_ detail: CatalogTitleDetail) -> String {
    var values = [detail.card.yearText, detail.runtimeMinutes.map(runtimeText)]
      .compactMap { $0 }
    if let country = detail.primaryCountry { values.append(country) }
    return values.joined(separator: " · ")
  }

  private func runtimeText(_ minutes: Int) -> String {
    let hours = minutes / 60
    let remaining = minutes % 60
    return hours > 0 ? "\(hours)h \(remaining)m" : "\(remaining)m"
  }
}

private struct TitleSection<Content: View>: View {
  @Environment(\.theme) private var theme
  let title: String
  @ViewBuilder let content: () -> Content

  var body: some View {
    VStack(alignment: .leading, spacing: 13) {
      Text(title)
        .font(.title3.weight(.bold))
        .accessibilityAddTraits(.isHeader)
      content()
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

private struct TitleFactRow: View {
  @Environment(\.theme) private var theme
  let label: String
  let value: String

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 12) {
      Text(label)
        .font(.subheadline)
        .foregroundStyle(theme.textSecondary)
        .frame(width: 88, alignment: .leading)
      Text(value)
        .font(.subheadline.weight(.medium))
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 13)
    .accessibilityElement(children: .combine)
  }
}

private struct CastCreditCard: View {
  @Environment(\.theme) private var theme
  let credit: CatalogCredit

  var body: some View {
    VStack(spacing: 8) {
      CatalogImage(url: credit.person?.primaryMedia?.url, contentMode: .fill)
        .frame(width: 76, height: 76)
        .clipShape(Circle())
      Text(credit.person?.primaryName ?? credit.creditedAs ?? "Unknown")
        .font(.caption.weight(.semibold))
        .multilineTextAlignment(.center)
        .lineLimit(2)
      Text(credit.roleText)
        .font(.caption2)
        .foregroundStyle(theme.textSecondary)
        .multilineTextAlignment(.center)
        .lineLimit(2)
    }
    .frame(width: 92)
    .accessibilityElement(children: .combine)
  }
}

private struct TitleLoadingView: View {
  @Environment(\.theme) private var theme
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 18) {
        Rectangle()
          .fill(theme.bgSunken)
          .frame(height: 410)
        RoundedRectangle(cornerRadius: 8)
          .fill(theme.bgSunken)
          .frame(height: 48)
          .padding(.horizontal, 20)
        ForEach(0..<4, id: \.self) { _ in
          RoundedRectangle(cornerRadius: 8)
            .fill(theme.bgSunken)
            .frame(height: 72)
            .padding(.horizontal, 20)
        }
      }
      .redacted(reason: .placeholder)
    }
    .accessibilityLabel("Loading title")
  }
}

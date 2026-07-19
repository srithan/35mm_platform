import SwiftUI
import UIKit

@MainActor
final class CastCrewViewModel: ObservableObject {
  @Published private(set) var credits: [CatalogCredit] = []
  @Published private(set) var isLoading = false
  @Published private(set) var isLoadingMore = false
  @Published private(set) var hasMore = true
  @Published private(set) var error: String?
  @Published var selectedDepartment: String?

  private let titleID: String
  private let service: CatalogServing
  private let pageLimit = 50
  private var nextCursor: String?

  init(titleID: String, service: CatalogServing) {
    self.titleID = titleID
    self.service = service
  }

  convenience init(titleID: String, apiClient: APIClient) {
    self.init(titleID: titleID, service: CatalogAPI(client: apiClient))
  }

  var departments: [String] {
    Array(Set(credits.map(\.department))).sorted { lhs, rhs in
      departmentRank(lhs) < departmentRank(rhs)
    }
  }

  var visibleCredits: [CatalogCredit] {
    guard let selectedDepartment else { return credits }
    return credits.filter { $0.department == selectedDepartment }
  }

  func loadInitial() async {
    guard !isLoading else { return }
    isLoading = true
    error = nil
    nextCursor = nil
    hasMore = true

    do {
      let response = try await service.credits(titleId: titleID, cursor: nil, limit: pageLimit)
      credits = response.items
      nextCursor = response.nextCursor
      hasMore = response.hasMore
    } catch {
      self.error = error.localizedDescription
      hasMore = false
    }

    isLoading = false
  }

  func loadMore() async {
    guard !isLoading, !isLoadingMore, hasMore else { return }
    isLoadingMore = true

    do {
      let response = try await service.credits(
        titleId: titleID,
        cursor: nextCursor,
        limit: pageLimit
      )
      var seen = Set(credits.map(\.id))
      credits.append(contentsOf: response.items.filter { seen.insert($0.id).inserted })
      nextCursor = response.nextCursor
      hasMore = response.hasMore
    } catch {
      self.error = error.localizedDescription
    }

    isLoadingMore = false
  }

  private func departmentRank(_ value: String) -> Int {
    let order = ["cast", "directing", "writing", "production", "camera", "editing", "music", "sound", "art", "costume", "makeup", "visual_effects", "stunts", "animation", "crew", "other"]
    return order.firstIndex(of: value) ?? order.count
  }
}

struct CastCrewView: View {
  @StateObject private var viewModel: CastCrewViewModel
  @State private var selectedCredit: CatalogCredit?
  private let title: String

  init(titleID: String, title: String, apiClient: APIClient) {
    self.title = title
    _viewModel = StateObject(
      wrappedValue: CastCrewViewModel(titleID: titleID, apiClient: apiClient)
    )
  }

  var body: some View {
    Group {
      if viewModel.isLoading && viewModel.credits.isEmpty {
        ProgressView("Loading cast and crew")
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      } else if let error = viewModel.error, viewModel.credits.isEmpty {
        CatalogLoadState(
          systemImage: "person.3",
          title: "Credits unavailable",
          message: error,
          actionTitle: "Try Again"
        ) {
          Task { await viewModel.loadInitial() }
        }
      } else if viewModel.credits.isEmpty {
        CatalogLoadState(
          systemImage: "person.3",
          title: "No credits yet",
          message: "Cast and crew have not been added to this catalog title.",
          actionTitle: nil,
          action: nil
        )
      } else {
        VStack(spacing: 0) {
          departmentStrip
          List {
            ForEach(viewModel.visibleCredits) { credit in
              Button {
                selectedCredit = credit
              } label: {
                CreditRow(credit: credit)
              }
              .buttonStyle(.plain)
              .listRowSeparator(.hidden)
              .listRowInsets(EdgeInsets(top: 7, leading: 20, bottom: 7, trailing: 20))
              .onAppear {
                if credit.id == viewModel.visibleCredits.last?.id {
                  Task { await viewModel.loadMore() }
                }
              }
            }

            if viewModel.isLoadingMore {
              ProgressView("Loading more credits")
                .frame(maxWidth: .infinity)
                .listRowSeparator(.hidden)
            } else if viewModel.hasMore && viewModel.selectedDepartment != nil {
              Button("Load more credits") {
                Task { await viewModel.loadMore() }
              }
              .frame(maxWidth: .infinity)
              .listRowSeparator(.hidden)
            }
          }
          .listStyle(.plain)
          .refreshable { await viewModel.loadInitial() }
        }
      }
    }
    .navigationTitle("Cast & Crew")
    .navigationBarTitleDisplayMode(.inline)
    .safeAreaInset(edge: .top, spacing: 0) {
      Text(title)
        .font(.caption.weight(.semibold))
        .foregroundStyle(.secondary)
        .lineLimit(1)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(.bar)
    }
    .task {
      if viewModel.credits.isEmpty { await viewModel.loadInitial() }
    }
    .bottomActionSheet(item: $selectedCredit) { credit in
      BottomActionSheet(
        title: credit.person?.primaryName ?? credit.creditedAs ?? "Credit",
        actions: [
          BottomActionSheetAction("Copy name", systemImage: "doc.on.doc") {
            UIPasteboard.general.string = credit.person?.primaryName ?? credit.creditedAs
          },
          BottomActionSheetAction("Copy role", systemImage: "text.quote") {
            UIPasteboard.general.string = credit.roleText
          },
        ]
      )
    }
  }

  private var departmentStrip: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 8) {
        departmentButton(value: nil, title: "All")
        ForEach(viewModel.departments, id: \.self) { department in
          departmentButton(
            value: department,
            title: department.replacingOccurrences(of: "_", with: " ").capitalized
          )
        }
      }
      .padding(.horizontal, 20)
      .padding(.vertical, 12)
    }
    .background(Color(.systemBackground))
    .overlay(alignment: .bottom) { Divider() }
  }

  private func departmentButton(value: String?, title: String) -> some View {
    Button {
      viewModel.selectedDepartment = value
    } label: {
      Text(title)
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(viewModel.selectedDepartment == value ? Color.white : Color.primary)
        .padding(.horizontal, 14)
        .frame(minHeight: 38)
        .background(
          viewModel.selectedDepartment == value ? Color.primary : Color(.secondarySystemBackground),
          in: Capsule()
        )
    }
    .buttonStyle(.plain)
    .accessibilityAddTraits(viewModel.selectedDepartment == value ? .isSelected : [])
  }
}

private struct CreditRow: View {
  let credit: CatalogCredit

  var body: some View {
    HStack(spacing: 14) {
      CatalogImage(url: credit.person?.primaryMedia?.url, contentMode: .fill)
        .frame(width: 58, height: 58)
        .clipShape(Circle())

      VStack(alignment: .leading, spacing: 4) {
        Text(credit.person?.primaryName ?? credit.creditedAs ?? "Unknown")
          .font(.body.weight(.semibold))
          .foregroundStyle(.primary)
          .lineLimit(2)
        Text(credit.roleText)
          .font(.subheadline)
          .foregroundStyle(.secondary)
          .lineLimit(2)
        Text(credit.departmentLabel)
          .font(.caption2.weight(.bold))
          .foregroundStyle(.tertiary)
          .textCase(.uppercase)
      }

      Spacer(minLength: 8)
      Image(systemName: "ellipsis")
        .foregroundStyle(.tertiary)
    }
    .contentShape(Rectangle())
    .accessibilityElement(children: .combine)
    .accessibilityHint("Opens credit actions")
  }
}

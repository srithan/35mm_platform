import SwiftUI

struct FollowRequestsView: View {
  @Environment(\.theme) private var theme
  @StateObject private var viewModel: FollowRequestsViewModel

  init(service: any FollowRequestServicing) {
    _viewModel = StateObject(wrappedValue: FollowRequestsViewModel(service: service))
  }

  var body: some View {
    content
      .background(theme.bg)
      .navigationTitle("Follow requests")
      .navigationBarTitleDisplayMode(.inline)
      .task {
        await viewModel.loadInitial()
      }
  }

  @ViewBuilder
  private var content: some View {
    if viewModel.isLoadingInitial && viewModel.requests.isEmpty {
      ProgressView("Loading requests")
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    } else if let error = viewModel.error, viewModel.requests.isEmpty {
      VStack(spacing: DesignSystem.Spacing.sm) {
        ContentUnavailableView(
          "Couldn't load requests",
          systemImage: "person.2.slash",
          description: Text(error)
        )

        Button("Try again") {
          Task { await viewModel.loadInitial() }
        }
        .buttonStyle(.borderedProminent)
        .tint(theme.accent)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    } else if viewModel.requests.isEmpty {
      ContentUnavailableView(
        "No follow requests",
        systemImage: "person.2",
        description: Text("New requests will appear here.")
      )
    } else {
      List {
        ForEach(viewModel.requests) { request in
          FollowRequestRow(
            request: request,
            onAccept: { Task { await viewModel.accept(request) } },
            onDecline: { Task { await viewModel.decline(request) } }
          )
          .listRowInsets(EdgeInsets())
          .listRowSeparator(.hidden)
          .task {
            await viewModel.loadMoreIfNeeded(currentRequestID: request.id)
          }
        }

        if viewModel.isLoadingMore {
          ProgressView()
            .frame(maxWidth: .infinity)
            .padding(.vertical, DesignSystem.Spacing.md)
            .listRowSeparator(.hidden)
        }
      }
      .listStyle(.plain)
      .themedListBackground()
      .refreshable {
        await viewModel.refresh()
      }
      .overlay(alignment: .top) {
        if let error = viewModel.error {
          HStack(spacing: DesignSystem.Spacing.xs) {
            Image(systemName: "exclamationmark.triangle.fill")
              .foregroundStyle(.orange)

            Text(error)
              .font(.footnote)
              .foregroundStyle(theme.text)
              .lineLimit(2)

            Spacer(minLength: DesignSystem.Spacing.xs)

            Button("Dismiss", systemImage: "xmark") {
              viewModel.clearError()
            }
            .labelStyle(.iconOnly)
            .frame(width: 44, height: 44)
          }
          .padding(.leading, DesignSystem.Spacing.sm)
          .background(theme.bgElevated, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
          .overlay {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
              .stroke(theme.border, lineWidth: 0.5)
          }
          .padding(.horizontal, DesignSystem.Spacing.sm)
          .padding(.top, DesignSystem.Spacing.xs)
        }
      }
    }
  }
}

import SwiftUI

struct ProfileDestination: Hashable {
  let username: String

  init(username: String) {
    self.username = username
      .trimmingCharacters(in: .whitespacesAndNewlines)
      .lowercased()
  }
}

struct ProfileView: View {
  @Environment(\.dismiss) private var dismiss
  @State private var model: ProfileViewModel

  private let service: any ProfileServicing
  private let onCurrentProfileUpdated: (PublicProfile) -> Void

  init(
    username: String,
    service: any ProfileServicing,
    onCurrentProfileUpdated: @escaping (PublicProfile) -> Void = { _ in }
  ) {
    self.service = service
    self.onCurrentProfileUpdated = onCurrentProfileUpdated
    _model = State(initialValue: ProfileViewModel(username: username, service: service))
  }

  var body: some View {
    VStack(spacing: 0) {
      ProfileNavigationHeader(onBack: dismiss.callAsFunction)

      Group {
        switch model.screenPhase {
        case .loading:
          ProgressView("Loading profile")
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        case .failure(let error):
          ContentUnavailableView {
            Label("Couldn't load profile", systemImage: "person.crop.circle.badge.exclamationmark")
          } description: {
            Text(error)
          } actions: {
            Button("Try again") {
              Task { await model.load() }
            }
            .buttonStyle(.borderedProminent)
          }
        case .blocked:
          ContentUnavailableView(
            "Profile blocked",
            systemImage: "person.crop.circle.badge.xmark",
            description: Text("This account can no longer view or interact with you.")
          )
        case .content(let profile):
          ProfileLoadedView(
            profile: profile,
            model: model,
            service: service,
            onCurrentProfileUpdated: onCurrentProfileUpdated
          )
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .background(Color(.systemBackground))
    .navigationTitle("Profile")
    .toolbar(.hidden, for: .navigationBar)
    .task {
      await model.load()
    }
  }
}

import SwiftUI

struct ProfileListsView: View {
  let model: ProfileViewModel
  let isActive: Bool

  var body: some View {
    if model.isLoadingLists && model.lists.isEmpty {
      ProgressView("Loading lists")
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
    } else if let error = model.listsError, model.lists.isEmpty {
      ContentUnavailableView {
        Label("Couldn't load lists", systemImage: "rectangle.stack")
      } description: {
        Text(error)
      } actions: {
        Button("Try again") {
          Task { await model.retryLists() }
        }
        .buttonStyle(.borderedProminent)
      }
    } else if model.lists.isEmpty {
      ContentUnavailableView(
        "No lists yet",
        systemImage: "rectangle.stack",
        description: Text(model.profile?.isOwnProfile == true ? "Curate films into collections from the Lists section." : "No public lists have been shared.")
      )
    } else {
      LazyVStack(spacing: 0) {
        ForEach(model.lists) { list in
          ProfileListRow(list: list)
          Divider().padding(.leading, 110)
        }

        if model.canLoadMoreLists || model.isLoadingMoreLists {
          ProgressView()
            .frame(maxWidth: .infinity)
            .padding()
            .task(id: isActive ? model.lists.count : -1) {
              guard isActive else { return }
              await model.loadMoreLists()
            }
        }
      }
    }
  }
}

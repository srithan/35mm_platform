import SwiftUI

struct BookmarkFolderEditorSheet: View {
  @Environment(\.dismiss) private var dismiss
  @FocusState private var isNameFocused: Bool
  @State private var name: String
  @State private var isSaving = false
  @State private var errorMessage: String?

  let mode: BookmarkFolderEditorMode
  let onSave: @MainActor (String) async -> String?

  init(
    mode: BookmarkFolderEditorMode,
    onSave: @escaping @MainActor (String) async -> String?
  ) {
    self.mode = mode
    self.onSave = onSave
    switch mode {
    case .create:
      _name = State(initialValue: "")
    case .rename(let value):
      _name = State(initialValue: value)
    }
  }

  var body: some View {
    NavigationStack {
      Form {
        Section("Name") {
          TextField("Folder name", text: $name)
            .focused($isNameFocused)
            .submitLabel(.done)
            .onSubmit(save)
            .onChange(of: name) { _, newValue in
              enforceNameLimit(newValue)
            }

          Text("\(name.count) of \(BookmarksViewModel.folderNameLimit) characters")
            .font(.footnote)
            .foregroundStyle(.secondary)
        }

        if let errorMessage {
          Section {
            Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
              .font(.footnote)
              .foregroundStyle(.red)
          }
        }
      }
      .navigationTitle(title)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel", action: dismiss.callAsFunction)
            .disabled(isSaving)
        }

        ToolbarItem(placement: .confirmationAction) {
          Button(action: save) {
            if isSaving {
              ProgressView()
                .accessibilityLabel("Saving folder")
            } else {
              Text("Save")
                .bold()
            }
          }
          .disabled(!canSave)
        }
      }
    }
    .interactiveDismissDisabled(isSaving)
    .task {
      isNameFocused = true
    }
  }

  private var title: String {
    switch mode {
    case .create:
      "New folder"
    case .rename:
      "Rename folder"
    }
  }

  private var trimmedName: String {
    name.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private var canSave: Bool {
    !trimmedName.isEmpty && !isSaving
  }

  private func enforceNameLimit(_ value: String) {
    guard value.count > BookmarksViewModel.folderNameLimit else { return }
    name = String(value.prefix(BookmarksViewModel.folderNameLimit))
  }

  private func save() {
    guard canSave else { return }
    isSaving = true
    errorMessage = nil

    Task {
      let failure = await onSave(trimmedName)
      isSaving = false
      if let failure {
        errorMessage = failure
      } else {
        dismiss()
      }
    }
  }
}

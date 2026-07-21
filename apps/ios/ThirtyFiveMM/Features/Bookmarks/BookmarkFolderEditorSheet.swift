import SwiftUI

struct BookmarkFolderEditorSheet: View {
  @Environment(\.theme) private var theme
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
    VStack(spacing: 0) {
      HStack(spacing: 12) {
        Button("Cancel", action: dismiss.callAsFunction)
          .buttonStyle(.plain)
          .disabled(isSaving)

        Spacer(minLength: 0)

        Text(title)
          .font(.headline)

        Spacer(minLength: 0)

        Button(action: save) {
          if isSaving {
            ProgressView()
              .controlSize(.small)
              .accessibilityLabel("Saving folder")
          } else {
            Text("Save")
              .bold()
          }
        }
        .buttonStyle(.plain)
        .foregroundStyle(.tint)
        .disabled(!canSave)
      }
      .padding(.horizontal, 16)
      .frame(minHeight: 54)

      Divider()

      VStack(alignment: .leading, spacing: 10) {
        Text("Name")
          .font(.caption.weight(.semibold))
          .foregroundStyle(theme.textSecondary)
          .textCase(.uppercase)

        TextField("Folder name", text: $name)
          .focused($isNameFocused)
          .submitLabel(.done)
          .onSubmit(save)
          .onChange(of: name) { _, newValue in
            enforceNameLimit(newValue)
          }
          .padding(.horizontal, 14)
          .frame(minHeight: 48)
          .background(
            Color(uiColor: .secondarySystemGroupedBackground),
            in: .rect(cornerRadius: 12)
          )

        Text("\(name.count) of \(BookmarksViewModel.folderNameLimit) characters")
          .font(.footnote)
          .foregroundStyle(theme.textSecondary)

        if let errorMessage {
          Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
            .font(.footnote)
            .foregroundStyle(.red)
        }

      }
      .padding(16)
    }
    .background(Color(uiColor: .systemGroupedBackground).ignoresSafeArea())
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

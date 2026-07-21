import PhotosUI
import SwiftUI
import UniformTypeIdentifiers

struct EditProfileView: View {
  @Environment(\.theme) private var theme
  @Environment(\.dismiss) private var dismiss
  @State private var model: EditProfileViewModel
  @State private var isShowingDiscardConfirmation = false
  @State private var isShowingAvatarActions = false
  @State private var isShowingCoverActions = false
  @State private var isShowingAvatarPicker = false
  @State private var isShowingCoverPicker = false
  @State private var avatarSelection: PhotosPickerItem?
  @State private var coverSelection: PhotosPickerItem?
  @State private var includesBirthday: Bool
  @State private var birthday: Date
  @FocusState private var focusedField: ProfileEditField?

  private let onUpdated: (PublicProfile) -> Void

  init(
    profile: PublicProfile,
    service: any ProfileServicing,
    onUpdated: @escaping (PublicProfile) -> Void
  ) {
    let model = EditProfileViewModel(profile: profile, service: service)
    _model = State(initialValue: model)
    let existingBirthday = model.draft.dateOfBirth
    _includesBirthday = State(initialValue: existingBirthday != nil)
    _birthday = State(
      initialValue: existingBirthday
        ?? Calendar.current.date(byAdding: .year, value: -18, to: .now)
        ?? .now
    )
    self.onUpdated = onUpdated
  }

  var body: some View {
    NavigationStack {
      Form {
        EditProfileMediaHeader(
          profile: model.profile,
          uploadingKind: model.uploadingKind,
          uploadProgress: model.uploadProgress,
          onAvatarActions: showAvatarActions,
          onCoverActions: showCoverActions
        )
        .listRowInsets(EdgeInsets())
        .listRowBackground(Color.clear)

        Section("Basics") {
          VStack(alignment: .leading, spacing: 6) {
            TextField("Display name", text: $model.draft.displayName)
              .textContentType(.name)
              .focused($focusedField, equals: .displayName)
              .accessibilityIdentifier("edit-profile.display-name")
            ProfileEditErrorText(message: model.draft.errors[.displayName])
          }

          LabeledContent("Username") {
            Text("@\(model.profile.username)")
              .foregroundStyle(theme.textSecondary)
          }

          Toggle("Add date of birth", isOn: $includesBirthday)
            .onChange(of: includesBirthday) { _, includesBirthday in
              model.draft.dateOfBirth = includesBirthday ? birthday : nil
            }

          if includesBirthday {
            VStack(alignment: .leading, spacing: 6) {
              DatePicker(
                "Date of birth",
                selection: $birthday,
                in: ...Date.now,
                displayedComponents: .date
              )
              .onChange(of: birthday) { _, birthday in
                model.draft.dateOfBirth = birthday
              }
              ProfileEditErrorText(message: model.draft.errors[.dateOfBirth])
            }
          }
        }

        Section {
          ForEach(ProfileRole.allCases) { role in
            ProfileRoleOptionRow(role: role, isSelected: model.draft.role == role) {
              model.draft.role = role
              if role == .cinephile {
                model.draft.roleContext = ""
              }
            }
          }

          if model.draft.role != .cinephile {
            VStack(alignment: .leading, spacing: 6) {
              TextField("Executive Producer, NYU…", text: $model.draft.roleContext)
                .focused($focusedField, equals: .roleContext)
              characterCount(model.draft.roleContext.count, limit: ProfileEditDraft.roleContextLimit)
              ProfileEditErrorText(message: model.draft.errors[.roleContext])
            }
          }

          LabeledContent("Your byline") {
            Text(model.draft.bylinePreview)
              .font(.subheadline)
              .bold()
              .foregroundStyle(ProfileDesign.accent)
              .multilineTextAlignment(.trailing)
          }
        } header: {
          Text("Profile label")
        } footer: {
          Text("Choose the label people see under your name and on posts.")
        }

        Section("About") {
          VStack(alignment: .leading, spacing: 6) {
            TextField("Films, directors, hot takes…", text: $model.draft.bio, axis: .vertical)
              .lineLimit(3...6)
              .focused($focusedField, equals: .bio)
              .accessibilityIdentifier("edit-profile.bio")
            characterCount(model.draft.bio.count, limit: ProfileEditDraft.bioLimit)
            ProfileEditErrorText(message: model.draft.errors[.bio])
          }
        }

        Section("Links & location") {
          VStack(alignment: .leading, spacing: 6) {
            TextField("Location", text: $model.draft.location)
              .textContentType(.addressCity)
              .focused($focusedField, equals: .location)
            ProfileEditErrorText(message: model.draft.errors[.location])
          }

          VStack(alignment: .leading, spacing: 6) {
            TextField("your-site.com", text: $model.draft.website)
              .textContentType(.URL)
              .keyboardType(.URL)
              .textInputAutocapitalization(.never)
              .autocorrectionDisabled()
              .focused($focusedField, equals: .website)
              .accessibilityIdentifier("edit-profile.website")
            Text("https:// is added when omitted.")
              .font(.caption)
              .foregroundStyle(theme.textSecondary)
            ProfileEditErrorText(message: model.draft.errors[.website])
          }
        }

        if let error = model.error {
          Section {
            Label(error, systemImage: "exclamationmark.triangle.fill")
              .foregroundStyle(ProfileDesign.accent)
              .accessibilityLabel("Save failed: \(error)")
          }
        }
      }
      .navigationTitle("Edit profile")
      .navigationBarTitleDisplayMode(.inline)
      .scrollDismissesKeyboard(.interactively)
      .interactiveDismissDisabled(model.isDirty || model.isSaving)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("Cancel", action: requestDismiss)
            .disabled(model.isSaving)
        }
        ToolbarItem(placement: .topBarTrailing) {
          Button(action: save) {
            if model.isSaving {
              ProgressView().controlSize(.small)
            } else {
              Text("Save").bold()
            }
          }
          .disabled(!model.canSave)
          .accessibilityIdentifier("edit-profile.save")
        }
      }
      .confirmationDialog("Profile photo", isPresented: $isShowingAvatarActions) {
        Button("Choose from library", systemImage: "photo.on.rectangle") {
          isShowingAvatarPicker = true
        }
        if model.profile.avatarUrl != nil || model.profile.avatarUrlLg != nil {
          Button("Remove photo", systemImage: "trash", role: .destructive) {
            removeMedia(.avatar)
          }
        }
      }
      .confirmationDialog("Cover photo", isPresented: $isShowingCoverActions) {
        Button("Choose from library", systemImage: "photo.on.rectangle") {
          isShowingCoverPicker = true
        }
        if model.profile.coverUrl != nil {
          Button("Remove cover", systemImage: "trash", role: .destructive) {
            removeMedia(.cover)
          }
        }
      }
      .confirmationDialog("Discard changes?", isPresented: $isShowingDiscardConfirmation) {
        Button("Discard", role: .destructive, action: dismiss.callAsFunction)
        Button("Keep editing", role: .cancel) {}
      } message: {
        Text("Unsaved profile changes will be lost.")
      }
      .photosPicker(isPresented: $isShowingAvatarPicker, selection: $avatarSelection, matching: .images)
      .photosPicker(isPresented: $isShowingCoverPicker, selection: $coverSelection, matching: .images)
      .onChange(of: avatarSelection) { _, item in
        uploadSelection(item, kind: .avatar)
      }
      .onChange(of: coverSelection) { _, item in
        uploadSelection(item, kind: .cover)
      }
    }
  }

  private func characterCount(_ count: Int, limit: Int) -> some View {
    Text("\(count)/\(limit)")
      .font(.caption)
      .monospacedDigit()
      .foregroundStyle(count > limit ? ProfileDesign.accent : Color.secondary)
      .frame(maxWidth: .infinity, alignment: .trailing)
      .accessibilityLabel("\(count) of \(limit) characters")
  }

  private func showAvatarActions() {
    focusedField = nil
    isShowingAvatarActions = true
  }

  private func showCoverActions() {
    focusedField = nil
    isShowingCoverActions = true
  }

  private func requestDismiss() {
    focusedField = nil
    if model.isDirty {
      isShowingDiscardConfirmation = true
    } else {
      dismiss()
    }
  }

  private func save() {
    focusedField = nil
    Task {
      if let updated = await model.save() {
        onUpdated(updated)
        dismiss()
      }
    }
  }

  private func removeMedia(_ kind: ProfileMutation.MediaKind) {
    Task {
      if let updated = await model.removeMedia(kind) {
        onUpdated(updated)
      }
    }
  }

  private func uploadSelection(_ item: PhotosPickerItem?, kind: ProfileMutation.MediaKind) {
    guard let item else { return }
    Task {
      defer {
        if kind == .avatar {
          avatarSelection = nil
        } else {
          coverSelection = nil
        }
      }

      do {
        guard let data = try await item.loadTransferable(type: Data.self) else {
          model.showError("Selected image could not be read.")
          return
        }
        let contentType = item.supportedContentTypes
          .first(where: { $0.conforms(to: .image) })?
          .preferredMIMEType ?? "image/jpeg"
        if let updated = await model.uploadMedia(data: data, contentType: contentType, kind: kind) {
          onUpdated(updated)
        }
      } catch {
        model.showError(error.localizedDescription)
      }
    }
  }
}

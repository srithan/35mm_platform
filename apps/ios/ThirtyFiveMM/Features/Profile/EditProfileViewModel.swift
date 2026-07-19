import Foundation
import Observation

@MainActor
@Observable
final class EditProfileViewModel {
  private(set) var profile: PublicProfile
  var draft: ProfileEditDraft
  private(set) var isSaving = false
  private(set) var uploadingKind: ProfileMutation.MediaKind?
  private(set) var uploadProgress = 0.0
  private(set) var error: String?

  private let service: any ProfileServicing
  private var originalDraft: ProfileEditDraft

  init(profile: PublicProfile, service: any ProfileServicing) {
    self.profile = profile
    self.service = service
    let draft = ProfileEditDraft(profile: profile)
    self.draft = draft
    originalDraft = draft
  }

  var isDirty: Bool { draft != originalDraft }
  var canSave: Bool { isDirty && draft.isValid && !isSaving && uploadingKind == nil }

  func save() async -> PublicProfile? {
    guard canSave else { return nil }
    isSaving = true
    error = nil
    defer { isSaving = false }

    do {
      let patch = try await service.updateProfile(draft.updateRequest())
      let updated = profile.applying(patch)
      profile = updated
      draft = ProfileEditDraft(profile: updated)
      originalDraft = draft
      return updated
    } catch {
      self.error = error.localizedDescription
      return nil
    }
  }

  func uploadMedia(
    data: Data,
    contentType: String,
    kind: ProfileMutation.MediaKind
  ) async -> PublicProfile? {
    guard uploadingKind == nil, !isSaving else { return nil }
    uploadingKind = kind
    uploadProgress = 0
    error = nil
    defer {
      uploadingKind = nil
      uploadProgress = 0
    }

    do {
      let publicURL = try await service.uploadProfileMedia(
        data: data,
        contentType: contentType,
        kind: kind
      ) { [weak self] progress in
        self?.uploadProgress = progress
      }
      var request = ProfileMutation.UpdateRequest()
      switch kind {
      case .avatar:
        request.avatarUrl = publicURL
      case .cover:
        request.coverUrl = publicURL
      }
      let patch = try await service.updateProfile(request)
      let updated = profile.applying(patch)
      profile = updated
      return updated
    } catch {
      self.error = error.localizedDescription
      return nil
    }
  }

  func removeMedia(_ kind: ProfileMutation.MediaKind) async -> PublicProfile? {
    guard uploadingKind == nil, !isSaving else { return nil }
    uploadingKind = kind
    error = nil
    defer { uploadingKind = nil }

    do {
      var request = ProfileMutation.UpdateRequest()
      switch kind {
      case .avatar:
        request.shouldClearAvatar = true
      case .cover:
        request.shouldClearCover = true
      }
      let patch = try await service.updateProfile(request)
      let updated = profile.applying(patch)
      profile = updated
      return updated
    } catch {
      self.error = error.localizedDescription
      return nil
    }
  }

  func clearError() {
    error = nil
  }

  func showError(_ message: String) {
    error = message
  }
}

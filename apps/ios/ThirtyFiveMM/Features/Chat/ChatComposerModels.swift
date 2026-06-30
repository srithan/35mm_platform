import Foundation
import UIKit

enum ChatLocalMessageState: Hashable {
  case sending
  case failed(String)
}

enum ChatComposerMode: Equatable {
  case composing
  case editing(ChatMessage)
}

enum ChatStagedAttachmentKind: Hashable {
  case image
  case file
}

struct ChatStagedAttachment: Identifiable {
  let id = UUID()
  let kind: ChatStagedAttachmentKind
  let data: Data
  let filename: String?
  let contentType: String
  let byteCount: Int
  let imageSize: CGSize?
  let previewImage: UIImage?

  var contentTypeForMessage: ChatMessageContentType {
    switch kind {
    case .image:
      return .image
    case .file:
      return .file
    }
  }

  var exceedsImageLimit: Bool {
    kind == .image && byteCount > 12 * 1024 * 1024
  }
}

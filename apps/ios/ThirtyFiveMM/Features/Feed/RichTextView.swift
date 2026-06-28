import SwiftUI

struct RichTextView: View {
  private let textBody: String?
  var font: Font = .body

  init(body: String?, font: Font = .body) {
    textBody = body
    self.font = font
  }

  var body: some View {
    if let attributedString = RichTextParser.parse(textBody) {
      Text(attributedString)
        .font(font)
        .environment(
          \.openURL,
          OpenURLAction { url in
            if url.scheme == "mention" {
              // TODO: Navigate to mentioned profile in Profile stage.
              return .handled
            }

            return .systemAction
          }
        )
    } else {
      Text(textBody ?? "")
        .font(font)
    }
  }
}

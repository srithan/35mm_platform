import SwiftUI

struct RichTextView: View {
  @Environment(\.theme) private var theme

  private let textBody: String?
  private let suppressedURL: String?
  var font: Font = .body

  init(body: String?, font: Font = .body, suppressingURL: String? = nil) {
    textBody = body
    suppressedURL = suppressingURL
    self.font = font
  }

  var body: some View {
    if let attributedString = RichTextParser.parse(textBody, suppressingURL: suppressedURL) {
      Text(attributedString)
        .font(font)
        .foregroundStyle(theme.text)
        .tint(theme.socialAccent)
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
        .foregroundStyle(theme.text)
    }
  }
}

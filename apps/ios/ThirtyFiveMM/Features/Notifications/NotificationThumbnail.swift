import Kingfisher
import SwiftUI

struct NotificationThumbnail: View {
  @Environment(\.theme) private var theme
  let url: String

  var body: some View {
    KFImage(URL(string: url))
      .placeholder {
        RoundedRectangle(cornerRadius: 6)
          .fill(theme.fillStrong)
          .overlay {
            Image(systemName: "film")
              .font(.footnote)
              .foregroundStyle(theme.textTertiary)
          }
      }
      .fade(duration: 0.15)
      .cancelOnDisappear(true)
      .resizable()
      .scaledToFill()
      .frame(width: 44, height: 60)
      .clipShape(.rect(cornerRadius: 6))
      .overlay {
        RoundedRectangle(cornerRadius: 6)
          .stroke(theme.borderStrong, lineWidth: 0.5)
      }
  }
}

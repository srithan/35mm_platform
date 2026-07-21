import Kingfisher
import SwiftUI

struct ProfileAvatarView: View {
  @Environment(\.theme) private var theme
  let url: String?
  let displayName: String
  let size: Double

  var body: some View {
    KFImage(URL(string: url ?? ""))
      .placeholder {
        ZStack {
          Circle().fill(theme.bgSunken)
          Text(initials)
            .font(.title2)
            .bold()
            .foregroundStyle(theme.textSecondary)
        }
      }
      .resizable()
      .scaledToFill()
      .frame(width: size, height: size)
      .clipShape(.circle)
      .overlay {
        Circle().stroke(theme.bg, lineWidth: 4)
      }
      .accessibilityLabel("\(displayName)'s profile photo")
  }

  private var initials: String {
    let words = displayName.split(separator: " ").prefix(2)
    let value = words.compactMap(\.first).map(String.init).joined()
    return value.isEmpty ? "35" : value.uppercased()
  }
}

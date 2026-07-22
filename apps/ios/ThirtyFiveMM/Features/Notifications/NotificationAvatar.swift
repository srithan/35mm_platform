import Kingfisher
import SwiftUI

struct NotificationAvatar: View {
  @Environment(\.theme) private var theme
  let id: String
  let label: String
  let url: String?
  let size: Double

  var body: some View {
    KFImage(url.flatMap(URL.init(string:)))
      .placeholder {
        Circle()
          .fill(avatarColor)
          .overlay {
            Text(initial)
              .font(.system(size: size * 0.38, weight: .semibold, design: .rounded))
              .foregroundStyle(.white)
          }
      }
      .fade(duration: 0.15)
      .cancelOnDisappear(true)
      .resizable()
      .scaledToFill()
      .frame(width: size, height: size)
      .clipShape(Circle())
      .overlay {
        Circle().stroke(theme.bg, lineWidth: 2)
      }
  }

  private var initial: String {
    label.trimmingCharacters(in: .whitespacesAndNewlines).first.map(String.init)?.uppercased() ?? "3"
  }

  private var avatarColor: Color {
    let palette: [Color] = [.black, .blue, .purple, .indigo, .pink, .teal, .orange]
    let value = id.unicodeScalars.reduce(UInt(0)) { ($0 &* 31) &+ UInt($1.value) }
    return palette[Int(value % UInt(palette.count))]
  }
}

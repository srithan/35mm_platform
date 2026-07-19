import Kingfisher
import SwiftUI

struct ProfileAvatarView: View {
  let url: String?
  let displayName: String
  let size: Double

  var body: some View {
    KFImage(URL(string: url ?? ""))
      .placeholder {
        ZStack {
          Circle().fill(Color(.secondarySystemBackground))
          Text(initials)
            .font(.title2)
            .bold()
            .foregroundStyle(.secondary)
        }
      }
      .resizable()
      .scaledToFill()
      .frame(width: size, height: size)
      .clipShape(.circle)
      .overlay {
        Circle().stroke(Color(.systemBackground), lineWidth: 4)
      }
      .accessibilityLabel("\(displayName)'s profile photo")
  }

  private var initials: String {
    let words = displayName.split(separator: " ").prefix(2)
    let value = words.compactMap(\.first).map(String.init).joined()
    return value.isEmpty ? "35" : value.uppercased()
  }
}

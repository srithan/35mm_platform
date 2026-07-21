import Kingfisher
import SwiftUI

struct VideoURLPreview: View {
  @Environment(\.openURL) private var openURL

  let preview: URLVideoPreview

  var body: some View {
    Button {
      openURL(preview.url)
    } label: {
      Color.black
        .aspectRatio(16 / 9, contentMode: .fit)
        .overlay {
          KFImage(preview.thumbnailURL)
            .placeholder {
              Color.black
            }
            .resizable()
            .fade(duration: 0.18)
            .scaledToFill()
        }
        .overlay {
          LinearGradient(
            colors: [.clear, .black.opacity(0.15), .black.opacity(0.65)],
            startPoint: .top,
            endPoint: .bottom
          )
        }
        .overlay {
          Circle()
            .fill(.white)
            .frame(width: 56, height: 56)
            .shadow(color: .black.opacity(0.36), radius: 14, y: 8)
            .overlay {
              Image(systemName: "play.fill")
                .font(.title2)
                .foregroundStyle(.black)
                .offset(x: 2)
            }
        }
        .overlay(alignment: .topTrailing) {
          Text(preview.provider.label.uppercased())
            .font(.caption2.weight(.medium))
            .tracking(1.2)
            .foregroundStyle(.white.opacity(0.78))
            .padding(9)
        }
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay {
          RoundedRectangle(cornerRadius: 8)
            .stroke(Color(.separator), lineWidth: 0.5)
        }
        .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .accessibilityLabel("Open \(preview.provider.label) video")
    .accessibilityHint("Opens video in your browser")
  }
}

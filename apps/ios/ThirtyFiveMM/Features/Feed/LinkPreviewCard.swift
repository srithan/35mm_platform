import Kingfisher
import SwiftUI

struct LinkPreviewCard: View {
  @Environment(\.theme) private var theme
  @Environment(\.openURL) private var openURL

  let preview: LinkPreview

  private var domain: String {
    guard let host = URL(string: preview.url)?.host() else { return preview.url }
    return host.hasPrefix("www.") ? String(host.dropFirst(4)) : host
  }

  private var title: String {
    let value = preview.title?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    return value.isEmpty ? domain : value
  }

  private var imageURL: URL? {
    preview.imageUrl.flatMap(URL.init(string:))
  }

  var body: some View {
    Button {
      guard let url = URL(string: preview.url) else { return }
      openURL(url)
    } label: {
      if let imageURL {
        imageCard(imageURL)
      } else {
        textCard
      }
    }
    .buttonStyle(.plain)
    .accessibilityLabel("\(title), \(domain)")
    .accessibilityHint("Opens link in your browser")
  }

  private func imageCard(_ imageURL: URL) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      theme.bgSunken
        .aspectRatio(1.91, contentMode: .fit)
        .overlay {
          KFImage(imageURL)
            .placeholder {
              theme.fill
            }
            .resizable()
            .fade(duration: 0.18)
            .scaledToFill()
            .accessibilityHidden(true)
        }
        .overlay {
          LinearGradient(
            stops: [
              .init(color: .clear, location: 0.38),
              .init(color: .black.opacity(0.12), location: 0.6),
              .init(color: .black.opacity(0.5), location: 0.84),
              .init(color: .black.opacity(0.82), location: 1),
            ],
            startPoint: .top,
            endPoint: .bottom
          )
        }
        .overlay(alignment: .bottomLeading) {
          Text(title)
            .font(.headline)
            .foregroundStyle(.white)
            .lineLimit(2)
            .multilineTextAlignment(.leading)
            .shadow(color: .black.opacity(0.45), radius: 5, y: 1)
            .padding(14)
        }
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay {
          RoundedRectangle(cornerRadius: 12)
            .stroke(theme.border, lineWidth: 0.5)
        }
        .shadow(color: .black.opacity(0.08), radius: 2, y: 1)

      Text(domain)
        .font(.footnote)
        .foregroundStyle(theme.textSecondary)
        .lineLimit(1)
        .padding(.horizontal, 2)
    }
    .contentShape(Rectangle())
  }

  private var textCard: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(domain.uppercased())
        .font(.caption.weight(.medium))
        .tracking(0.7)
        .foregroundStyle(theme.textSecondary)
        .lineLimit(1)

      Text(title)
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(theme.text)
        .lineLimit(2)
        .multilineTextAlignment(.leading)

      if let description = preview.description?.trimmingCharacters(in: .whitespacesAndNewlines),
        !description.isEmpty
      {
        Text(description)
          .font(.footnote)
          .foregroundStyle(theme.textSecondary)
          .lineLimit(2)
          .multilineTextAlignment(.leading)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 16)
    .padding(.vertical, 14)
    .background(theme.bgSunken)
    .clipShape(RoundedRectangle(cornerRadius: 12))
    .overlay {
      RoundedRectangle(cornerRadius: 12)
        .stroke(theme.border, lineWidth: 0.5)
    }
    .contentShape(Rectangle())
  }
}

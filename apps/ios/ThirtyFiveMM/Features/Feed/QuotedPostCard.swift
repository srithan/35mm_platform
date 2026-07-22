import Kingfisher
import SwiftUI

struct QuotedPostCard: View {
  @Environment(\.theme) private var theme
  let post: QuotedFeedPost?
  let unavailable: Bool
  var isCompact = false

  var body: some View {
    Group {
      if let post {
        NavigationLink(value: AppRoute.post(post.id)) {
          availableContent(post)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Quoted post by \(displayName(for: post))")
        .accessibilityHint("Opens quoted post")
      } else if unavailable {
        Label("This post is unavailable", systemImage: "lock.fill")
          .font(.subheadline)
          .foregroundStyle(theme.textSecondary)
          .frame(maxWidth: .infinity, minHeight: 96)
          .accessibilityLabel("Quoted post unavailable")
      }
    }
    .background(theme.bgSunken)
    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    .overlay {
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .stroke(theme.borderStrong, lineWidth: 1)
    }
    .padding(.top, 4)
  }

  private func availableContent(_ post: QuotedFeedPost) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 7) {
        KFImage(URL(string: post.author.avatarUrl ?? ""))
          .placeholder {
            Image(systemName: "person.circle.fill")
              .resizable()
              .foregroundStyle(theme.textSecondary)
          }
          .resizable()
          .scaledToFill()
          .frame(width: 26, height: 26)
          .clipShape(Circle())

        Text(displayName(for: post))
          .font(.caption.weight(.bold))
          .foregroundStyle(theme.text)
          .lineLimit(1)

        Text("@\(post.author.username)")
          .font(.caption)
          .foregroundStyle(theme.textSecondary)
          .lineLimit(1)

        Text("· \(post.createdAt.feedRelativeShort)")
          .font(.caption)
          .foregroundStyle(theme.textSecondary)
          .fixedSize(horizontal: true, vertical: false)
      }

      if let headline = post.headline, !headline.isEmpty {
        RichTextView(body: headline, font: .subheadline.weight(.bold))
          .lineLimit(2)
      }

      if let body = post.body, !body.isEmpty {
        RichTextView(
          body: body,
          font: .subheadline,
          suppressingURL: post.linkPreview?.presentation == .cardOnly
            ? post.linkPreview?.url
            : nil
        )
          .lineLimit(4)
      }

      if !isCompact, let poll = post.poll {
        VStack(alignment: .leading, spacing: 5) {
          ForEach(poll.options.prefix(4)) { option in
            Text(option.label ?? "Image option")
              .font(.caption)
              .foregroundStyle(theme.text)
              .lineLimit(1)
              .frame(maxWidth: .infinity, alignment: .leading)
              .padding(.horizontal, 10)
              .padding(.vertical, 6)
              .overlay {
                Capsule().stroke(theme.border, lineWidth: 0.5)
              }
          }

          Text("Poll")
            .font(.caption2)
            .foregroundStyle(theme.textSecondary)
        }
      }

      if !isCompact, let film = post.film {
        HStack(spacing: 9) {
          KFImage(URL(string: film.posterUrl ?? ""))
            .placeholder {
              Image(systemName: "film")
                .foregroundStyle(theme.textSecondary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(theme.fill)
            }
            .resizable()
            .scaledToFill()
            .frame(width: 34, height: 50)
            .clipShape(RoundedRectangle(cornerRadius: 3))

          VStack(alignment: .leading, spacing: 2) {
            Text(film.title)
              .font(.caption.weight(.semibold))
              .lineLimit(1)
            if let year = film.year {
              Text(String(year))
                .font(.caption2)
                .foregroundStyle(theme.textSecondary)
            }
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(8)
        .background(theme.fill, in: RoundedRectangle(cornerRadius: 8))
      }

      if !isCompact {
        let mediaItems = Array(PostMediaGridItem.imageItems(from: post.media).prefix(4))

        if !mediaItems.isEmpty {
          PostMediaGrid(items: mediaItems)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        } else if let preview = post.linkPreview {
          HStack(spacing: 10) {
            if let imageURL = preview.imageUrl {
              KFImage(URL(string: imageURL))
                .resizable()
                .scaledToFill()
                .frame(width: 64, height: 64)
                .clipped()
            }

            VStack(alignment: .leading, spacing: 3) {
              Text(URL(string: preview.url)?.host() ?? preview.url)
                .font(.caption2)
                .foregroundStyle(theme.textSecondary)
                .lineLimit(1)
              Text(preview.title ?? preview.url)
                .font(.caption.weight(.semibold))
                .foregroundStyle(theme.text)
                .lineLimit(2)
            }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          .clipShape(RoundedRectangle(cornerRadius: 8))
          .overlay {
            RoundedRectangle(cornerRadius: 8).stroke(theme.border, lineWidth: 0.5)
          }
        }
      }
    }
    .padding(12)
    .contentShape(Rectangle())
  }

  private func displayName(for post: QuotedFeedPost) -> String {
    let value = post.author.displayName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    return value.isEmpty ? post.author.username : value
  }
}

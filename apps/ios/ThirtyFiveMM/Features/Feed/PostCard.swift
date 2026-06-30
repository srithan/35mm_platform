import Kingfisher
import SwiftUI
import UIKit

struct PostCard: View {
  let post: FeedPost
  let interactor: any PostInteracting
  var onOpenPost: () -> Void = {}
  var onOpenImage: (PostImageDestination) -> Void = { _ in }

  @State private var isExpanded = false
  @State private var isShowingPostActions = false

  private var authorName: String {
    guard let displayName = post.author.displayName, !displayName.isEmpty else {
      return post.author.username
    }

    return displayName
  }

  private var timestamp: String {
    post.createdAt.relativeShort
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      if post.isRepost {
        repostHeader
      }

      HStack(alignment: .top, spacing: 12) {
        avatar

        VStack(alignment: .leading, spacing: 8) {
          authorRow
          filmBadge
          headline
          bodyText
          mediaGrid
          linkPreview
          pollView
          actionBar
        }
      }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 12)
    .background(Color(.systemBackground))
    .contentShape(Rectangle())
    .onTapGesture {
      onOpenPost()
    }
    .fullScreenCover(isPresented: $isShowingPostActions) {
      BottomActionSheet(
        title: "Post actions",
        sections: [
          BottomActionSheetSection(actions: [
            BottomActionSheetAction("Copy link", systemImage: "link") {
              UIPasteboard.general.string = "https://35mm.app/posts/\(post.id)"
            },
          ]),
          BottomActionSheetSection(actions: [
            BottomActionSheetAction("Save", systemImage: "bookmark") {
              Task { await interactor.toggleBookmark(postId: post.id) }
            },
            BottomActionSheetAction("Not interested", systemImage: "eye.slash") {
              // TODO: Wire hide post API when available.
            },
          ]),
          BottomActionSheetSection(actions: [
            BottomActionSheetAction("Mute", systemImage: "bell.slash") {
              // TODO: Wire mute author API when available.
            },
            BottomActionSheetAction("Restrict", systemImage: "person.crop.circle.badge.exclamationmark") {
              // TODO: Wire restrict author API when available.
            },
            BottomActionSheetAction("Community Notes", systemImage: "note.text") {
              // TODO: Add notes flow when available.
            },
            BottomActionSheetAction("Block", systemImage: "person.fill.xmark", role: .destructive) {
              // TODO: Wire block author API when available.
            },
            BottomActionSheetAction(
              "Report",
              systemImage: "exclamationmark.triangle",
              role: .destructive
            ) {
              // TODO: Open report flow when moderation API exists.
            },
          ]),
        ]
      )
    }
  }

  private var repostHeader: some View {
    Button {
      // TODO: Navigate to reposting profile in Profile stage.
    } label: {
      HStack(spacing: 6) {
        Image(systemName: "arrow.2.squarepath")
        Text("\(post.author.username) reposted")
      }
      .font(.caption)
      .foregroundStyle(.secondary)
    }
    .buttonStyle(.plain)
    .padding(.leading, 52)
  }

  private var avatar: some View {
    Button {
      // TODO: Navigate to author profile in Profile stage.
    } label: {
      KFImage(URL(string: post.author.avatarUrl ?? ""))
        .placeholder {
          Image(systemName: "person.circle.fill")
            .resizable()
            .foregroundStyle(.secondary)
        }
        .resizable()
        .scaledToFill()
        .frame(width: 40, height: 40)
        .clipShape(Circle())
        .background(Circle().fill(Color(.secondarySystemBackground)))
    }
    .buttonStyle(.plain)
  }

  private var authorRow: some View {
    HStack(alignment: .firstTextBaseline, spacing: 6) {
      Button {
        // TODO: Navigate to author profile in Profile stage.
      } label: {
        HStack(alignment: .firstTextBaseline, spacing: 4) {
          Text(authorName)
            .font(.body.weight(.semibold))
            .foregroundStyle(.primary)
            .lineLimit(1)

          Text("@\(post.author.username)")
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
      }
      .buttonStyle(.plain)

      Spacer(minLength: 8)

      HStack(spacing: 4) {
        if post.editedAt != nil {
          Text("edited")
        }

        Text(timestamp)
      }
      .font(.caption)
      .foregroundStyle(.secondary)

      Button {
        isShowingPostActions = true
      } label: {
        Image(systemName: "ellipsis")
          .font(.subheadline.weight(.semibold))
          .frame(width: 28, height: 28)
          .contentShape(Rectangle())
      }
      .buttonStyle(.plain)
      .foregroundStyle(.secondary)
      .accessibilityLabel("More post actions")
    }
  }

  @ViewBuilder
  private var filmBadge: some View {
    if let film = post.film {
      HStack(spacing: 6) {
        Image(systemName: "film")
          .font(.caption)

        Text(filmTitle(film))
          .font(.caption.weight(.medium))
          .lineLimit(1)

        if shouldShowRating, let starRating = post.starRating {
          StarRatingView(rating: starRating)
        }
      }
      .foregroundStyle(.primary)
      .padding(.horizontal, 10)
      .padding(.vertical, 6)
      .background(Color(.secondarySystemBackground), in: Capsule())
    }
  }

  @ViewBuilder
  private var headline: some View {
    if let headline = post.headline, !headline.isEmpty {
      Text(headline)
        .font(.headline)
        .foregroundStyle(.primary)
        .fixedSize(horizontal: false, vertical: true)
    }
  }

  @ViewBuilder
  private var bodyText: some View {
    if let body = post.body, !body.isEmpty {
      VStack(alignment: .leading, spacing: 4) {
        RichTextView(body: body, font: .body)
          .lineLimit(isExpanded || !shouldShowMore(for: body) ? nil : 6)
          .fixedSize(horizontal: false, vertical: true)

        if shouldShowMore(for: body) && !isExpanded {
          Button("more") {
            isExpanded = true
          }
          .font(.body.weight(.medium))
          .buttonStyle(.plain)
          .foregroundStyle(.blue)
        }
      }
    }
  }

  @ViewBuilder
  private var mediaGrid: some View {
    let items = Array(mediaItems.prefix(4))
    if !items.isEmpty {
      MediaGrid(items: items, postId: post.id) { url in
        onOpenImage(PostImageDestination(url: url, postId: post.id))
      }
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .padding(.top, 2)
    }
  }

  @ViewBuilder
  private var linkPreview: some View {
    if let preview = post.linkPreview, mediaItems.isEmpty {
      LinkPreviewCard(preview: preview)
    }
  }

  @ViewBuilder
  private var pollView: some View {
    if let poll = post.poll {
      PollView(poll: poll)
    }
  }

  private var actionBar: some View {
    HStack {
      ActionButton(
        systemImage: post.isLiked ? "heart.fill" : "heart",
        count: post.likeCount,
        isActive: post.isLiked
      ) {
        Task { await interactor.toggleLike(postId: post.id) }
      }

      ActionButton(systemImage: "bubble.left", count: post.commentCount, isActive: false) {
        // TODO: Open post detail/comments in Stage 3.
      }

      ActionButton(
        systemImage: "arrow.triangle.2.circlepath",
        count: post.repostCount,
        isActive: post.isReposted
      ) {
        Task { await interactor.toggleRepost(postId: post.id) }
      }

      ActionButton(
        systemImage: post.isBookmarked ? "bookmark.fill" : "bookmark",
        count: post.bookmarkCount,
        isActive: post.isBookmarked
      ) {
        Task { await interactor.toggleBookmark(postId: post.id) }
      }
    }
    .padding(.top, 2)
  }

  private var shouldShowRating: Bool {
    (post.type == .log || post.type == .review) && post.starRating != nil
  }

  private var mediaItems: [MediaGridItemData] {
    if let media = post.media, !media.isEmpty {
      return
        media
        .filter { $0.type == nil || $0.type == "image" }
        .map {
          MediaGridItemData(url: $0.url, width: $0.width, height: $0.height)
        }
        .filter { !$0.url.isEmpty }
    }

    return (post.mediaUrls ?? []).map {
      MediaGridItemData(url: $0, width: nil, height: nil)
    }
  }

  private func filmTitle(_ film: FilmRef) -> String {
    if let year = film.year {
      return "\(film.title) (\(year))"
    }

    return film.title
  }

  private func shouldShowMore(for body: String) -> Bool {
    let plain =
      body.hasPrefix(RichTextParser.sentinel)
      ? String(body.dropFirst(RichTextParser.sentinel.count))
      : body

    return plain.count > 320 || plain.filter(\.isNewline).count > 5
  }
}

private struct ActionButton: View {
  let systemImage: String
  let count: Int
  let isActive: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 5) {
        Image(systemName: systemImage)
          .font(.system(size: 16, weight: .semibold))
          .symbolRenderingMode(.hierarchical)
          .frame(width: 20)

        Text(count.compactFormatted)
          .font(.caption)
          .monospacedDigit()
      }
      .foregroundStyle(isActive ? Color.accentColor : Color.secondary)
      .frame(maxWidth: .infinity, alignment: .leading)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
  }
}

private struct StarRatingView: View {
  let rating: Double

  var body: some View {
    HStack(spacing: 1) {
      ForEach(0..<5, id: \.self) { index in
        Image(systemName: symbol(for: index))
          .font(.caption2)
          .foregroundStyle(.yellow)
      }
    }
    .accessibilityLabel("\(rating, specifier: "%.1f") stars")
  }

  private func symbol(for index: Int) -> String {
    let threshold = Double(index) + 1
    if rating >= threshold {
      return "star.fill"
    }

    if rating >= threshold - 0.5 {
      return "star.leadinghalf.filled"
    }

    return "star"
  }
}

private struct MediaGridItemData: Hashable {
  let url: String
  let width: Int?
  let height: Int?

  var aspectRatio: CGFloat? {
    guard let width, let height, width > 0, height > 0 else { return nil }
    return CGFloat(width) / CGFloat(height)
  }
}

private struct MediaGrid: View {
  let items: [MediaGridItemData]
  let postId: String
  let onSelectImage: (String) -> Void

  var body: some View {
    GeometryReader { proxy in
      let width = proxy.size.width
      grid(width: width)
    }
    .aspectRatio(containerAspectRatio, contentMode: .fit)
    .frame(maxWidth: .infinity)
  }

  private var containerAspectRatio: CGFloat {
    switch items.count {
    case 1:
      return min(max(items[0].aspectRatio ?? 4.0 / 3.0, 0.72), 1.8)
    case 2:
      return 2.0
    case 3:
      return 0.8
    default:
      return 1.0
    }
  }

  @ViewBuilder
  private func grid(width: CGFloat) -> some View {
    let spacing: CGFloat = 2
    let halfWidth = (width - spacing) / 2

    switch items.count {
    case 1:
      mediaImage(items[0].url, width: width, height: width / containerAspectRatio)
    case 2:
      HStack(spacing: spacing) {
        ForEach(items, id: \.self) { item in
          mediaImage(item.url, width: halfWidth, height: halfWidth)
        }
      }
    case 3:
      VStack(spacing: spacing) {
        mediaImage(items[0].url, width: width, height: width * 0.75)

        HStack(spacing: spacing) {
          mediaImage(items[1].url, width: halfWidth, height: halfWidth)
          mediaImage(items[2].url, width: halfWidth, height: halfWidth)
        }
      }
    default:
      VStack(spacing: spacing) {
        HStack(spacing: spacing) {
          mediaImage(items[0].url, width: halfWidth, height: halfWidth)
          mediaImage(items[1].url, width: halfWidth, height: halfWidth)
        }

        HStack(spacing: spacing) {
          mediaImage(items[2].url, width: halfWidth, height: halfWidth)
          mediaImage(items[3].url, width: halfWidth, height: halfWidth)
        }
      }
    }
  }

  private func mediaImage(_ url: String, width: CGFloat, height: CGFloat) -> some View {
    Button {
      onSelectImage(url)
    } label: {
      KFImage(URL(string: url))
        .placeholder {
          // TODO: Replace with blurhash placeholder when API returns blurhash.
          Rectangle()
            .fill(Color(.tertiarySystemFill))
        }
        .resizable()
        .scaledToFill()
        .frame(width: width, height: height)
        .clipped()
    }
    .buttonStyle(.plain)
  }
}

private struct LinkPreviewCard: View {
  let preview: LinkPreview

  private var domain: String {
    URL(string: preview.url)?.host()?.replacingOccurrences(of: "www.", with: "") ?? preview.url
  }

  var body: some View {
    Button {
      if let url = URL(string: preview.url) {
        UIApplication.shared.open(url)
      }
    } label: {
      HStack(spacing: 10) {
        if let imageUrl = preview.imageUrl {
          KFImage(URL(string: imageUrl))
            .placeholder {
              Rectangle()
                .fill(Color(.tertiarySystemFill))
            }
            .resizable()
            .scaledToFill()
            .frame(width: 88, height: 88)
            .clipped()
        }

        VStack(alignment: .leading, spacing: 4) {
          Text(domain)
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(1)

          if let title = preview.title {
            Text(title)
              .font(.subheadline.weight(.semibold))
              .foregroundStyle(.primary)
              .lineLimit(2)
          }

          if let description = preview.description {
            Text(description)
              .font(.caption)
              .foregroundStyle(.secondary)
              .lineLimit(2)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .background(Color(.secondarySystemBackground))
      .clipShape(RoundedRectangle(cornerRadius: 8))
    }
    .buttonStyle(.plain)
  }
}

private struct PollView: View {
  let poll: Poll

  private var hasVoted: Bool {
    poll.userVotedOptionId != nil
  }

  private var isOpen: Bool {
    guard let endsAt = poll.endsAt else { return true }
    return endsAt > Date()
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      ForEach(poll.options) { option in
        Button {
          if !hasVoted && isOpen {
            // TODO: Submit poll vote in Stage 3.
          }
        } label: {
          pollOption(option)
        }
        .buttonStyle(.plain)
        .disabled(hasVoted || !isOpen)
      }

      Text("\(poll.totalVotes.compactFormatted) votes")
        .font(.caption)
        .foregroundStyle(.secondary)
    }
  }

  private func pollOption(_ option: PollOption) -> some View {
    let percentage = poll.totalVotes == 0 ? 0 : Double(option.voteCount) / Double(poll.totalVotes)

    return ZStack(alignment: .leading) {
      RoundedRectangle(cornerRadius: 8)
        .fill(Color(.secondarySystemBackground))

      if hasVoted {
        GeometryReader { proxy in
          RoundedRectangle(cornerRadius: 8)
            .fill(Color.accentColor.opacity(0.18))
            .frame(width: proxy.size.width * percentage)
        }
      }

      HStack {
        Text(option.label)
          .font(.subheadline.weight(.medium))
          .foregroundStyle(.primary)
          .lineLimit(2)

        Spacer()

        if hasVoted {
          Text("\(Int((percentage * 100).rounded()))%")
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
            .monospacedDigit()
        }
      }
      .padding(.horizontal, 12)
      .padding(.vertical, 10)
    }
    .frame(minHeight: 42)
  }
}

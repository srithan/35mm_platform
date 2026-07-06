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

        VStack(alignment: .leading, spacing: 6) {
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
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.primary)
            .lineLimit(1)

          Text("@\(post.author.username)")
            .font(.footnote)
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
      PollView(postId: post.id, poll: poll, interactor: interactor)
    }
  }

  private var actionBar: some View {
    HStack {
      ActionButton(
        systemImage: post.isLiked ? "heart.fill" : "heart",
        count: post.likeCount,
        isActive: post.isLiked,
        activeColor: Color(red: 1.0, green: 0.02, blue: 0.22),
        accessibilityLabel: post.isLiked ? "Unlike post" : "Like post"
      ) {
        Task { await interactor.toggleLike(postId: post.id) }
      }

      ActionButton(
        systemImage: "bubble.right",
        count: post.commentCount,
        isActive: false,
        accessibilityLabel: "Open comments"
      ) {
        onOpenPost()
      }

      ActionButton(
        systemImage: "arrow.2.squarepath",
        count: post.repostCount,
        isActive: post.isReposted,
        activeColor: Color(red: 0.0, green: 0.55, blue: 0.28),
        accessibilityLabel: post.isReposted ? "Undo repost" : "Repost"
      ) {
        Task { await interactor.toggleRepost(postId: post.id) }
      }

      ActionButton(
        systemImage: post.isBookmarked ? "bookmark.fill" : "bookmark",
        count: post.bookmarkCount,
        isActive: post.isBookmarked,
        accessibilityLabel: post.isBookmarked ? "Remove bookmark" : "Bookmark post"
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
  var activeColor: Color = .accentColor
  let accessibilityLabel: String
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 6) {
        Image(systemName: systemImage)
          .font(.system(size: 17, weight: .medium))
          .symbolRenderingMode(.monochrome)
          .frame(width: 22, height: 22)

        if count > 0 {
          Text(count.compactFormatted)
            .font(.caption.weight(.medium))
            .monospacedDigit()
        }
      }
      .foregroundStyle(isActive ? activeColor : Color.secondary)
      .frame(maxWidth: .infinity, alignment: .leading)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .accessibilityLabel(accessibilityLabel)
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
  let postId: String
  let poll: Poll
  let interactor: any PostInteracting

  private var selectedOptionId: String? {
    poll.selectedOptionIds.first
  }

  private var canVote: Bool {
    !poll.hasVoted && !poll.isEnded
  }

  private var winningPercent: Double {
    poll.options.compactMap(\.percent).max() ?? 0
  }

  private var hasUniqueWinner: Bool {
    guard winningPercent > 0 else { return false }
    return poll.options.filter { ($0.percent ?? 0) == winningPercent }.count == 1
  }

  private enum PollPalette {
    static let gradientText = Color(red: 0.06, green: 0.06, blue: 0.06)
    static let winnerStart = Color(red: 10.0 / 255.0, green: 228.0 / 255.0, blue: 72.0 / 255.0)
    static let winnerEnd = Color(red: 171.0 / 255.0, green: 1.0, blue: 132.0 / 255.0)
    static let barStart = Color.primary.opacity(0.16)
    static let barEnd = Color.primary.opacity(0.07)

    static let winnerGradient = LinearGradient(
      colors: [winnerStart, winnerEnd],
      startPoint: UnitPoint(x: 0.12, y: 0.18),
      endPoint: UnitPoint(x: 0.82, y: 0.78)
    )

    static let barGradient = LinearGradient(
      colors: [barStart, barEnd],
      startPoint: UnitPoint(x: 0.12, y: 0.18),
      endPoint: UnitPoint(x: 0.82, y: 0.78)
    )
  }

  var body: some View {
    Group {
      if poll.type == .image {
        imagePoll
      } else {
        textPoll
      }
    }
    .padding(.top, 4)
  }

  private var textPoll: some View {
    VStack(alignment: .leading, spacing: 8) {
      ForEach(poll.options) { option in
        if poll.resultsVisible {
          resultRow(for: option)
        } else {
          voteButton(for: option)
        }
      }

      footer
        .padding(.top, 2)
    }
  }

  private var imagePoll: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        HStack(spacing: 8) {
          Image(systemName: "chart.bar.xaxis")
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(Color.accentColor)
            .frame(width: 28, height: 28)
            .background(Color(.systemBackground), in: Circle())

          Text("Poll")
            .font(.subheadline.weight(.semibold))
        }

        Spacer()

        if !canVote {
          Text(voteCountText)
            .font(.caption.weight(.medium))
            .foregroundStyle(.secondary)
        }
      }

      LazyVGrid(columns: imagePollColumns, spacing: 8) {
        ForEach(poll.options) { option in
          imageOption(for: option)
        }
      }

      Divider()

      footer
    }
    .padding(12)
    .background(Color(.secondarySystemBackground).opacity(0.45), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 14, style: .continuous)
        .stroke(Color(.separator).opacity(0.35), lineWidth: 1)
    )
  }

  private var imagePollColumns: [GridItem] {
    [
      GridItem(.flexible(), spacing: 8),
      GridItem(.flexible(), spacing: 8),
    ]
  }

  private func voteButton(for option: PollOption) -> some View {
    let isSelected = option.id == selectedOptionId

    return Button {
      submitVote(option.id)
    } label: {
      Text(option.displayLabel)
        .font(.subheadline.weight(isSelected ? .semibold : .medium))
        .foregroundStyle(isSelected ? Color.accentColor : Color.primary)
        .lineLimit(2)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(isSelected ? Color.accentColor.opacity(0.08) : Color(.systemBackground), in: Capsule())
        .overlay(
          Capsule()
            .stroke(isSelected ? Color.accentColor : Color(.separator).opacity(0.65), lineWidth: 1.5)
        )
    }
    .buttonStyle(.plain)
    .allowsHitTesting(canVote)
    .accessibilityLabel("Vote for \(option.displayLabel)")
  }

  private func resultRow(for option: PollOption) -> some View {
    let percent = option.percent ?? 0
    let isSelected = option.id == selectedOptionId
    let isWinner = isWinning(option)

    return ZStack(alignment: .leading) {
      Capsule()
        .fill(Color(.secondarySystemBackground))

      GeometryReader { proxy in
        Capsule()
          .fill(resultFillStyle(isWinner: isWinner))
          .frame(width: proxy.size.width * CGFloat(percent / 100))
          .animation(.easeOut(duration: 0.45), value: percent)
      }

      HStack {
        HStack(spacing: 7) {
          if isSelected {
            Image(systemName: "checkmark.circle.fill")
              .font(.system(size: 17, weight: .semibold))
              .foregroundStyle(isWinner ? PollPalette.gradientText : Color.accentColor)
          }

          Text(option.displayLabel)
            .font(.subheadline.weight(isWinner ? .semibold : .regular))
            .foregroundStyle(isWinner && percent > 64 ? PollPalette.gradientText : Color.primary)
            .lineLimit(1)
        }

        Spacer()

        Text(formatPercent(percent))
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(isWinner && percent > 88 ? PollPalette.gradientText : Color.secondary)
          .monospacedDigit()
      }
      .padding(.horizontal, 12)
      .padding(.vertical, 9)
    }
    .frame(minHeight: 40)
  }

  private func imageOption(for option: PollOption) -> some View {
    let percent = option.percent ?? 0
    let isSelected = option.id == selectedOptionId
    let isWinner = isWinning(option)

    return Button {
      submitVote(option.id)
    } label: {
      VStack(spacing: 0) {
        imageTile(for: option, percent: percent, isSelected: isSelected, isWinner: isWinner)

        Text(option.displayLabel)
          .font(.caption.weight(.medium))
          .foregroundStyle(isWinner && poll.resultsVisible ? PollPalette.gradientText : Color.primary)
          .lineLimit(1)
          .frame(maxWidth: .infinity)
          .padding(.horizontal, 8)
          .padding(.vertical, 8)
          .background {
            if isWinner && poll.resultsVisible {
              PollPalette.winnerGradient
            } else {
              Color(.systemBackground)
            }
          }
      }
      .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
      .overlay(
        RoundedRectangle(cornerRadius: 12, style: .continuous)
          .stroke(isSelected ? Color.accentColor : Color(.separator).opacity(0.55), lineWidth: isSelected ? 2 : 1)
      )
    }
    .buttonStyle(.plain)
    .allowsHitTesting(canVote)
    .accessibilityLabel("Vote for \(option.displayLabel)")
  }

  private func imageTile(
    for option: PollOption,
    percent: Double,
    isSelected: Bool,
    isWinner: Bool
  ) -> some View {
    Color(.tertiarySystemFill)
      .aspectRatio(1, contentMode: .fit)
      .overlay {
        optionImage(option)
          .scaledToFill()
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .clipped()
      }
      .overlay {
        if canVote {
          LinearGradient(
            colors: [.clear, .black.opacity(0.28)],
            startPoint: .top,
            endPoint: .bottom
          )
        }
      }
      .overlay {
        if isSelected {
          Image(systemName: "checkmark.circle.fill")
            .font(.system(size: poll.resultsVisible ? 24 : 36, weight: .bold))
            .foregroundStyle(.white, Color.accentColor)
            .shadow(color: .black.opacity(0.22), radius: 8, y: 2)
        }
      }
      .overlay(alignment: .bottomTrailing) {
        if poll.resultsVisible {
          pollResultBadge(percent: percent, isWinner: isWinner)
            .padding(7)
        }
      }
  }

  private func pollResultBadge(percent: Double, isWinner: Bool) -> some View {
    VStack(spacing: 1) {
      Text(formatPercent(percent))
        .font(.caption.weight(.bold))
        .monospacedDigit()

      if isWinner {
        Text("Winner")
          .font(.system(size: 8, weight: .bold))
          .textCase(.uppercase)
      }
    }
    .foregroundStyle(isWinner ? PollPalette.gradientText : Color.white)
    .padding(.horizontal, 7)
    .padding(.vertical, 5)
    .background {
      if isWinner {
        PollPalette.winnerGradient
          .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
      } else {
        Color.black.opacity(0.68)
          .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
      }
    }
  }

  @ViewBuilder
  private func optionImage(_ option: PollOption) -> some View {
    if let imageUrl = option.imageUrl, let url = URL(string: imageUrl) {
      KFImage(url)
        .placeholder {
          imagePlaceholder
        }
        .resizable()
        .scaledToFill()
    } else {
      imagePlaceholder
    }
  }

  private var imagePlaceholder: some View {
    ZStack {
      Color(.tertiarySystemFill)

      Image(systemName: "photo")
        .font(.system(size: 30, weight: .light))
        .foregroundStyle(.secondary)
    }
  }

  private var footer: some View {
    TimelineView(.periodic(from: Date(), by: pollCountdownInterval)) { context in
      Text(footerText(now: context.date))
        .font(.caption)
        .foregroundStyle(.secondary)
        .lineLimit(1)
    }
  }

  private var voteCountText: String {
    "\(poll.totalVotes.compactFormatted) vote\(poll.totalVotes == 1 ? "" : "s")"
  }

  private var pollCountdownInterval: TimeInterval {
    guard let endsAt = poll.endsAt else { return 60 }
    let remaining = max(0, endsAt.timeIntervalSinceNow)
    if remaining < 120 { return 10 }
    if remaining < 3600 { return 30 }
    return 60
  }

  private func footerText(now: Date) -> String {
    var parts = [voteCountText]
    let timeLabel = timeRemainingText(now: now)
    if !timeLabel.isEmpty {
      parts.append(timeLabel)
    }
    if poll.hasVoted {
      parts.append("Your vote")
    }
    return parts.joined(separator: " · ")
  }

  private func timeRemainingText(now: Date) -> String {
    if poll.isEnded {
      return "Final results"
    }

    guard let endsAt = poll.endsAt else { return "" }
    let remaining = max(0, endsAt.timeIntervalSince(now))
    if remaining < 60 {
      return "Less than a minute left"
    }
    if remaining < 3600 {
      let minutes = Int(ceil(remaining / 60))
      return "\(minutes) minute\(minutes == 1 ? "" : "s") left"
    }
    if remaining < 86_400 {
      let hours = Int(ceil(remaining / 3600))
      return "\(hours) hour\(hours == 1 ? "" : "s") left"
    }

    let days = Int(ceil(remaining / 86_400))
    return "\(days) day\(days == 1 ? "" : "s") left"
  }

  private func submitVote(_ optionId: String) {
    guard canVote else { return }

    Task {
      await interactor.votePoll(postId: postId, optionIds: [optionId])
    }
  }

  private func isWinning(_ option: PollOption) -> Bool {
    poll.resultsVisible && hasUniqueWinner && (option.percent ?? 0) == winningPercent && winningPercent > 0
  }

  private func resultFillStyle(isWinner: Bool) -> AnyShapeStyle {
    isWinner ? AnyShapeStyle(PollPalette.winnerGradient) : AnyShapeStyle(PollPalette.barGradient)
  }

  private func formatPercent(_ percent: Double) -> String {
    "\(Int(percent.rounded()))%"
  }
}

import Kingfisher
import SwiftUI
import UIKit

struct PostCard: View {
  @EnvironmentObject private var env: AppEnvironment

  let post: FeedPost
  let interactor: any PostInteracting
  var onOpenPost: (() -> Void)?
  var onOpenImage: (PostImageDestination) -> Void = { _ in }
  var truncatesBody = true
  var postActionSheetTitle = "Post actions"
  var postActionSheetActions: [BottomActionSheetAction]?
  var onDismissPostActions: () -> Void = {}

  @State private var isExpanded = false
  @State private var isShowingPostActions = false
  @State private var isShowingRepostActions = false
  @State private var isShowingShareModal = false

  private var authorName: String {
    guard let displayName = post.author.displayName, !displayName.isEmpty else {
      return post.author.username
    }

    return displayName
  }

  private var timestamp: String {
    post.createdAt.feedRelativeShort
  }

  private var authorDestination: ProfileDestination {
    ProfileDestination(username: post.author.username)
  }

  private var authorAccessibilityLabel: String {
    let identity = "\(authorName), @\(post.author.username)"
    guard let role = AuthorRoleLabel.headline(for: post.author) else { return identity }
    return "\(identity), \(role)"
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      if let repostContext = post.repostContext {
        PostRepostContextView(
          context: repostContext,
          viewerUserId: currentUserId,
          viewerHasReposted: post.isReposted
        )
      }

      HStack(alignment: .top, spacing: 12) {
        avatar

        VStack(alignment: .leading, spacing: 6) {
          authorRow
          postTypeLabel
          headline
          bodyText
          filmCard
          mediaGrid
          linkPreview
          pollView
          QuotedPostCard(
            post: post.quotedPost,
            unavailable: post.quotedPostUnavailable
          )
          actionBar
        }
      }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 12)
    .background {
      if let onOpenPost {
        Button(action: onOpenPost) {
          Color(.systemBackground)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Open post by \(authorName)")
        .accessibilityHint("Opens post")
      } else {
        Color(.systemBackground)
      }
    }
    .bottomActionSheet(
      isPresented: $isShowingPostActions,
      onDismiss: onDismissPostActions
    ) {
      postActionSheet
    }
    .bottomActionSheet(isPresented: $isShowingRepostActions) {
      BottomActionSheet(title: "Repost options", actions: repostActions)
    }
    .shareModal(
      isPresented: $isShowingShareModal,
      url: shareURL,
      title: "\(post.author.username) on 35mm",
      previewContent: SharePreviewContent(
        type: .post,
        title: post.author.username,
        imageURL: sharePreviewImageURL,
        description: shareDescription
      )
    )
  }

  @ViewBuilder
  private var postActionSheet: some View {
    if let postActionSheetActions {
      BottomActionSheet(title: postActionSheetTitle, actions: postActionSheetActions)
    } else {
      BottomActionSheet(title: postActionSheetTitle, sections: defaultPostActionSections)
    }
  }

  private var defaultPostActionSections: [BottomActionSheetSection] {
    [
      BottomActionSheetSection(actions: [
        BottomActionSheetAction("Share post", systemImage: "square.and.arrow.up") {
          isShowingShareModal = true
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
  }

  private var avatar: some View {
    NavigationLink(value: AppRoute.profile(authorDestination)) {
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
    .frame(minWidth: 44, minHeight: 44, alignment: .top)
    .contentShape(Circle())
    .accessibilityLabel("View @\(post.author.username)'s profile")
  }

  private var authorRow: some View {
    HStack(alignment: .top, spacing: 0) {
      VStack(alignment: .leading, spacing: 1) {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
          NavigationLink(value: AppRoute.profile(authorDestination)) {
            FeedAuthorIdentityLabel(
              displayName: authorName,
              username: post.author.username
            )
          }
          .buttonStyle(.plain)
          .contentShape(Rectangle())
          .accessibilityLabel(authorAccessibilityLabel)
          .accessibilityHint("Opens profile")
          .layoutPriority(1)

          FeedTimestampLabel(timestamp: timestamp)

          Spacer(minLength: 0)
        }

        AuthorRoleLabel(author: post.author)
          .accessibilityHidden(true)
      }

      Spacer(minLength: 8)

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
  private var postTypeLabel: some View {
    if post.type == .discussion {
      Label("DISCUSSION", systemImage: "bubble.left.and.bubble.right")
        .font(.caption.weight(.semibold))
        .tracking(0.5)
        .foregroundStyle(.secondary)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(.quaternary, in: Capsule())
        .padding(.top, 4)
        .padding(.bottom, 2)
        .accessibilityLabel("Discussion post")
    }
  }

  @ViewBuilder
  private var filmCard: some View {
    if let film = post.film {
      FilmLogCard(film: film, rating: post.starRating)
        .padding(.top, 2)
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
      let suppressedURL =
        post.linkPreview?.presentation == .cardOnly ? post.linkPreview?.url : nil
      VStack(alignment: .leading, spacing: 4) {
        RichTextView(body: body, font: .body, suppressingURL: suppressedURL)
          .lineLimit(shouldClampBody(body) ? 6 : nil)
          .fixedSize(horizontal: false, vertical: true)

        if truncatesBody && shouldShowMore(for: body) && !isExpanded {
          Button("more") {
            isExpanded = true
          }
          .font(.body.weight(.medium))
          .buttonStyle(.plain)
          .foregroundStyle(Color.accentColor)
        }
      }
    }
  }

  @ViewBuilder
  private var mediaGrid: some View {
    let allItems = mediaItems
    let items = Array(allItems.prefix(4))
    if !items.isEmpty {
      PostMediaGrid(items: items) { url in
        onOpenImage(
          PostImageDestination(
            urls: allItems.map(\.url),
            selectedURL: url,
            postId: post.id
          )
        )
      }
      .clipShape(RoundedRectangle(cornerRadius: 8))
      .padding(.top, 2)
    }
  }

  @ViewBuilder
  private var linkPreview: some View {
    if !hasAttachedMedia, post.poll == nil {
      let previews = videoPreviews
      ForEach(previews) { preview in
        VideoURLPreview(preview: preview)
      }

      if previews.isEmpty, let preview = post.linkPreview {
        LinkPreviewCard(preview: preview)
      }
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
        assetName: post.isLiked ? "PostActionHeartFilled" : "PostActionHeart",
        count: post.likeCount,
        isActive: post.isLiked,
        activeColor: DesignSystem.Colors.like,
        accessibilityLabel: post.isLiked ? "Unlike post" : "Like post"
      ) {
        Task { await interactor.toggleLike(postId: post.id) }
      }

      ActionButton(
        assetName: "PostActionComment",
        count: post.commentCount,
        isActive: false,
        accessibilityLabel: "Open comments"
      ) {
        onOpenPost?()
      }

      ActionButton(
        assetName: post.isReposted ? "PostActionRepostFilled" : "PostActionRepost",
        count: post.repostCount,
        isActive: post.isReposted,
        activeColor: DesignSystem.Colors.repost,
        accessibilityLabel: post.isReposted
          ? "Repost options, reposted"
          : "Repost options, not reposted"
      ) {
        isShowingRepostActions = true
      }

      ActionButton(
        assetName: post.isBookmarked ? "PostActionBookmarkFilled" : "PostActionBookmark",
        count: post.bookmarkCount,
        isActive: post.isBookmarked,
        accessibilityLabel: post.isBookmarked ? "Remove bookmark" : "Bookmark post"
      ) {
        Task { await interactor.toggleBookmark(postId: post.id) }
      }
    }
    .padding(.top, 8)
  }

  private var mediaItems: [PostMediaGridItem] {
    PostMediaGridItem.imageItems(from: post.media, fallbackURLs: post.mediaUrls)
  }

  private var hasAttachedMedia: Bool {
    if let media = post.media, !media.isEmpty {
      return true
    }

    return post.mediaUrls?.isEmpty == false
  }

  private var videoPreviews: [URLVideoPreview] {
    let suppressedURL =
      post.linkPreview?.presentation == .cardOnly ? post.linkPreview?.url : nil
    let bodyPreviews = URLVideoPreview.previews(
      inStoredText: post.body,
      suppressingURL: suppressedURL
    )

    guard let linkPreview = post.linkPreview,
      let linkVideo = URLVideoPreview(linkPreview: linkPreview)
    else {
      return bodyPreviews
    }

    return [linkVideo] + bodyPreviews.filter { $0.url != linkVideo.url }
  }

  private var repostActions: [BottomActionSheetAction] {
    [
      BottomActionSheetAction(
        post.isReposted ? "Undo repost" : "Repost",
        systemImage: "arrow.2.squarepath"
      ) {
        Task { await interactor.toggleRepost(postId: post.id) }
      },
      BottomActionSheetAction("Quote", systemImage: "quote.bubble") {
        env.presentComposer(quoting: post)
      },
    ]
  }

  private var currentUserId: String? {
    if case .authenticated(let userId) = env.authManager.authState {
      return userId
    }
    return nil
  }

  private var shareURL: URL {
    AppConstants.webBaseURLValue
      .appending(path: post.author.username)
      .appending(path: "post")
      .appending(path: post.id)
  }

  private var sharePreviewImageURL: URL? {
    guard let raw = post.film?.posterUrl?.trimmingCharacters(in: .whitespacesAndNewlines),
      !raw.isEmpty
    else {
      return nil
    }

    if raw.hasPrefix("/") {
      return URL(string: "https://image.tmdb.org/t/p/w500\(raw)")
    }

    return URL(string: raw)
  }

  private var shareDescription: String? {
    let body = RichTextParser.parse(post.body).map { String($0.characters) } ?? ""
    let headline = post.headline?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let combined = [headline, body]
      .filter { !$0.isEmpty }
      .joined(separator: headline.isEmpty || body.isEmpty ? "" : " — ")
      .trimmingCharacters(in: .whitespacesAndNewlines)

    guard !combined.isEmpty else { return nil }
    return String(combined.prefix(100))
  }

  private func shouldShowMore(for body: String) -> Bool {
    let plain =
      body.hasPrefix(RichTextParser.sentinel)
      ? String(body.dropFirst(RichTextParser.sentinel.count))
      : body

    return plain.count > 320 || plain.filter(\.isNewline).count > 5
  }

  private func shouldClampBody(_ body: String) -> Bool {
    truncatesBody && !isExpanded && shouldShowMore(for: body)
  }
}

struct FeedAuthorIdentityLabel: View {
  let displayName: String
  let username: String

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 4) {
      Text(displayName)
        .font(.appAuthorName)
        .foregroundStyle(.primary)
        .lineLimit(1)

      Text("@\(username)")
        .font(.appAuthorHandle)
        .foregroundStyle(.secondary)
        .lineLimit(1)
    }
  }
}

struct FeedTimestampLabel: View {
  let timestamp: String
  var context: String? = nil

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 2) {
      Text("· \(timestamp)")
        .font(.appMetadata)

      if let context {
        Text(context)
          .font(.caption2)
      }
    }
    .foregroundStyle(.secondary)
    .lineLimit(1)
    .fixedSize(horizontal: true, vertical: false)
  }
}

struct AuthorRoleLabel: View {
  let author: PostAuthor

  nonisolated static func headline(for author: PostAuthor) -> String? {
    guard let role = author.role?.trimmingCharacters(in: .whitespacesAndNewlines),
      !role.isEmpty
    else {
      return nil
    }

    if role == "Cinephile", let count = author.filmsLoggedCount, count > 0 {
      return "\(role) · \(count.compactFormatted) films logged"
    }

    if let context = author.roleContext?.trimmingCharacters(in: .whitespacesAndNewlines),
      !context.isEmpty
    {
      return "\(role) · \(context)"
    }

    return role
  }

  @ViewBuilder
  var body: some View {
    if let role = author.role?.trimmingCharacters(in: .whitespacesAndNewlines),
      !role.isEmpty,
      let headline = Self.headline(for: author)
    {
      HStack(spacing: 6) {
        Circle()
          .fill(Self.color(for: role))
          .frame(width: 5, height: 5)

        Text(headline)
          .font(.caption2.weight(.medium))
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }
    }
  }

  private static func color(for role: String) -> Color {
    switch role {
    case "Cinephile":
      return DesignSystem.Colors.accent
    case "Creator", "Director":
      return .indigo
    case "Critic", "Film Critic":
      return .cyan
    case "Cinematographer":
      return .green
    case "Film Student":
      return .orange
    case "Editor":
      return .purple
    case "Screenwriter":
      return .pink
    default:
      return .secondary
    }
  }
}

private struct FilmLogCard: View {
  let film: FilmRef
  let rating: Double?

  @State private var glowColor = Color(red: 120.0 / 255.0, green: 50.0 / 255.0, blue: 35.0 / 255.0)

  private let cardBackground = Color(red: 13.0 / 255.0, green: 8.0 / 255.0, blue: 6.0 / 255.0)
  private let foreground = Color(red: 250.0 / 255.0, green: 249.0 / 255.0, blue: 247.0 / 255.0)

  private var posterURL: URL? {
    guard let raw = film.posterUrl?.trimmingCharacters(in: .whitespacesAndNewlines),
      !raw.isEmpty
    else {
      return nil
    }

    if raw.hasPrefix("/") {
      return URL(string: "https://image.tmdb.org/t/p/w500\(raw)")
    }

    return URL(string: raw)
  }

  private var metadata: String {
    let year = film.year.map(String.init) ?? ""
    let genre = film.genres.first?.uppercased() ?? ""

    if !year.isEmpty, !genre.isEmpty {
      return "\(year)  ·  \(genre)"
    }

    return year.isEmpty ? genre : year
  }

  var body: some View {
    ZStack {
      cardBackground

      RadialGradient(
        colors: [glowColor.opacity(0.58), glowColor.opacity(0.24), .clear],
        center: UnitPoint(x: 0.08, y: 0.62),
        startRadius: 2,
        endRadius: 230
      )

      HStack(spacing: 18) {
        poster

        VStack(alignment: .leading, spacing: 0) {
          Text(film.title)
            .font(.system(.title3, design: .serif, weight: .bold))
            .foregroundStyle(foreground)
            .lineLimit(2)
            .minimumScaleFactor(0.82)

          if !metadata.isEmpty {
            Text(metadata)
              .font(.system(size: 11, weight: .medium, design: .monospaced))
              .tracking(0.8)
              .foregroundStyle(foreground.opacity(0.42))
              .lineLimit(1)
              .padding(.top, 7)
          }

          if let rating, rating > 0 {
            FilmCardStarRow(rating: rating)
              .padding(.top, 9)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.horizontal, 20)
      .padding(.vertical, 16)
    }
    .frame(maxWidth: .infinity)
    .frame(height: 130)
    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    .overlay {
      RoundedRectangle(cornerRadius: 10, style: .continuous)
        .stroke(Color.white.opacity(0.04), lineWidth: 0.5)
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(accessibilityLabel)
  }

  @ViewBuilder
  private var poster: some View {
    if let posterURL {
      KFImage(posterURL)
        .onSuccess { result in
          updateGlowColor(from: result.image, cacheKey: posterURL.absoluteString)
        }
        .placeholder {
          posterPlaceholder
        }
        .resizable()
        .scaledToFill()
        .frame(width: 64, height: 90)
        .clipShape(RoundedRectangle(cornerRadius: 5, style: .continuous))
        .overlay {
          RoundedRectangle(cornerRadius: 5, style: .continuous)
            .stroke(Color.white.opacity(0.08), lineWidth: 0.5)
        }
        .shadow(color: .black.opacity(0.6), radius: 10, y: 6)
        .accessibilityHidden(true)
    } else {
      posterPlaceholder
    }
  }

  private var posterPlaceholder: some View {
    ZStack {
      LinearGradient(
        colors: [Color(red: 61.0 / 255.0, green: 24.0 / 255.0, blue: 18.0 / 255.0), cardBackground],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )

      Image(systemName: "film")
        .font(.system(size: 22, weight: .light))
        .foregroundStyle(foreground.opacity(0.3))
    }
    .frame(width: 64, height: 90)
    .clipShape(RoundedRectangle(cornerRadius: 5, style: .continuous))
    .overlay {
      RoundedRectangle(cornerRadius: 5, style: .continuous)
        .stroke(Color.white.opacity(0.06), lineWidth: 0.5)
    }
    .shadow(color: .black.opacity(0.6), radius: 10, y: 6)
    .accessibilityHidden(true)
  }

  private var accessibilityLabel: String {
    let details = [film.year.map(String.init), film.genres.first]
      .compactMap { $0 }
      .joined(separator: ", ")
    let ratingText = rating.map { ", \($0.formatted(.number.precision(.fractionLength(1)))) out of 5 stars" } ?? ""

    if details.isEmpty {
      return "\(film.title)\(ratingText)"
    }

    return "\(film.title), \(details)\(ratingText)"
  }

  private func updateGlowColor(from image: UIImage, cacheKey: String) {
    if let cached = FilmPosterColorCache.shared.color(for: cacheKey) {
      glowColor = Color(uiColor: cached)
      return
    }

    guard let extracted = FilmPosterColorCache.dominantColor(from: image) else { return }
    FilmPosterColorCache.shared.insert(extracted, for: cacheKey)

    withAnimation(.easeOut(duration: 0.45)) {
      glowColor = Color(uiColor: extracted)
    }
  }
}

@MainActor
private final class FilmPosterColorCache {
  static let shared = FilmPosterColorCache()

  private let cache = NSCache<NSString, UIColor>()

  private init() {
    cache.countLimit = 256
  }

  func color(for key: String) -> UIColor? {
    cache.object(forKey: key as NSString)
  }

  func insert(_ color: UIColor, for key: String) {
    cache.setObject(color, forKey: key as NSString)
  }

  static func dominantColor(from image: UIImage) -> UIColor? {
    guard let cgImage = image.cgImage else { return nil }

    let dimension = 16
    let bytesPerPixel = 4
    let bytesPerRow = dimension * bytesPerPixel
    var pixels = [UInt8](repeating: 0, count: dimension * bytesPerRow)

    let didDraw = pixels.withUnsafeMutableBytes { buffer -> Bool in
      guard let baseAddress = buffer.baseAddress,
        let context = CGContext(
          data: baseAddress,
          width: dimension,
          height: dimension,
          bitsPerComponent: 8,
          bytesPerRow: bytesPerRow,
          space: CGColorSpaceCreateDeviceRGB(),
          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        )
      else {
        return false
      }

      context.interpolationQuality = .low
      context.draw(cgImage, in: CGRect(x: 0, y: 0, width: dimension, height: dimension))
      return true
    }

    guard didDraw else { return nil }

    var candidates: [(red: Double, green: Double, blue: Double, saturation: Double)] = []
    candidates.reserveCapacity(dimension * dimension)

    for offset in stride(from: 0, to: pixels.count, by: bytesPerPixel) {
      guard pixels[offset + 3] > 64 else { continue }

      let red = Double(pixels[offset])
      let green = Double(pixels[offset + 1])
      let blue = Double(pixels[offset + 2])
      let maximum = max(red, green, blue)
      let minimum = min(red, green, blue)
      let saturation = maximum == 0 ? 0 : (maximum - minimum) / maximum
      candidates.append((red, green, blue, saturation))
    }

    guard !candidates.isEmpty else { return nil }

    candidates.sort { $0.saturation > $1.saturation }
    let sampleCount = max(1, candidates.count / 4)
    let samples = candidates.prefix(sampleCount)
    let divisor = Double(sampleCount)
    var red = samples.reduce(0) { $0 + $1.red } / divisor
    var green = samples.reduce(0) { $0 + $1.green } / divisor
    var blue = samples.reduce(0) { $0 + $1.blue } / divisor

    let luminance = 0.299 * red + 0.587 * green + 0.114 * blue
    if luminance < 80 {
      let factor = min(3.5, 80 / max(luminance, 1))
      red = min(255, red * factor)
      green = min(255, green * factor)
      blue = min(255, blue * factor)
    }

    return UIColor(red: red / 255, green: green / 255, blue: blue / 255, alpha: 1)
  }
}

private struct ActionButton: View {
  let assetName: String
  let count: Int
  let isActive: Bool
  var activeColor: Color = .accentColor
  let accessibilityLabel: String
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 6) {
        Image(assetName)
          .resizable()
          .scaledToFit()
          .frame(width: 22, height: 22)
          .id(assetName)

        if count > 0 {
          Text(count.compactFormatted)
            .font(.appCounter)
            .monospacedDigit()
        }
      }
      .foregroundStyle(isActive ? activeColor : Color.secondary)
      .frame(maxWidth: .infinity, alignment: .leading)
      .frame(minHeight: 44)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .accessibilityLabel(accessibilityLabel)
  }
}

private struct FilmCardStarRow: View {
  let rating: Double

  var body: some View {
    HStack(spacing: 1) {
      ForEach(0..<5, id: \.self) { index in
        Image(systemName: symbol(for: index))
          .font(.system(size: 13, weight: .medium))
          .foregroundStyle(
            symbol(for: index) == "star"
              ? Color(red: 232.0 / 255.0, green: 115.0 / 255.0, blue: 90.0 / 255.0).opacity(0.25)
              : Color(red: 232.0 / 255.0, green: 115.0 / 255.0, blue: 90.0 / 255.0)
          )
      }
    }
    .accessibilityHidden(true)
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

import Foundation

struct QuotedFeedPost: Codable, Identifiable, Equatable {
  let id: String
  let author: PostAuthor
  let type: PostType
  let headline: String?
  let body: String?
  let media: [PostMedia]?
  let linkPreview: LinkPreview?
  let film: FilmRef?
  let poll: Poll?
  let createdAt: Date

  init(post: FeedPost) {
    id = post.id
    author = post.author
    type = post.type
    headline = post.headline
    body = post.body
    media = post.media
    linkPreview = post.linkPreview
    film = post.film
    poll = post.poll
    createdAt = post.createdAt
  }
}

import Foundation

enum ProfileTab: String, CaseIterable, Identifiable, Hashable {
  case posts
  case reposts
  case diary
  case lists
  case stats

  var id: String { rawValue }

  var title: String {
    switch self {
    case .posts: "Posts"
    case .reposts: "Reposts"
    case .diary: "Diary"
    case .lists: "Lists"
    case .stats: "Stats"
    }
  }

  var systemImage: String {
    switch self {
    case .posts: "doc.text"
    case .reposts: "arrow.2.squarepath"
    case .diary: "film.stack"
    case .lists: "rectangle.stack"
    case .stats: "chart.bar.xaxis"
    }
  }
}

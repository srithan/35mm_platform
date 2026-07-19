import Foundation

enum ProfileTab: String, CaseIterable, Identifiable, Hashable {
  case posts
  case diary
  case lists
  case stats

  var id: String { rawValue }

  var title: String {
    switch self {
    case .posts: "Posts"
    case .diary: "Diary"
    case .lists: "Lists"
    case .stats: "Stats"
    }
  }

  var systemImage: String {
    switch self {
    case .posts: "doc.text"
    case .diary: "film.stack"
    case .lists: "rectangle.stack"
    case .stats: "chart.bar.xaxis"
    }
  }
}

import Foundation

struct ProfileDiarySection: Identifiable, Equatable {
  let month: Date
  let posts: [FeedPost]

  var id: Date { month }
}

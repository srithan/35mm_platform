import Foundation

enum ProfileTab: String, CaseIterable, Identifiable, Hashable {
  case posts
  case reposts
  case diary
  case lists
  case stats

  var id: String { rawValue }

  var index: Int {
    Self.allCases.firstIndex(of: self) ?? 0
  }

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

  static func dragProgress(
    from selectedTab: ProfileTab,
    translation: CGFloat,
    pageWidth: CGFloat,
    isRightToLeft: Bool
  ) -> Double {
    guard pageWidth > 0 else { return Double(selectedTab.index) }
    let forwardTravel = isRightToLeft ? translation : -translation

    return min(
      max(Double(selectedTab.index) + Double(forwardTravel / pageWidth), 0),
      Double(allCases.count - 1)
    )
  }

  static func hasHorizontalIntent(
    horizontalVelocity: CGFloat,
    verticalVelocity: CGFloat
  ) -> Bool {
    abs(horizontalVelocity) > abs(verticalVelocity) * 1.15
  }

  func adjacentTab(for translation: CGFloat, isRightToLeft: Bool) -> ProfileTab? {
    let forwardTravel = isRightToLeft ? translation : -translation
    guard forwardTravel != 0 else { return nil }
    return forwardTravel > 0 ? next : previous
  }

  func visualDirection(to target: ProfileTab, isRightToLeft: Bool) -> CGFloat {
    let logicalDirection: CGFloat = target.index > index ? 1 : -1
    return isRightToLeft ? -logicalDirection : logicalDirection
  }

  static func shouldSettleDrag(
    translation: CGFloat,
    predictedTranslation: CGFloat,
    pageWidth: CGFloat,
    targetDirection: CGFloat
  ) -> Bool {
    guard pageWidth > 0 else { return false }
    let currentTravel = -translation * targetDirection
    let predictedTravel = -predictedTranslation * targetDirection
    return max(currentTravel, predictedTravel) >= pageWidth * 0.25
  }

  private var previous: ProfileTab? {
    guard index > 0 else { return nil }
    return Self.allCases[index - 1]
  }

  private var next: ProfileTab? {
    guard index < Self.allCases.count - 1 else { return nil }
    return Self.allCases[index + 1]
  }
}

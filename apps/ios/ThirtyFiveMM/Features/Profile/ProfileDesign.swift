import SwiftUI
import UIKit

enum ProfileDesign {
  static let accent = DesignSystem.Colors.accent
  static let buttonBorderUIColor = UIColor { traits in
    traits.userInterfaceStyle == .dark
      ? UIColor.white.withAlphaComponent(0.08)
      : UIColor(red: 239.0 / 255.0, green: 243.0 / 255.0, blue: 244.0 / 255.0, alpha: 1)
  }
  static let buttonBorderStrongUIColor = UIColor { traits in
    traits.userInterfaceStyle == .dark
      ? UIColor(red: 80.0 / 255.0, green: 75.0 / 255.0, blue: 68.0 / 255.0, alpha: 1)
      : UIColor(red: 221.0 / 255.0, green: 217.0 / 255.0, blue: 207.0 / 255.0, alpha: 1)
  }
  static let buttonBorder = Color(uiColor: buttonBorderUIColor)
  static let buttonBorderStrong = Color(uiColor: buttonBorderStrongUIColor)
  static let horizontalPadding = 20.0
  static let cardRadius = 16.0
  static let coverAspectRatio = 3.0
  static let avatarSize = 88.0
  static let avatarOverlap = 24.0
  static let tabBarHeight = 52.0
  static let tabBarHorizontalPadding = 16.0
  static let tabIndicatorInset = 8.0
  static let tabSwipeProjectionTime = 0.2
  static let tabTransition = Animation.snappy(duration: 0.32, extraBounce: 0)
}

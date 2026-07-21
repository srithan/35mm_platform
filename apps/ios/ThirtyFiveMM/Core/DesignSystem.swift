import SwiftUI

/// App-wide design tokens. Mirrors the web design language:
/// serif display headings, sans body, warm-red `#c2473a` accent, light-first.
enum DesignSystem {
  // MARK: Colors

  enum Colors {
    /// Brand warm red, `#c2473a`. Matches web accent and `AccentColor` asset.
    static let accent = Color(red: 194.0 / 255.0, green: 71.0 / 255.0, blue: 58.0 / 255.0)

    /// Active state for like actions.
    static let like = Color(red: 249.0 / 255.0, green: 24.0 / 255.0, blue: 128.0 / 255.0)

    /// Active state for repost actions.
    static let repost = Color(red: 0.0, green: 186.0 / 255.0, blue: 124.0 / 255.0)

    /// Active state for bookmark actions.
    static let bookmark = accent

    /// Hairline separators drawn manually (not `Divider`).
    static let hairline = Color(.separator).opacity(0.5)
  }

  // MARK: Spacing

  /// 4pt-based spacing scale. Prefer these over ad hoc values.
  enum Spacing {
    static let xxs = 4.0
    static let xs = 8.0
    static let sm = 12.0
    static let md = 16.0
    static let lg = 20.0
    static let xl = 24.0

    /// Standard horizontal inset for full-width screen content (feed, lists).
    static let screenHorizontal = 16.0
  }

  // MARK: Corner radii

  enum Radius {
    /// Thumbnails, small badges.
    static let small = 8.0
    /// Embedded cards: quoted posts, link previews, media grids.
    static let medium = 12.0
    /// Standalone cards, sheets, settings sections.
    static let large = 16.0
  }

  // MARK: Avatars

  /// Canonical avatar sizes. Keep hit targets >= 44pt around the smaller ones.
  enum AvatarSize {
    /// Comment rows, inline reply chips.
    static let extraSmall = 28.0
    /// Navigation chrome (app header).
    static let small = 36.0
    /// Feed post author.
    static let medium = 40.0
    /// Chat rows, composer, sidebar.
    static let large = 48.0
    /// Profile header.
    static let extraLarge = 88.0
  }

  // MARK: Typography metrics

  /// Extra leading for post/comment body text so paragraphs breathe (Twitter-like line height).
  static let appBodyLineSpacing = 3.0

  // MARK: Elevation

  enum Shadow {
    /// Floating banners and small overlays.
    static func banner<V: View>(_ view: V) -> some View {
      view.shadow(color: .black.opacity(0.12), radius: 12, y: 4)
    }
  }
}

// MARK: - Typography

extension Font {
  /// Brand wordmark ("35mm") and large display headings. Serif, scales with Dynamic Type.
  static let appWordmark = Font.system(.title, design: .serif, weight: .black)

  /// Screen titles inside custom headers (e.g. "Notifications").
  static let appScreenTitle = Font.system(.title3, design: .default, weight: .bold)

  /// Section headings inside screens.
  static let appSectionTitle = Font.system(.headline, design: .default, weight: .semibold)

  /// Primary row label (sidebar rows, settings rows).
  static let appRowLabel = Font.system(.body, design: .default, weight: .semibold)

  /// Compact row label (secondary sidebar rows).
  static let appRowLabelCompact = Font.system(.subheadline, design: .default, weight: .semibold)

  /// Post author display name. 15pt bold, matching Twitter's feed identity weight.
  static let appAuthorName = Font.system(.subheadline, design: .default, weight: .bold)

  /// Post author handle, inline timestamps, and other muted identity text.
  /// Same 15pt size as the name so the identity row reads as one line, like Twitter.
  static let appAuthorHandle = Font.system(.subheadline, design: .default)

  /// Post body text in feed cards. 15pt regular; pair with `appBodyLineSpacing`.
  static let appBody = Font.system(.subheadline, design: .default)

  /// Post body text on detail screens. 17pt regular; pair with `appBodyLineSpacing`.
  static let appBodyLarge = Font.system(.body, design: .default)

  /// Timestamps and other metadata trailing text outside the identity row.
  static let appMetadata = Font.system(.footnote, design: .default)

  /// Counter labels next to action icons. 13pt regular, like Twitter's action bar.
  static let appCounter = Font.system(.footnote, design: .default)
}

import SwiftUI
import UIKit

// MARK: - Theme identity

/// Color themes, mirroring the web app's `data-theme` values in
/// `apps/web/app/globals.css` and the settings schema
/// (`auto | light | dark | matinee | matrix | oppenheimer-bw | barbie`).
enum AppTheme: String, CaseIterable, Identifiable {
  case auto
  case light
  case dark
  case matinee
  case matrix
  case oppenheimerBW = "oppenheimer-bw"
  case barbie

  var id: String { rawValue }

  var title: String {
    switch self {
    case .auto: "Auto"
    case .light: "Light"
    case .dark: "Dark"
    case .matinee: "Matinee"
    case .matrix: "Matrix"
    case .oppenheimerBW: "B&W"
    case .barbie: "Pop"
    }
  }

  var systemImage: String {
    switch self {
    case .auto: "circle.lefthalf.filled"
    case .light: "sun.max"
    case .dark: "moon"
    case .matinee: "film"
    case .matrix: "terminal"
    case .oppenheimerBW: "camera.filters"
    case .barbie: "sparkles"
    }
  }

  /// Forced color scheme; `nil` follows the system (auto).
  var colorScheme: ColorScheme? {
    switch self {
    case .auto: nil
    case .light, .matinee, .barbie: .light
    case .dark, .matrix, .oppenheimerBW: .dark
    }
  }

  /// Oppenheimer renders the whole canvas monochrome (web grayscales media).
  var isMonochrome: Bool { self == .oppenheimerBW }

  /// Themes whose palette differs from the stock light/dark system look.
  var isCustomPalette: Bool {
    switch self {
    case .auto, .light, .dark: false
    case .matinee, .matrix, .oppenheimerBW, .barbie: true
    }
  }
}

/// User accent overrides, mirroring web `data-accent` values.
enum AppAccent: String, CaseIterable, Identifiable {
  case theme
  case warmRed = "warm-red"
  case crimson
  case amber
  case forest
  case ocean
  case violet
  case rose

  var id: String { rawValue }

  var title: String {
    switch self {
    case .theme: "Theme"
    case .warmRed: "Warm red"
    case .crimson: "Crimson"
    case .amber: "Amber"
    case .forest: "Forest"
    case .ocean: "Ocean"
    case .violet: "Violet"
    case .rose: "Rose"
    }
  }

  /// Swatch/override color. `nil` means "use the theme's own accent".
  var overrideColor: UIColor? {
    switch self {
    case .theme: nil
    case .warmRed: UIColor(hex: 0xC2473A)
    case .crimson: UIColor(hex: 0xC93535)
    case .amber: UIColor(hex: 0xB8861A)
    case .forest: UIColor(hex: 0x2D6A4F)
    case .ocean: UIColor(hex: 0x2A6F97)
    case .violet: UIColor(hex: 0x6D4C9A)
    case .rose: UIColor(hex: 0xC45C8A)
    }
  }
}

// MARK: - Palette

/// Semantic color tokens resolved for the active theme + accent.
/// Values are 1:1 with the CSS custom properties in `apps/web/app/globals.css`.
struct ThemePalette: Equatable {
  let uiBg: UIColor
  let uiBgElevated: UIColor
  let uiBgSunken: UIColor
  let uiBgHover: UIColor
  let uiFill: UIColor
  let uiFillStrong: UIColor
  let uiText: UIColor
  let uiTextSecondary: UIColor
  let uiTextTertiary: UIColor
  let uiBorder: UIColor
  let uiBorderStrong: UIColor
  let uiAccent: UIColor
  let uiAccentForeground: UIColor
  let uiSocialAccent: UIColor
  let uiLike: UIColor
  let uiRepost: UIColor
  let uiSuccess: UIColor
  let uiWarning: UIColor
  let uiUnreadBadge: UIColor

  /// Screen background (`--color-bg`).
  var bg: Color { Color(uiBg) }
  /// Cards, sheets, floating chrome (`--color-bg-elevated`).
  var bgElevated: Color { Color(uiBgElevated) }
  /// Recessed surfaces: input fields, wells (`--color-bg-sunken`).
  var bgSunken: Color { Color(uiBgSunken) }
  /// Row hover/pressed state (`--color-card-hover`).
  var bgHover: Color { Color(uiBgHover) }
  /// Neutral chip/pill fill (system gray 6 equivalent).
  var fill: Color { Color(uiFill) }
  /// Stronger fill for selected chips (system gray 5 equivalent).
  var fillStrong: Color { Color(uiFillStrong) }
  /// Primary text (`--color-text`).
  var text: Color { Color(uiText) }
  /// Secondary text (`--color-text-secondary`).
  var textSecondary: Color { Color(uiTextSecondary) }
  /// Tertiary/faint text (`--color-text-tertiary`).
  var textTertiary: Color { Color(uiTextTertiary) }
  /// Hairline separators (`--color-border`).
  var border: Color { Color(uiBorder) }
  /// Strong borders (`--color-border-strong`).
  var borderStrong: Color { Color(uiBorderStrong) }
  /// Primary UI emphasis (`--color-accent`).
  var accent: Color { Color(uiAccent) }
  /// Text/icons on accent-filled controls.
  var accentForeground: Color { Color(uiAccentForeground) }
  /// Mentions, hashtags, follow actions (`--color-social-accent`).
  var socialAccent: Color { Color(uiSocialAccent) }
  /// Like action active state (`--color-like`).
  var like: Color { Color(uiLike) }
  /// Repost action active state (`--color-repost`).
  var repost: Color { Color(uiRepost) }
  /// Success feedback (`--color-success`).
  var success: Color { Color(uiSuccess) }
  /// Warnings and destructive-adjacent feedback (`--color-warning`).
  var warning: Color { Color(uiWarning) }
  /// Count pills in headers/tab bars (`--color-unread-badge`).
  var unreadBadge: Color { Color(uiUnreadBadge) }

  func withAccent(_ accent: AppAccent) -> ThemePalette {
    guard let override = accent.overrideColor else { return self }
    return ThemePalette(
      uiBg: uiBg,
      uiBgElevated: uiBgElevated,
      uiBgSunken: uiBgSunken,
      uiBgHover: uiBgHover,
      uiFill: uiFill,
      uiFillStrong: uiFillStrong,
      uiText: uiText,
      uiTextSecondary: uiTextSecondary,
      uiTextTertiary: uiTextTertiary,
      uiBorder: uiBorder,
      uiBorderStrong: uiBorderStrong,
      uiAccent: override,
      uiAccentForeground: .white,
      uiSocialAccent: override,
      uiLike: uiLike,
      uiRepost: uiRepost,
      uiSuccess: uiSuccess,
      uiWarning: uiWarning,
      uiUnreadBadge: uiUnreadBadge
    )
  }
}

extension ThemePalette {
  /// Web `:root` (light) tokens.
  static let light = ThemePalette(
    uiBg: UIColor(hex: 0xFFFFFF),
    uiBgElevated: UIColor(hex: 0xFFFFFF),
    uiBgSunken: UIColor(hex: 0xF5F5F5),
    uiBgHover: UIColor(hex: 0xFAFAFA),
    uiFill: UIColor(hex: 0xF0EEEB),
    uiFillStrong: UIColor(hex: 0xE8E6E2),
    uiText: UIColor(hex: 0x0F0F0F),
    uiTextSecondary: UIColor(hex: 0x6B6B6B),
    uiTextTertiary: UIColor(hex: 0xA8A8A8),
    uiBorder: UIColor(hex: 0xEFF3F4),
    uiBorderStrong: UIColor(hex: 0xDDD9CF),
    uiAccent: UIColor(hex: 0x0F0F0F),
    uiAccentForeground: UIColor(hex: 0xFFFFFF),
    uiSocialAccent: UIColor(hex: 0x0095F6),
    uiLike: UIColor(hex: 0xE4002B),
    uiRepost: UIColor(hex: 0x5A9E7A),
    uiSuccess: UIColor(hex: 0x27AE60),
    uiWarning: UIColor(hex: 0xE67E22),
    uiUnreadBadge: UIColor(hex: 0xC93535)
  )

  /// Web `[data-theme="dark"]` tokens.
  static let dark = ThemePalette(
    uiBg: UIColor(hex: 0x0E100F),
    uiBgElevated: UIColor(hex: 0x191919),
    uiBgSunken: UIColor(hex: 0x0F0E0D),
    uiBgHover: UIColor(hex: 0x1A1C1B),
    uiFill: UIColor(hex: 0x2D2B28),
    uiFillStrong: UIColor(hex: 0x3D3A36),
    uiText: UIColor(hex: 0xF5F3F0),
    uiTextSecondary: UIColor(hex: 0xA8A29E),
    uiTextTertiary: UIColor(hex: 0x8A8580),
    uiBorder: UIColor(hex: 0xFFFFFF, alpha: 0.08),
    uiBorderStrong: UIColor(hex: 0x504B44),
    uiAccent: UIColor(hex: 0xF5F3F0),
    uiAccentForeground: UIColor(hex: 0x0E100F),
    uiSocialAccent: UIColor(hex: 0x0095F6),
    uiLike: UIColor(hex: 0xFF2D55),
    uiRepost: UIColor(hex: 0x6BB890),
    uiSuccess: UIColor(hex: 0x34C759),
    uiWarning: UIColor(hex: 0xFF9F0A),
    uiUnreadBadge: UIColor(hex: 0xE04848)
  )

  /// Light/dark dynamic palette used by auto, light, and dark themes.
  /// Resolution follows the effective color scheme, so forcing
  /// `preferredColorScheme` makes the same palette serve all three.
  static let system = ThemePalette(
    uiBg: .dynamic(light: ThemePalette.light.uiBg, dark: ThemePalette.dark.uiBg),
    uiBgElevated: .dynamic(light: ThemePalette.light.uiBgElevated, dark: ThemePalette.dark.uiBgElevated),
    uiBgSunken: .dynamic(light: ThemePalette.light.uiBgSunken, dark: ThemePalette.dark.uiBgSunken),
    uiBgHover: .dynamic(light: ThemePalette.light.uiBgHover, dark: ThemePalette.dark.uiBgHover),
    uiFill: .dynamic(light: ThemePalette.light.uiFill, dark: ThemePalette.dark.uiFill),
    uiFillStrong: .dynamic(light: ThemePalette.light.uiFillStrong, dark: ThemePalette.dark.uiFillStrong),
    uiText: .dynamic(light: ThemePalette.light.uiText, dark: ThemePalette.dark.uiText),
    uiTextSecondary: .dynamic(light: ThemePalette.light.uiTextSecondary, dark: ThemePalette.dark.uiTextSecondary),
    uiTextTertiary: .dynamic(light: ThemePalette.light.uiTextTertiary, dark: ThemePalette.dark.uiTextTertiary),
    uiBorder: .dynamic(light: ThemePalette.light.uiBorder, dark: ThemePalette.dark.uiBorder),
    uiBorderStrong: .dynamic(light: ThemePalette.light.uiBorderStrong, dark: ThemePalette.dark.uiBorderStrong),
    uiAccent: .dynamic(light: ThemePalette.light.uiAccent, dark: ThemePalette.dark.uiAccent),
    uiAccentForeground: .dynamic(light: ThemePalette.light.uiAccentForeground, dark: ThemePalette.dark.uiAccentForeground),
    uiSocialAccent: UIColor(hex: 0x0095F6),
    uiLike: .dynamic(light: ThemePalette.light.uiLike, dark: ThemePalette.dark.uiLike),
    uiRepost: .dynamic(light: ThemePalette.light.uiRepost, dark: ThemePalette.dark.uiRepost),
    uiSuccess: .dynamic(light: ThemePalette.light.uiSuccess, dark: ThemePalette.dark.uiSuccess),
    uiWarning: .dynamic(light: ThemePalette.light.uiWarning, dark: ThemePalette.dark.uiWarning),
    uiUnreadBadge: .dynamic(light: ThemePalette.light.uiUnreadBadge, dark: ThemePalette.dark.uiUnreadBadge)
  )

  /// Web `[data-theme="matinee"]` tokens.
  static let matinee = ThemePalette(
    uiBg: UIColor(hex: 0xF7F2E9),
    uiBgElevated: UIColor(hex: 0xEFE7D8),
    uiBgSunken: UIColor(hex: 0xE9DFCE),
    uiBgHover: UIColor(hex: 0xE9DFCE),
    uiFill: UIColor(hex: 0xEFE7D8),
    uiFillStrong: UIColor(hex: 0xDDD3BF),
    uiText: UIColor(hex: 0x1C1A17),
    uiTextSecondary: UIColor(hex: 0x55504A),
    uiTextTertiary: UIColor(hex: 0x8B8378),
    uiBorder: UIColor(hex: 0xDDD3BF),
    uiBorderStrong: UIColor(hex: 0xC9BDA5),
    uiAccent: UIColor(hex: 0xC2473A),
    uiAccentForeground: UIColor(hex: 0xFFFFFF),
    uiSocialAccent: UIColor(hex: 0xC2473A),
    uiLike: UIColor(hex: 0xC2473A),
    uiRepost: UIColor(hex: 0x4D7C5F),
    uiSuccess: UIColor(hex: 0x4D7C5F),
    uiWarning: UIColor(hex: 0xB8861A),
    uiUnreadBadge: UIColor(hex: 0xC2473A)
  )

  /// Web `[data-theme="matrix"]` tokens.
  static let matrix = ThemePalette(
    uiBg: UIColor(hex: 0x000000),
    uiBgElevated: UIColor(hex: 0x050505),
    uiBgSunken: UIColor(hex: 0x020804),
    uiBgHover: UIColor(hex: 0x0A1810),
    uiFill: UIColor(hex: 0x102416),
    uiFillStrong: UIColor(hex: 0x1A3B24),
    uiText: UIColor(hex: 0x00FF41),
    uiTextSecondary: UIColor(hex: 0x00B32C),
    uiTextTertiary: UIColor(hex: 0x008020),
    uiBorder: UIColor(hex: 0x00FF41, alpha: 0.15),
    uiBorderStrong: UIColor(hex: 0x00FF41, alpha: 0.35),
    uiAccent: UIColor(hex: 0x00FF41),
    uiAccentForeground: UIColor(hex: 0x001905),
    uiSocialAccent: UIColor(hex: 0x00FF41),
    uiLike: UIColor(hex: 0x00FF41),
    uiRepost: UIColor(hex: 0x00FF41),
    uiSuccess: UIColor(hex: 0x00FF41),
    uiWarning: UIColor(hex: 0xCCFF00),
    uiUnreadBadge: UIColor(hex: 0x00FF41)
  )

  /// Web `[data-theme="oppenheimer-bw"]` tokens.
  static let oppenheimerBW = ThemePalette(
    uiBg: UIColor(hex: 0x0A0A0A),
    uiBgElevated: UIColor(hex: 0x121212),
    uiBgSunken: UIColor(hex: 0x060606),
    uiBgHover: UIColor(hex: 0x171717),
    uiFill: UIColor(hex: 0x242424),
    uiFillStrong: UIColor(hex: 0x303030),
    uiText: UIColor(hex: 0xF4F4F4),
    uiTextSecondary: UIColor(hex: 0xB0B0B0),
    uiTextTertiary: UIColor(hex: 0x8B8B8B),
    uiBorder: UIColor(hex: 0xFFFFFF, alpha: 0.12),
    uiBorderStrong: UIColor(hex: 0xFFFFFF, alpha: 0.24),
    uiAccent: UIColor(hex: 0xD9D9D9),
    uiAccentForeground: UIColor(hex: 0x0A0A0A),
    uiSocialAccent: UIColor(hex: 0xD9D9D9),
    uiLike: UIColor(hex: 0xD8D8D8),
    uiRepost: UIColor(hex: 0xC6C6C6),
    uiSuccess: UIColor(hex: 0xD0D0D0),
    uiWarning: UIColor(hex: 0xBDBDBD),
    uiUnreadBadge: UIColor(hex: 0xEFEFEF)
  )

  /// Web `[data-theme="barbie"]` tokens.
  static let barbie = ThemePalette(
    uiBg: UIColor(hex: 0xFFD6F0),
    uiBgElevated: UIColor(hex: 0xFFCAEB),
    uiBgSunken: UIColor(hex: 0xFFC0E5),
    uiBgHover: UIColor(hex: 0xFFE8F7),
    uiFill: UIColor(hex: 0xFFE3F5),
    uiFillStrong: UIColor(hex: 0xFFC4F3),
    uiText: UIColor(hex: 0x3D0A2E),
    uiTextSecondary: UIColor(hex: 0x8A3A68),
    uiTextTertiary: UIColor(hex: 0xB05890),
    uiBorder: UIColor(hex: 0xFF36AF, alpha: 0.15),
    uiBorderStrong: UIColor(hex: 0xFF36AF, alpha: 0.30),
    uiAccent: UIColor(hex: 0xFF36AF),
    uiAccentForeground: UIColor(hex: 0x3D0A2E),
    uiSocialAccent: UIColor(hex: 0x0095F6),
    uiLike: UIColor(hex: 0xFF36AF),
    uiRepost: UIColor(hex: 0xFA73CB),
    uiSuccess: UIColor(hex: 0xE85DAE),
    uiWarning: UIColor(hex: 0xFF9EE2),
    uiUnreadBadge: UIColor(hex: 0xFF36AF)
  )
}

extension AppTheme {
  var basePalette: ThemePalette {
    switch self {
    // Light/dark must be static. Dynamic `.system` resolves against the
    // *current* trait collection, so during a Matrix→Light switch the UI
    // still has dark traits for a frame and paints the old dark palette
    // (NEW → OLD → NEW flash). Auto is the only mode that should track traits.
    case .auto: .system
    case .light: .light
    case .dark: .dark
    case .matinee: .matinee
    case .matrix: .matrix
    case .oppenheimerBW: .oppenheimerBW
    case .barbie: .barbie
    }
  }

  var userInterfaceStyle: UIUserInterfaceStyle {
    switch self {
    case .auto: .unspecified
    case .light, .matinee, .barbie: .light
    case .dark, .matrix, .oppenheimerBW: .dark
    }
  }
}

// MARK: - Manager

/// Source of truth for the active theme + accent. Persisted locally so the
/// theme applies on cold launch before settings load, then re-synced whenever
/// the settings API responds (same layering as web: localStorage + settings).
/// Atomic theme+accent+palette so observers never render a mixed frame.
struct ThemeSnapshot: Equatable {
  var theme: AppTheme
  var accent: AppAccent
  var palette: ThemePalette

  init(theme: AppTheme, accent: AppAccent) {
    self.theme = theme
    self.accent = accent
    self.palette = theme.basePalette.withAccent(accent)
  }
}

@MainActor
final class ThemeManager: ObservableObject {
  static let shared = ThemeManager()

  private static let themeKey = "35mm.appearance.theme"
  private static let accentKey = "35mm.appearance.accent"

  /// One publish per switch — never theme-then-accent across two frames.
  @Published private(set) var snapshot: ThemeSnapshot

  var theme: AppTheme { snapshot.theme }
  var accent: AppAccent { snapshot.accent }
  var palette: ThemePalette { snapshot.palette }

  private init() {
    let defaults = UserDefaults.standard
    let theme = defaults.string(forKey: Self.themeKey).flatMap(AppTheme.init(rawValue:)) ?? .auto
    let accent = defaults.string(forKey: Self.accentKey).flatMap(AppAccent.init(rawValue:)) ?? .theme
    snapshot = ThemeSnapshot(theme: theme, accent: accent)
  }

  func set(theme: AppTheme, accent: AppAccent) {
    guard theme != self.theme || accent != self.accent else { return }

    let next = ThemeSnapshot(theme: theme, accent: accent)

    // Snap UIKit traits + chrome *before* SwiftUI publishes. Otherwise dynamic
    // colors / preferredColorScheme lag a frame behind and flash the old look.
    Self.applyInterfaceStyle(theme, windowBackground: next.palette.uiBg)
    Self.applyChrome(next.palette, custom: theme.isCustomPalette)

    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction) {
      snapshot = next
    }

    let defaults = UserDefaults.standard
    defaults.set(theme.rawValue, forKey: Self.themeKey)
    defaults.set(accent.rawValue, forKey: Self.accentKey)
  }

  /// Forces window trait collection immediately (avoids preferredColorScheme lag).
  /// Also paints root/tab hosts so the home-indicator strip matches the theme
  /// (Matinee was leaking system white under the floating tab bar).
  static func applyInterfaceStyle(_ theme: AppTheme, windowBackground: UIColor) {
    let style = theme.userInterfaceStyle
    UIView.performWithoutAnimation {
      for scene in UIApplication.shared.connectedScenes {
        guard let windowScene = scene as? UIWindowScene else { continue }
        for window in windowScene.windows {
          window.overrideUserInterfaceStyle = style
          window.backgroundColor = windowBackground
          paintHostBackgrounds(from: window.rootViewController, color: windowBackground)
        }
      }
    }
  }

  private static func paintHostBackgrounds(from root: UIViewController?, color: UIColor) {
    guard let root else { return }
    var queue: [UIViewController] = [root]
    while let controller = queue.first {
      queue.removeFirst()
      // Paint hosts behind the floating tab bar. Never paint `UITabBar` itself
      // opaque — that creates the iOS 26 content-covering bottom slab.
      controller.view.backgroundColor = color
      if let tab = controller as? UITabBarController {
        tab.view.backgroundColor = color
      }
      queue.append(contentsOf: controller.children)
      if let presented = controller.presentedViewController {
        queue.append(presented)
      }
    }
  }

  /// Restyles UIKit navigation + tab chrome for custom palettes (Matrix/Matinee/etc).
  static func applyChrome(_ palette: ThemePalette, custom: Bool) {
    UIView.performWithoutAnimation {
      applyNavigationBarTheme(palette, custom: custom)
      MainTabView.applyTabBarTheme(palette, custom: custom)
    }
  }

  private static func applyNavigationBarTheme(_ palette: ThemePalette, custom: Bool) {
    _ = custom
    let appearance = UINavigationBarAppearance()
    appearance.configureWithOpaqueBackground()
    appearance.backgroundColor = palette.uiBg
    appearance.titleTextAttributes = [.foregroundColor: palette.uiText]
    appearance.largeTitleTextAttributes = [.foregroundColor: palette.uiText]
    appearance.buttonAppearance.normal.titleTextAttributes = [.foregroundColor: palette.uiText]
    appearance.shadowColor = .clear

    let tint = palette.uiText
    UINavigationBar.appearance().standardAppearance = appearance
    UINavigationBar.appearance().scrollEdgeAppearance = appearance
    UINavigationBar.appearance().compactAppearance = appearance
    UINavigationBar.appearance().tintColor = tint

    for scene in UIApplication.shared.connectedScenes {
      guard let windowScene = scene as? UIWindowScene else { continue }
      for window in windowScene.windows {
        window.allSubviews(of: UINavigationBar.self).forEach { bar in
          bar.standardAppearance = appearance
          bar.scrollEdgeAppearance = appearance
          bar.compactAppearance = appearance
          bar.tintColor = tint
        }
      }
    }
  }

  /// Sync from an explicit user choice (settings picker). Always applies.
  func apply(_ appearance: AppearanceSettings) {
    set(
      theme: AppTheme(rawValue: appearance.theme) ?? theme,
      accent: AppAccent(rawValue: appearance.accentColor) ?? accent
    )
  }

  /// Cold-start hydrate only. Once the user (or a prior launch) has a persisted
  /// theme, GET responses must not override it — that caused the theme flash.
  func hydrateFromServerIfNeeded(_ appearance: AppearanceSettings?) {
    guard let appearance else { return }
    let defaults = UserDefaults.standard
    guard defaults.object(forKey: Self.themeKey) == nil else { return }
    apply(appearance)
  }
}

// MARK: - Environment

private struct ThemePaletteKey: EnvironmentKey {
  static let defaultValue = ThemePalette.system
}

extension EnvironmentValues {
  /// Active theme palette. Set at the app root by `RootView`.
  var theme: ThemePalette {
    get { self[ThemePaletteKey.self] }
    set { self[ThemePaletteKey.self] = newValue }
  }
}

// MARK: - View helpers

extension View {
  /// Fills the view behind content with the active theme background.
  func themedBackground(_ keyPath: KeyPath<ThemePalette, Color> = \.bg) -> some View {
    modifier(ThemedBackgroundModifier(keyPath: keyPath))
  }

  /// Hides default List/ScrollView chrome and paints the theme background.
  func themedListBackground() -> some View {
    modifier(ThemedListBackgroundModifier())
  }
}

private struct ThemedBackgroundModifier: ViewModifier {
  @Environment(\.theme) private var theme
  let keyPath: KeyPath<ThemePalette, Color>

  func body(content: Content) -> some View {
    // Ignore safe area so Matinee/Matrix fill the home-indicator strip instead
    // of leaking system white/black behind the tab bar.
    content.background(theme[keyPath: keyPath].ignoresSafeArea())
  }
}

private struct ThemedListBackgroundModifier: ViewModifier {
  @Environment(\.theme) private var theme

  func body(content: Content) -> some View {
    content
      .scrollContentBackground(.hidden)
      .background(theme.bg.ignoresSafeArea())
  }
}

/// No-op kept for call sites. Forcing `toolbarColorScheme` fought window
/// `overrideUserInterfaceStyle` and contributed to theme-switch flashes.
struct ThemedNavigationBarColorSchemeModifier: ViewModifier {
  func body(content: Content) -> some View {
    content
  }
}

/// Disables the floating/minimized tab bar when available so custom themes
/// keep one opaque chrome surface instead of a glassy ghost bar.
struct TabBarMinimizeDisabledModifier: ViewModifier {
  @ObservedObject private var themeManager = ThemeManager.shared

  func body(content: Content) -> some View {
    if #available(iOS 26.0, *), themeManager.theme.isCustomPalette {
      content.tabBarMinimizeBehavior(.never)
    } else {
      content
    }
  }
}

// MARK: - UIColor helpers

extension UIColor {
  convenience init(hex: UInt32, alpha: CGFloat = 1) {
    self.init(
      red: CGFloat((hex >> 16) & 0xFF) / 255.0,
      green: CGFloat((hex >> 8) & 0xFF) / 255.0,
      blue: CGFloat(hex & 0xFF) / 255.0,
      alpha: alpha
    )
  }

  static func dynamic(light: UIColor, dark: UIColor) -> UIColor {
    UIColor { traits in
      traits.userInterfaceStyle == .dark ? dark : light
    }
  }
}

extension UIView {
  /// Depth-first search for subviews of a given type (used to restyle live
  /// UIKit chrome such as tab bars when the theme changes).
  func allSubviews<T: UIView>(of type: T.Type) -> [T] {
    var result: [T] = []
    for subview in subviews {
      if let match = subview as? T {
        result.append(match)
      }
      result.append(contentsOf: subview.allSubviews(of: type))
    }
    return result
  }
}

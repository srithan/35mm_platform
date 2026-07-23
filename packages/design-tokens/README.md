# @35mm/design-tokens

React-free source of truth for shared 35mm mobile foundation and theme tokens.
It contains no React, React Native, DOM, UIKit, or Android dependency. Platform
adapters may translate these plain values into framework-specific styles.

Theme colors follow the mobile reference hierarchy in
`docs/react-native-mobile-development-plan.md`: mobile web supplies the selected
visual values, while SwiftUI remains a checked native reference. Source-backed
fixtures preserve both values where those references differ.

Runtime code imports `@35mm/design-tokens`. Test and visual-regression tooling
may import stable fixtures from `@35mm/design-tokens/fixtures`.

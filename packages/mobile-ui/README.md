# @35mm/mobile-ui

Shared React Native UI foundation for the 35mm iOS and Android app.

## Ownership

- `@35mm/design-tokens` owns framework-neutral values.
- This package owns React Native theme adaptation, font aliases, icons, controls,
  overlays, toast presentation, skeletons, and reusable state surfaces.
- Feature modules own feature compositions and server state.
- The package must not import Next.js, browser globals, Radix, Tailwind DOM
  utilities, TipTap React UI, or `@35mm/ui`.

## Runtime rules

- Wrap rendered primitives in `MobileUIProvider` with an explicit theme preference.
- Load `mobileFontAssets` during app bootstrap through Expo Font's `useFonts`.
- Mount `ToastProvider` once inside the safe-area root.
- Mount the application inside `GestureHandlerRootView` before using
  `ActionSheet`.
- Loading skeletons are hidden from screen readers; announce loading once at the
  screen-state boundary.
- `ActionSheet`, `ModalSurface`, and `ConfirmationDialog` own Android back,
  backdrop dismissal, modal accessibility containment, and Reduce Motion paths.

No component in this package performs a network request or stores server state.

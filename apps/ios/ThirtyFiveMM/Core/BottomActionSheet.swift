import SwiftUI
import UIKit

struct BottomActionSheetAction: Identifiable {
  let id = UUID()
  let title: String
  let systemImage: String?
  let role: ButtonRole?
  let action: () -> Void

  init(
    _ title: String,
    systemImage: String? = nil,
    role: ButtonRole? = nil,
    action: @escaping () -> Void
  ) {
    self.title = title
    self.systemImage = systemImage
    self.role = role
    self.action = action
  }
}

struct BottomActionSheetSection: Identifiable {
  let id = UUID()
  let actions: [BottomActionSheetAction]
}

struct BottomActionSheet: View {
  @Environment(\.dismiss) private var dismiss
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  @State private var isVisible = false
  @State private var isDismissing = false
  @State private var dragOffset: CGFloat = 0

  let title: String
  let sections: [BottomActionSheetSection]

  private static let transitionAnimation = Animation.smooth(duration: 0.3)

  init(title: String, actions: [BottomActionSheetAction]) {
    self.title = title
    self.sections = [BottomActionSheetSection(actions: actions)]
  }

  init(title: String, sections: [BottomActionSheetSection]) {
    self.title = title
    self.sections = sections
  }

  var body: some View {
    ZStack(alignment: .bottom) {
      BottomActionSheetPalette.backdrop
        .opacity(isVisible ? 1 : 0)
        .ignoresSafeArea()
        .allowsHitTesting(isVisible && !isDismissing)
        .onTapGesture {
          dismissSheet()
        }

      if isVisible {
        sheetContent(bottomInset: bottomSafeAreaInset)
          .offset(y: dragOffset)
          .gesture(dismissDragGesture)
          .transition(.move(edge: .bottom))
      }
    }
    .ignoresSafeArea()
    .presentationBackground(.clear)
    .accessibilityLabel(title.isEmpty ? "Actions" : title)
    .onAppear(perform: presentSheet)
  }

  private var bottomSafeAreaInset: CGFloat {
    let activeScene = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .first { $0.activationState == .foregroundActive }

    return activeScene?.windows.first(where: \.isKeyWindow)?.safeAreaInsets.bottom ?? 0
  }

  private func sheetContent(bottomInset: CGFloat) -> some View {
    VStack(spacing: 0) {
      Capsule()
        .fill(BottomActionSheetPalette.handle)
        .frame(width: 40, height: 5)
        .padding(.top, 16)
        .padding(.bottom, 12)

      VStack(spacing: 12) {
        ForEach(sections) { section in
          VStack(spacing: 0) {
            ForEach(section.actions) { item in
              actionRow(item)

              if item.id != section.actions.last?.id {
                Divider()
                  .overlay(BottomActionSheetPalette.divider)
                  .padding(.horizontal, 20)
              }
            }
          }
          .background(
            BottomActionSheetPalette.groupBackground,
            in: RoundedRectangle(cornerRadius: 22, style: .continuous)
          )
          .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        }
      }
      .padding(.horizontal, 16)
      .padding(.top, 2)
      .padding(.bottom, 12)
    }
    .padding(.bottom, max(16, bottomInset))
    .frame(maxWidth: .infinity)
    .background(
      UnevenRoundedRectangle(
        topLeadingRadius: 32,
        bottomLeadingRadius: 0,
        bottomTrailingRadius: 0,
        topTrailingRadius: 32,
        style: .continuous
      )
      .fill(BottomActionSheetPalette.sheetBackground)
      .ignoresSafeArea(edges: .bottom)
    )
  }

  private func actionRow(_ item: BottomActionSheetAction) -> some View {
    Button(role: item.role) {
      dismissSheet(then: item.action)
    } label: {
      HStack(spacing: 20) {
        Text(item.title)
          .font(.system(size: 16, weight: .semibold))
          .tracking(-0.24)
          .foregroundStyle(actionColor(for: item))
          .lineLimit(1)
          .truncationMode(.tail)

        Spacer(minLength: 20)

        if let systemImage = item.systemImage {
          Image(systemName: systemImage)
            .font(.system(size: 20, weight: .medium))
            .foregroundStyle(actionColor(for: item).opacity(0.9))
            .frame(width: 24, height: 24)
        }
      }
      .frame(maxWidth: .infinity, minHeight: 58, alignment: .leading)
      .padding(.horizontal, 20)
      .contentShape(Rectangle())
    }
    .buttonStyle(BottomActionSheetButtonStyle())
    .disabled(isDismissing)
  }

  private func actionColor(for item: BottomActionSheetAction) -> Color {
    item.role == .destructive
      ? BottomActionSheetPalette.destructive
      : BottomActionSheetPalette.foreground
  }

  private var dismissDragGesture: some Gesture {
    DragGesture(minimumDistance: 8)
      .onChanged { value in
        guard !isDismissing else { return }
        dragOffset = max(0, value.translation.height)
      }
      .onEnded { value in
        guard !isDismissing else { return }

        if value.translation.height >= 80 {
          dismissSheet()
        } else {
          withAnimation(Self.transitionAnimation) {
            dragOffset = 0
          }
        }
      }
  }

  private func presentSheet() {
    guard !isVisible else { return }

    if reduceMotion {
      isVisible = true
    } else {
      withAnimation(Self.transitionAnimation) {
        isVisible = true
      }
    }
  }

  private func dismissSheet(then action: (() -> Void)? = nil) {
    guard !isDismissing else { return }
    isDismissing = true

    if reduceMotion {
      completeDismiss(action)
      return
    }

    withAnimation(Self.transitionAnimation, completionCriteria: .logicallyComplete) {
      isVisible = false
    } completion: {
      completeDismiss(action)
    }
  }

  private func completeDismiss(_ action: (() -> Void)?) {
    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction) {
      dismiss()
    }
    action?()
  }
}

private enum BottomActionSheetPalette {
  static let backdrop = Color(red: 15.0 / 255.0, green: 15.0 / 255.0, blue: 15.0 / 255.0)
    .opacity(0.38)

  static let sheetBackground = dynamicColor(
    light: UIColor(red: 245.0 / 255.0, green: 245.0 / 255.0, blue: 245.0 / 255.0, alpha: 1),
    dark: UIColor(red: 15.0 / 255.0, green: 14.0 / 255.0, blue: 13.0 / 255.0, alpha: 1)
  )

  static let groupBackground = dynamicColor(
    light: .white,
    dark: UIColor(red: 25.0 / 255.0, green: 25.0 / 255.0, blue: 25.0 / 255.0, alpha: 1)
  )

  static let foreground = dynamicColor(
    light: UIColor(red: 15.0 / 255.0, green: 15.0 / 255.0, blue: 15.0 / 255.0, alpha: 1),
    dark: UIColor(red: 245.0 / 255.0, green: 243.0 / 255.0, blue: 240.0 / 255.0, alpha: 1)
  )

  static let destructive = dynamicColor(
    light: UIColor(red: 201.0 / 255.0, green: 53.0 / 255.0, blue: 53.0 / 255.0, alpha: 1),
    dark: UIColor(red: 224.0 / 255.0, green: 72.0 / 255.0, blue: 72.0 / 255.0, alpha: 1)
  )

  static let divider = dynamicColor(
    light: UIColor(red: 239.0 / 255.0, green: 243.0 / 255.0, blue: 244.0 / 255.0, alpha: 1),
    dark: UIColor.white.withAlphaComponent(0.08)
  )

  static let handle = dynamicColor(
    light: UIColor(red: 221.0 / 255.0, green: 217.0 / 255.0, blue: 207.0 / 255.0, alpha: 0.9),
    dark: UIColor.white.withAlphaComponent(0.24)
  )

  static let pressedBackground = dynamicColor(
    light: UIColor(red: 250.0 / 255.0, green: 249.0 / 255.0, blue: 248.0 / 255.0, alpha: 1),
    dark: UIColor(red: 27.0 / 255.0, green: 29.0 / 255.0, blue: 28.0 / 255.0, alpha: 1)
  )

  private static func dynamicColor(light: UIColor, dark: UIColor) -> Color {
    Color(
      uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark ? dark : light
      }
    )
  }
}

private struct BottomActionSheetButtonStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .background(
        configuration.isPressed
          ? BottomActionSheetPalette.pressedBackground
          : Color.clear
      )
  }
}

extension View {
  func bottomActionSheet<SheetContent: View>(
    isPresented: Binding<Bool>,
    onDismiss: (() -> Void)? = nil,
    @ViewBuilder content: @escaping () -> SheetContent
  ) -> some View {
    modifier(
      BottomActionSheetBooleanPresenter(
        isPresented: isPresented,
        onDismiss: onDismiss,
        sheetContent: content
      )
    )
  }

  func bottomActionSheet<Item: Identifiable, SheetContent: View>(
    item: Binding<Item?>,
    onDismiss: (() -> Void)? = nil,
    @ViewBuilder content: @escaping (Item) -> SheetContent
  ) -> some View {
    modifier(
      BottomActionSheetItemPresenter(
        item: item,
        onDismiss: onDismiss,
        sheetContent: content
      )
    )
  }
}

private struct BottomActionSheetBooleanPresenter<SheetContent: View>: ViewModifier {
  @Binding var isPresented: Bool
  @State private var isCoverPresented = false

  let onDismiss: (() -> Void)?
  let sheetContent: () -> SheetContent

  func body(content: Content) -> some View {
    content
      .onAppear {
        synchronizeCover(with: isPresented)
      }
      .onChange(of: isPresented) { _, newValue in
        synchronizeCover(with: newValue)
      }
      .fullScreenCover(isPresented: $isCoverPresented, onDismiss: finishDismissal) {
        sheetContent()
      }
  }

  private func synchronizeCover(with newValue: Bool) {
    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction) {
      isCoverPresented = newValue
    }
  }

  private func finishDismissal() {
    isPresented = false
    onDismiss?()
  }
}

private struct BottomActionSheetItemPresenter<Item: Identifiable, SheetContent: View>: ViewModifier {
  @Binding var item: Item?
  @State private var presentedItem: Item?

  let onDismiss: (() -> Void)?
  let sheetContent: (Item) -> SheetContent

  func body(content: Content) -> some View {
    content
      .onAppear {
        synchronizeCover(with: item)
      }
      .onChange(of: item?.id) { _, _ in
        synchronizeCover(with: item)
      }
      .fullScreenCover(item: $presentedItem, onDismiss: finishDismissal) { item in
        sheetContent(item)
      }
  }

  private func synchronizeCover(with newItem: Item?) {
    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction) {
      presentedItem = newItem
    }
  }

  private func finishDismissal() {
    item = nil
    onDismiss?()
  }
}

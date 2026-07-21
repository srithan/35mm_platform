import SwiftUI
import UIKit

enum SharePreviewType: String {
  case post
  case film
  case user
}

struct SharePreviewContent {
  let type: SharePreviewType
  let title: String
  let imageURL: URL?
  let description: String?
}

enum ShareChannel: CaseIterable {
  case x
  case threads
  case reddit
  case bluesky
  case telegram
  case whatsapp
  case facebook
  case linkedin
  case email
  case message
}

enum ShareURLFactory {
  static func destination(
    for channel: ShareChannel,
    sharedURL: URL,
    title: String?
  ) -> URL {
    let resolvedTitle = title?.trimmingCharacters(in: .whitespacesAndNewlines)
    let fallbackTitle = "Check this out on 35mm"
    let titleText = resolvedTitle.flatMap { $0.isEmpty ? nil : $0 } ?? fallbackTitle
    let titledLink = "\(titleText) \(sharedURL.absoluteString)"

    switch channel {
    case .x:
      return webURL(
        host: "twitter.com",
        path: "/intent/tweet",
        queryItems: [
          URLQueryItem(name: "url", value: sharedURL.absoluteString),
          URLQueryItem(name: "text", value: titleText),
        ]
      )
    case .threads:
      return webURL(
        host: "www.threads.net",
        path: "/intent/post",
        queryItems: [URLQueryItem(name: "text", value: titledLink)]
      )
    case .reddit:
      return webURL(
        host: "www.reddit.com",
        path: "/submit",
        queryItems: [
          URLQueryItem(name: "url", value: sharedURL.absoluteString),
          URLQueryItem(name: "title", value: titleText),
        ]
      )
    case .bluesky:
      return webURL(
        host: "bsky.app",
        path: "/intent/compose",
        queryItems: [URLQueryItem(name: "text", value: titledLink)]
      )
    case .telegram:
      return webURL(
        host: "t.me",
        path: "/share/url",
        queryItems: [
          URLQueryItem(name: "url", value: sharedURL.absoluteString),
          URLQueryItem(name: "text", value: titleText),
        ]
      )
    case .whatsapp:
      return webURL(
        host: "wa.me",
        queryItems: [URLQueryItem(name: "text", value: titledLink)]
      )
    case .facebook:
      return webURL(
        host: "www.facebook.com",
        path: "/sharer/sharer.php",
        queryItems: [URLQueryItem(name: "u", value: sharedURL.absoluteString)]
      )
    case .linkedin:
      return webURL(
        host: "www.linkedin.com",
        path: "/sharing/share-offsite/",
        queryItems: [URLQueryItem(name: "url", value: sharedURL.absoluteString)]
      )
    case .email:
      return schemeURL(
        scheme: "mailto",
        queryItems: [
          URLQueryItem(name: "subject", value: titleText),
          URLQueryItem(name: "body", value: sharedURL.absoluteString),
        ]
      )
    case .message:
      return schemeURL(
        scheme: "sms",
        queryItems: [URLQueryItem(name: "body", value: titledLink)]
      )
    }
  }

  private static func webURL(
    host: String,
    path: String = "",
    queryItems: [URLQueryItem]
  ) -> URL {
    var components = URLComponents()
    components.scheme = "https"
    components.host = host
    components.path = path
    components.queryItems = queryItems
    guard let url = components.url else {
      preconditionFailure("Invalid share URL for \(host)")
    }
    return url
  }

  private static func schemeURL(
    scheme: String,
    queryItems: [URLQueryItem]
  ) -> URL {
    var components = URLComponents()
    components.scheme = scheme
    components.queryItems = queryItems
    guard let url = components.url else {
      preconditionFailure("Invalid share URL for \(scheme)")
    }
    return url
  }
}

struct ShareModal: View {
  @Environment(\.theme) private var theme
  @Environment(\.dismiss) private var dismiss
  @Environment(\.openURL) private var openURL
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.verticalSizeClass) private var verticalSizeClass

  let url: URL
  let title: String?
  let previewContent: SharePreviewContent?

  @State private var isVisible = false
  @State private var isDismissing = false
  @State private var dragOffset: CGFloat = 0
  @State private var copied = false
  @State private var copiedResetTask: Task<Void, Never>?

  private static let transitionAnimation = Animation.spring(
    duration: 0.36,
    bounce: 0.08
  )

  var body: some View {
    GeometryReader { geometry in
      ZStack(alignment: .bottom) {
        ShareModalPalette.backdrop
          .opacity(isVisible ? 1 : 0)
          .ignoresSafeArea()
          .allowsHitTesting(isVisible && !isDismissing)
          .onTapGesture(perform: dismissModal)

        sheetContent(
          compactBodyMaxHeight: max(180, (geometry.size.height * 0.88) - 101)
        )
        .offset(y: isVisible ? dragOffset : geometry.size.height)
        .allowsHitTesting(isVisible && !isDismissing)
      }
    }
    .ignoresSafeArea()
    .presentationBackground(.clear)
    .onAppear(perform: presentModal)
    .onDisappear {
      copiedResetTask?.cancel()
    }
  }

  private func sheetContent(compactBodyMaxHeight: CGFloat) -> some View {
    VStack(spacing: 0) {
      dragHandle
      header
      Divider()
        .overlay(ShareModalPalette.border)

      if verticalSizeClass == .compact {
        ScrollView {
          modalBody
        }
        .scrollIndicators(.hidden)
        .frame(maxHeight: compactBodyMaxHeight)
      } else {
        modalBody
          .fixedSize(horizontal: false, vertical: true)
      }
    }
    .frame(maxWidth: .infinity)
    .background(
      UnevenRoundedRectangle(
        topLeadingRadius: 32,
        bottomLeadingRadius: 0,
        bottomTrailingRadius: 0,
        topTrailingRadius: 32,
        style: .continuous
      )
      .fill(ShareModalPalette.sheetBackground)
      .ignoresSafeArea(edges: .bottom)
    )
    .accessibilityElement(children: .contain)
    .accessibilityLabel("Share")
  }

  private var modalBody: some View {
    VStack(spacing: 24) {
      if let previewContent {
        preview(previewContent)
      }

      socialGrid

      separator
      copyLinkControl
    }
    .padding(.horizontal, 16)
    .padding(.top, 8)
    .padding(.bottom, max(20, bottomSafeAreaInset))
  }

  private var socialGrid: some View {
    let options = shareOptions

    return VStack(spacing: 20) {
      HStack(spacing: 8) {
        ForEach(Array(options.prefix(5))) { option in
          shareOption(option)
        }
      }

      HStack(spacing: 8) {
        ForEach(Array(options.dropFirst(5))) { option in
          shareOption(option)
        }
      }
    }
  }

  private var dragHandle: some View {
    Capsule()
      .fill(ShareModalPalette.handle)
      .frame(width: 40, height: 5)
      .padding(.top, 16)
      .padding(.bottom, 12)
      .frame(maxWidth: .infinity)
      .frame(minHeight: 44)
      .contentShape(Rectangle())
      .gesture(dismissDragGesture)
      .accessibilityHidden(true)
  }

  private var header: some View {
    HStack(spacing: 12) {
      Text("Share")
        .font(.system(size: 15, weight: .semibold))
        .tracking(-0.18)

      Spacer()

      Button(action: dismissModal) {
        Image(systemName: "xmark")
          .font(.system(size: 15, weight: .semibold))
          .foregroundStyle(theme.textSecondary)
          .frame(width: 32, height: 32)
          .contentShape(Circle())
      }
      .buttonStyle(.plain)
      .frame(width: 44, height: 44)
      .disabled(isDismissing)
      .accessibilityLabel("Close")
    }
    .padding(.leading, 20)
    .padding(.trailing, 16)
    .padding(.bottom, 12)
  }

  private func preview(_ content: SharePreviewContent) -> some View {
    HStack(alignment: .top, spacing: 16) {
      previewImage(content.imageURL)

      VStack(alignment: .leading, spacing: 3) {
        HStack(spacing: 8) {
          Text(content.type.rawValue.uppercased())
            .font(.system(size: 9, weight: .bold))
            .tracking(0.7)
            .foregroundStyle(theme.textSecondary)
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(ShareModalPalette.hover, in: RoundedRectangle(cornerRadius: 6))

          Circle()
            .fill(ShareModalPalette.border)
            .frame(width: 4, height: 4)

          Text("35mm.in")
            .font(.system(size: 11))
            .foregroundStyle(theme.textTertiary)
        }

        Text(content.title)
          .font(.system(size: 14, weight: .bold))
          .tracking(-0.2)
          .lineLimit(1)

        Text(previewDescription(content))
          .font(.system(size: 12))
          .foregroundStyle(theme.textSecondary)
          .lineLimit(1)
      }
      .padding(.top, 1)
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(16)
    .background(
      ShareModalPalette.previewBackground,
      in: RoundedRectangle(cornerRadius: 16, style: .continuous)
    )
    .overlay {
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .stroke(ShareModalPalette.border, lineWidth: 1)
    }
    .accessibilityElement(children: .combine)
  }

  @ViewBuilder
  private func previewImage(_ imageURL: URL?) -> some View {
    if let imageURL {
      AsyncImage(url: imageURL) { phase in
        switch phase {
        case .success(let image):
          image
            .resizable()
            .scaledToFill()
        default:
          previewPlaceholder
        }
      }
      .frame(width: 56, height: 56)
      .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    } else {
      previewPlaceholder
    }
  }

  private var previewPlaceholder: some View {
    Image(systemName: "link")
      .font(.system(size: 22, weight: .medium))
      .foregroundStyle(theme.textTertiary)
      .frame(width: 56, height: 56)
      .background(ShareModalPalette.hover)
      .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
  }

  private func shareOption(_ option: ShareOption) -> some View {
    Button {
      openURL(option.destination)
    } label: {
      VStack(spacing: 8) {
        ZStack {
          RoundedRectangle(cornerRadius: 16, style: .continuous)
            .fill(option.color)
            .shadow(color: .black.opacity(0.1), radius: 8, y: 4)

          option.mark.view
            .foregroundStyle(.white)
        }
        .frame(width: 48, height: 48)

        Text(option.name.uppercased())
          .font(.system(size: 9.5, weight: .bold))
          .tracking(0.2)
          .foregroundStyle(theme.textSecondary)
          .lineLimit(1)
          .minimumScaleFactor(0.72)
      }
      .frame(maxWidth: .infinity, minHeight: 70, alignment: .top)
      .contentShape(Rectangle())
    }
    .buttonStyle(ShareOptionButtonStyle())
    .disabled(isDismissing)
    .accessibilityLabel("Share via \(option.name)")
  }

  private var separator: some View {
    HStack(spacing: 16) {
      Rectangle()
        .fill(ShareModalPalette.border)
        .frame(height: 1)

      Text("OR")
        .font(.system(size: 10, weight: .bold))
        .tracking(2)
        .foregroundStyle(theme.textTertiary)

      Rectangle()
        .fill(ShareModalPalette.border)
        .frame(height: 1)
    }
    .padding(.vertical, 2)
    .accessibilityHidden(true)
  }

  private var copyLinkControl: some View {
    HStack(spacing: 8) {
      Image(systemName: "link")
        .font(.system(size: 15, weight: .medium))
        .foregroundStyle(theme.textSecondary)

      Text(url.absoluteString)
        .font(.system(size: 13))
        .foregroundStyle(theme.textSecondary)
        .lineLimit(1)
        .truncationMode(.middle)
        .textSelection(.enabled)

      Spacer(minLength: 4)

      Button(action: copyLink) {
        HStack(spacing: 5) {
          if copied {
            Image(systemName: "checkmark")
              .font(.system(size: 10, weight: .heavy))
          }

          Text(copied ? "COPIED" : "COPY")
            .font(.system(size: 11, weight: .bold))
        }
        .frame(minWidth: 80, minHeight: 32)
        .foregroundStyle(copied ? ShareModalPalette.copied : ShareModalPalette.copyForeground)
        .background(
          copied ? ShareModalPalette.copiedBackground : ShareModalPalette.copyBackground,
          in: Capsule()
        )
        .overlay {
          if copied {
            Capsule()
              .stroke(ShareModalPalette.copiedBorder, lineWidth: 1)
          }
        }
        .contentShape(Capsule())
      }
      .buttonStyle(.plain)
      .frame(minHeight: 44)
      .disabled(isDismissing)
      .accessibilityLabel(copied ? "Link copied" : "Copy link")
    }
    .padding(.leading, 14)
    .padding(.trailing, 4)
    .padding(.vertical, 4)
    .background(ShareModalPalette.copyFieldBackground, in: Capsule())
    .overlay {
      Capsule()
        .stroke(ShareModalPalette.border, lineWidth: 1)
    }
  }

  private var shareOptions: [ShareOption] {
    ShareChannel.allCases.map { channel in
      let presentation = ShareOption.presentation(for: channel)
      return ShareOption(
        channel: channel,
        name: presentation.name,
        mark: presentation.mark,
        color: presentation.color,
        destination: ShareURLFactory.destination(
          for: channel,
          sharedURL: url,
          title: title
        )
      )
    }
  }

  private var bottomSafeAreaInset: CGFloat {
    let activeScene = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .first { $0.activationState == .foregroundActive }

    return activeScene?.windows.first(where: \.isKeyWindow)?.safeAreaInsets.bottom ?? 0
  }

  private var dismissDragGesture: some Gesture {
    DragGesture(minimumDistance: 8)
      .onChanged { value in
        guard !isDismissing else { return }
        dragOffset = max(0, value.translation.height)
      }
      .onEnded { value in
        guard !isDismissing else { return }

        if value.translation.height >= 96 || value.predictedEndTranslation.height >= 180 {
          dismissModal()
        } else {
          withAnimation(Self.transitionAnimation) {
            dragOffset = 0
          }
        }
      }
  }

  private func previewDescription(_ content: SharePreviewContent) -> String {
    let trimmed = content.description?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    return trimmed.isEmpty ? url.absoluteString.replacingOccurrences(of: "https://", with: "") : trimmed
  }

  private func copyLink() {
    UIPasteboard.general.url = url
    copiedResetTask?.cancel()

    withAnimation(.easeOut(duration: 0.15)) {
      copied = true
    }

    copiedResetTask = Task { @MainActor in
      try? await Task.sleep(nanoseconds: 2_000_000_000)
      guard !Task.isCancelled else { return }
      withAnimation(.easeOut(duration: 0.15)) {
        copied = false
      }
    }
  }

  private func presentModal() {
    guard !isVisible else { return }

    if reduceMotion {
      isVisible = true
    } else {
      withAnimation(Self.transitionAnimation) {
        isVisible = true
      }
    }
  }

  private func dismissModal() {
    guard !isDismissing else { return }
    isDismissing = true
    copiedResetTask?.cancel()

    if reduceMotion {
      dismiss()
      return
    }

    withAnimation(Self.transitionAnimation, completionCriteria: .logicallyComplete) {
      isVisible = false
    } completion: {
      var transaction = Transaction()
      transaction.disablesAnimations = true
      withTransaction(transaction) {
        dismiss()
      }
    }
  }
}

private struct ShareOption: Identifiable {
  let channel: ShareChannel
  let name: String
  let mark: ShareOptionMark
  let color: Color
  let destination: URL

  var id: String { name }

  static func presentation(for channel: ShareChannel) -> (
    name: String,
    mark: ShareOptionMark,
    color: Color
  ) {
    switch channel {
    case .x:
      return ("X", .text("X", 19), .black)
    case .threads:
      return ("Threads", .text("@", 22), Color(red: 0.09, green: 0.09, blue: 0.1))
    case .reddit:
      return ("Reddit", .symbol("face.smiling", 21), Color(red: 1, green: 0.27, blue: 0))
    case .bluesky:
      return ("Bluesky", .symbol("cloud.fill", 19), Color(red: 0, green: 0.52, blue: 1))
    case .telegram:
      return ("Telegram", .symbol("paperplane.fill", 19), Color(red: 0, green: 0.53, blue: 0.8))
    case .whatsapp:
      return ("WhatsApp", .symbol("phone.fill", 18), Color(red: 0.15, green: 0.83, blue: 0.4))
    case .facebook:
      return ("Facebook", .text("f", 24), Color(red: 0.09, green: 0.47, blue: 0.95))
    case .linkedin:
      return ("LinkedIn", .text("in", 17), Color(red: 0, green: 0.47, blue: 0.71))
    case .email:
      return ("Email", .symbol("envelope.fill", 18), Color(red: 0.44, green: 0.44, blue: 0.48))
    case .message:
      return ("Message", .symbol("message.fill", 19), Color(red: 0.09, green: 0.64, blue: 0.29))
    }
  }
}

private enum ShareOptionMark {
  case text(String, CGFloat)
  case symbol(String, CGFloat)

  @ViewBuilder
  var view: some View {
    switch self {
    case .text(let value, let size):
      Text(value)
        .font(.system(size: size, weight: .bold, design: .rounded))
    case .symbol(let name, let size):
      Image(systemName: name)
        .font(.system(size: size, weight: .semibold))
    }
  }
}

private enum ShareModalPalette {
  static let backdrop = Color(red: 15.0 / 255.0, green: 15.0 / 255.0, blue: 15.0 / 255.0)
    .opacity(0.38)
  static let sheetBackground = dynamicColor(
    light: UIColor(red: 245.0 / 255.0, green: 245.0 / 255.0, blue: 245.0 / 255.0, alpha: 1),
    dark: UIColor(red: 15.0 / 255.0, green: 14.0 / 255.0, blue: 13.0 / 255.0, alpha: 1)
  )
  static let previewBackground = dynamicColor(
    light: UIColor.white.withAlphaComponent(0.58),
    dark: UIColor(red: 25.0 / 255.0, green: 25.0 / 255.0, blue: 25.0 / 255.0, alpha: 0.7)
  )
  static let copyFieldBackground = dynamicColor(
    light: UIColor.white.withAlphaComponent(0.72),
    dark: UIColor(red: 25.0 / 255.0, green: 25.0 / 255.0, blue: 25.0 / 255.0, alpha: 1)
  )
  static let hover = dynamicColor(
    light: UIColor(red: 236.0 / 255.0, green: 233.0 / 255.0, blue: 228.0 / 255.0, alpha: 1),
    dark: UIColor.white.withAlphaComponent(0.08)
  )
  static let border = dynamicColor(
    light: UIColor(red: 221.0 / 255.0, green: 217.0 / 255.0, blue: 207.0 / 255.0, alpha: 0.78),
    dark: UIColor.white.withAlphaComponent(0.1)
  )
  static let handle = dynamicColor(
    light: UIColor(red: 221.0 / 255.0, green: 217.0 / 255.0, blue: 207.0 / 255.0, alpha: 0.9),
    dark: UIColor.white.withAlphaComponent(0.24)
  )
  static let copyBackground = dynamicColor(light: .black, dark: .white)
  static let copyForeground = dynamicColor(light: .white, dark: .black)
  static let copied = Color(red: 0.09, green: 0.55, blue: 0.25)
  static let copiedBackground = Color(red: 0.09, green: 0.55, blue: 0.25).opacity(0.08)
  static let copiedBorder = Color(red: 0.09, green: 0.55, blue: 0.25).opacity(0.24)

  private static func dynamicColor(light: UIColor, dark: UIColor) -> Color {
    Color(
      uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark ? dark : light
      }
    )
  }
}

private struct ShareOptionButtonStyle: ButtonStyle {
  @Environment(\.theme) private var theme
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .scaleEffect(configuration.isPressed ? 0.95 : 1)
      .offset(y: configuration.isPressed ? 1 : 0)
      .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
  }
}

extension View {
  func shareModal(
    isPresented: Binding<Bool>,
    url: URL,
    title: String? = nil,
    previewContent: SharePreviewContent? = nil
  ) -> some View {
    modifier(
      ShareModalPresenter(
        isPresented: isPresented,
        url: url,
        title: title,
        previewContent: previewContent
      )
    )
  }
}

private struct ShareModalPresenter: ViewModifier {
  @Binding var isPresented: Bool
  @State private var isCoverPresented = false

  let url: URL
  let title: String?
  let previewContent: SharePreviewContent?

  func body(content: Content) -> some View {
    content
      .onAppear {
        synchronizeCover(with: isPresented)
      }
      .onChange(of: isPresented) { _, newValue in
        synchronizeCover(with: newValue)
      }
      .fullScreenCover(isPresented: $isCoverPresented, onDismiss: finishDismissal) {
        ShareModal(url: url, title: title, previewContent: previewContent)
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
  }
}

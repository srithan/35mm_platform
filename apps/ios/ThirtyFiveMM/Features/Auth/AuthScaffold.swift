import SwiftUI

enum AuthPalette {
  static let ink = Color(red: 0.08, green: 0.07, blue: 0.06)
  static let paper = Color(red: 1.00, green: 0.98, blue: 0.95)
  static let socialAccent = Color(red: 0.00, green: 0.58, blue: 0.96)
  static let error = Color(red: 0.86, green: 0.16, blue: 0.16)
  static let reelGold = Color(red: 0.92, green: 0.67, blue: 0.28)
  static let slate = Color(red: 0.13, green: 0.16, blue: 0.21)
  static let mist = Color(red: 0.94, green: 0.91, blue: 0.86)
}

struct AuthScreenBackground: View {
  var body: some View {
    LinearGradient(
      colors: [
        Color(red: 0.98, green: 0.95, blue: 0.89),
        AuthPalette.paper,
        Color.white,
      ],
      startPoint: .topLeading,
      endPoint: .bottomTrailing
    )
    .ignoresSafeArea()
  }
}

struct AuthPosterHero: View {
  let height: CGFloat
  var compact = false

  var body: some View {
    ZStack(alignment: .bottom) {
      CinematicCollage()
        .frame(height: height)
        .clipped()

      LinearGradient(
        colors: [
          .clear,
          AuthPalette.paper.opacity(0.28),
          AuthPalette.paper,
        ],
        startPoint: .top,
        endPoint: .bottom
      )
      .frame(height: compact ? 130 : 190)

      if !compact {
        VStack(spacing: 8) {
          Text(AppConstants.appName)
            .font(.system(size: 28, weight: .black, design: .serif))
            .foregroundStyle(AuthPalette.ink)
            .padding(.horizontal, 18)
            .padding(.vertical, 9)
            .background(.ultraThinMaterial, in: Capsule())

          Text("Cinema, social.")
            .font(.system(size: 14, weight: .bold, design: .rounded))
            .foregroundStyle(AuthPalette.ink.opacity(0.68))
        }
        .padding(.bottom, 18)
      }
    }
    .accessibilityHidden(true)
  }
}

private struct CinematicCollage: View {
  var body: some View {
    GeometryReader { proxy in
      let width = proxy.size.width
      let height = proxy.size.height

      ZStack {
        LinearGradient(
          colors: [
            AuthPalette.slate,
            Color(red: 0.03, green: 0.04, blue: 0.06),
          ],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        )

        collagePanel(
          title: "NOIR",
          subtitle: "11:24 PM",
          icon: "moon.stars.fill",
          colors: [Color(red: 0.10, green: 0.14, blue: 0.20), Color(red: 0.54, green: 0.58, blue: 0.65)],
          width: width * 0.52,
          height: height * 0.36
        )
        .rotationEffect(.degrees(-12))
        .offset(x: -width * 0.24, y: -height * 0.25)

        collagePanel(
          title: "35MM",
          subtitle: "OPENING NIGHT",
          icon: "sparkles",
          colors: [AuthPalette.socialAccent, Color(red: 0.08, green: 0.39, blue: 0.78)],
          width: width * 0.58,
          height: height * 0.38
        )
        .rotationEffect(.degrees(10))
        .offset(x: width * 0.22, y: -height * 0.22)

        collagePanel(
          title: "SCI-FI",
          subtitle: "4.5 STARS",
          icon: "orbit",
          colors: [Color(red: 0.12, green: 0.32, blue: 0.52), Color(red: 0.17, green: 0.66, blue: 0.75)],
          width: width * 0.50,
          height: height * 0.34
        )
        .rotationEffect(.degrees(8))
        .offset(x: -width * 0.26, y: height * 0.02)

        collagePanel(
          title: "ROMANCE",
          subtitle: "REWATCH",
          icon: "heart.fill",
          colors: [Color(red: 0.48, green: 0.10, blue: 0.18), Color(red: 0.92, green: 0.37, blue: 0.47)],
          width: width * 0.54,
          height: height * 0.34
        )
        .rotationEffect(.degrees(-8))
        .offset(x: width * 0.26, y: height * 0.10)

        VStack(spacing: 9) {
          Image(systemName: "film.stack.fill")
            .font(.system(size: min(width, height) * 0.17, weight: .black))

          Text("WATCHLIST")
            .font(.system(size: 13, weight: .black, design: .rounded))
            .tracking(1.5)
        }
        .foregroundStyle(.white)
        .padding(24)
        .background(
          Circle()
            .fill(AuthPalette.ink)
            .shadow(color: .black.opacity(0.28), radius: 26, y: 14)
        )

        FilmStrip()
          .stroke(.white.opacity(0.58), style: StrokeStyle(lineWidth: 8, lineCap: .round))
          .frame(width: width * 1.12, height: height * 0.48)
          .rotationEffect(.degrees(-18))
          .offset(y: height * 0.27)
      }
    }
  }

  private func collagePanel(
    title: String,
    subtitle: String,
    icon: String,
    colors: [Color],
    width: CGFloat,
    height: CGFloat
  ) -> some View {
    RoundedRectangle(cornerRadius: 30, style: .continuous)
      .fill(
        LinearGradient(
          colors: colors,
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        )
      )
      .frame(width: width, height: height)
      .overlay(alignment: .topLeading) {
        VStack(alignment: .leading, spacing: 7) {
          Image(systemName: icon)
            .font(.system(size: 28, weight: .bold))

          Spacer()

          Text(title)
            .font(.system(size: 26, weight: .black, design: .rounded))
            .minimumScaleFactor(0.72)
            .lineLimit(1)

          Text(subtitle)
            .font(.system(size: 10, weight: .heavy, design: .rounded))
            .tracking(1.1)
            .opacity(0.76)
        }
        .foregroundStyle(.white)
        .padding(20)
      }
      .overlay {
        RoundedRectangle(cornerRadius: 30, style: .continuous)
          .stroke(.white.opacity(0.24), lineWidth: 1)
      }
      .shadow(color: .black.opacity(0.24), radius: 22, y: 14)
  }
}

private struct FilmStrip: Shape {
  func path(in rect: CGRect) -> Path {
    var path = Path()
    path.move(to: CGPoint(x: rect.minX, y: rect.midY))
    path.addCurve(
      to: CGPoint(x: rect.maxX, y: rect.midY),
      control1: CGPoint(x: rect.midX * 0.55, y: rect.minY),
      control2: CGPoint(x: rect.midX * 1.28, y: rect.maxY)
    )
    return path
  }
}

struct AuthHeadline: View {
  let title: String
  let subtitle: String

  var body: some View {
    VStack(spacing: 10) {
      Text(title)
        .font(.system(size: 41, weight: .black, design: .serif))
        .foregroundStyle(AuthPalette.ink)
        .multilineTextAlignment(.center)
        .lineSpacing(-2)
        .minimumScaleFactor(0.75)

      Text(subtitle)
        .font(.system(size: 15, weight: .medium, design: .rounded))
        .foregroundStyle(AuthPalette.ink.opacity(0.62))
        .multilineTextAlignment(.center)
        .lineSpacing(4)
        .padding(.horizontal, 10)
    }
  }
}

struct AuthNavigationPill: View {
  enum Variant {
    case primary
    case secondary
  }

  let title: String
  var systemImage: String?
  var variant: Variant

  var body: some View {
    HStack(spacing: 10) {
      if let systemImage {
        Image(systemName: systemImage)
          .font(.system(size: 15, weight: .black))
      }

      Text(title)
        .font(.system(size: 16, weight: .black, design: .rounded))
    }
    .frame(maxWidth: .infinity)
    .frame(height: 62)
    .foregroundStyle(variant == .primary ? .white : AuthPalette.ink)
    .background {
      Capsule()
        .fill(variant == .primary ? AuthPalette.ink : .white)
        .shadow(
          color: variant == .primary ? .black.opacity(0.20) : .black.opacity(0.08),
          radius: variant == .primary ? 18 : 10,
          y: variant == .primary ? 10 : 5
        )
    }
    .overlay {
      Capsule()
        .stroke(
          variant == .primary ? .clear : AuthPalette.ink.opacity(0.10),
          lineWidth: 1
        )
    }
  }
}

struct AuthActionButton: View {
  let title: String
  let isLoading: Bool
  var isDisabled = false
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 10) {
        if isLoading {
          ProgressView()
            .tint(.white)
        } else {
          Image(systemName: "arrow.right")
            .font(.system(size: 15, weight: .black))
        }

        Text(title)
          .font(.system(size: 16, weight: .black, design: .rounded))
      }
      .frame(maxWidth: .infinity)
      .frame(height: 62)
      .foregroundStyle(.white)
      .background(AuthPalette.ink, in: Capsule())
      .shadow(color: .black.opacity(isLoading || isDisabled ? 0 : 0.20), radius: 18, y: 10)
    }
    .disabled(isLoading || isDisabled)
    .opacity(isLoading || isDisabled ? 0.58 : 1)
  }
}

struct AuthEmailField: View {
  let title: String
  @Binding var text: String

  var body: some View {
    AuthInputShell(title: title, systemImage: "envelope.fill") {
      TextField(title, text: $text)
        .textContentType(.emailAddress)
        .keyboardType(.emailAddress)
        .textInputAutocapitalization(.never)
        .autocorrectionDisabled()
    }
  }
}

struct AuthNameField: View {
  let title: String
  @Binding var text: String

  var body: some View {
    AuthInputShell(title: title, systemImage: "person.fill") {
      TextField(title, text: $text)
        .textContentType(.name)
        .textInputAutocapitalization(.words)
    }
  }
}

struct AuthUsernameField: View {
  let title: String
  @Binding var text: String
  var trailingStatus: String?
  var statusColor: Color = AuthPalette.ink.opacity(0.54)

  var body: some View {
    AuthInputShell(title: title, systemImage: "at") {
      HStack(spacing: 8) {
        Text("35mm/")
          .font(.system(size: 15, weight: .bold, design: .rounded))
          .foregroundStyle(AuthPalette.ink.opacity(0.36))

        TextField(title, text: $text)
          .textContentType(.username)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()

        if let trailingStatus, !trailingStatus.isEmpty {
          Text(trailingStatus)
            .font(.system(size: 11, weight: .black, design: .rounded))
            .foregroundStyle(statusColor)
            .lineLimit(1)
            .minimumScaleFactor(0.75)
        }
      }
    }
  }
}

struct AuthPasswordField: View {
  enum ContentType {
    case password
    case newPassword
  }

  let title: String
  @Binding var text: String
  var contentType: ContentType = .password

  var body: some View {
    AuthInputShell(title: title, systemImage: "lock.fill") {
      switch contentType {
      case .password:
        SecureField(title, text: $text)
          .textContentType(.password)
      case .newPassword:
        SecureField(title, text: $text)
          .textContentType(.newPassword)
      }
    }
  }
}

struct AuthCodeField: View {
  let title: String
  @Binding var text: String

  var body: some View {
    AuthInputShell(title: title, systemImage: "number") {
      TextField(title, text: $text)
        .textContentType(.oneTimeCode)
        .keyboardType(.numberPad)
    }
  }
}

private struct AuthInputShell<Field: View>: View {
  let title: String
  let systemImage: String
  let field: Field

  init(
    title: String,
    systemImage: String,
    @ViewBuilder field: () -> Field
  ) {
    self.title = title
    self.systemImage = systemImage
    self.field = field()
  }

  var body: some View {
    HStack(spacing: 14) {
      Image(systemName: systemImage)
        .font(.system(size: 15, weight: .bold))
        .foregroundStyle(AuthPalette.socialAccent)
        .frame(width: 22)

      field
        .font(.system(size: 16, weight: .semibold, design: .rounded))
        .foregroundStyle(AuthPalette.ink)
        .submitLabel(.done)
    }
    .padding(.horizontal, 18)
    .frame(height: 58)
    .background(.white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    .overlay {
      RoundedRectangle(cornerRadius: 20, style: .continuous)
        .stroke(AuthPalette.ink.opacity(0.08), lineWidth: 1)
    }
    .shadow(color: .black.opacity(0.06), radius: 14, y: 8)
    .accessibilityLabel(title)
  }
}

struct AuthErrorBanner: View {
  let message: String

  var body: some View {
    HStack(alignment: .top, spacing: 10) {
      Image(systemName: "exclamationmark.triangle.fill")
        .foregroundStyle(AuthPalette.error)

      Text(message)
        .font(.system(size: 13, weight: .semibold, design: .rounded))
        .foregroundStyle(AuthPalette.ink.opacity(0.74))
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(14)
    .background(AuthPalette.error.opacity(0.10), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
  }
}

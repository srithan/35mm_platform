import SwiftUI

enum AuthPalette {
  static let ink = Color(uiColor: .label)
  static let paper = Color(uiColor: .systemBackground)
  static let socialAccent = Color(uiColor: .systemBlue)
  static let error = Color(uiColor: .systemRed)
  static let field = Color(uiColor: .secondarySystemBackground)
  static let fieldBorder = Color(uiColor: .separator)
  static let reelGold = Color(red: 0.96, green: 0.76, blue: 0.16)
  static let slate = Color.black
  static let mist = Color(red: 0.92, green: 0.92, blue: 0.92)
}

struct AuthScreenBackground: View {
  var body: some View {
    AuthPalette.paper
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
            .font(.system(size: 28, weight: .bold))
            .foregroundStyle(AuthPalette.ink)
            .padding(.horizontal, 18)
            .padding(.vertical, 9)
            .background(.ultraThinMaterial, in: Capsule())

          Text("Cinema, social.")
            .font(.system(size: 14, weight: .bold))
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
            .font(.system(size: 13, weight: .black))
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
            .font(.system(size: 26, weight: .black))
            .minimumScaleFactor(0.72)
            .lineLimit(1)

          Text(subtitle)
            .font(.system(size: 10, weight: .heavy))
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
  var alignment: HorizontalAlignment = .center

  private var textAlignment: TextAlignment {
    alignment == .leading ? .leading : .center
  }

  var body: some View {
    VStack(alignment: alignment, spacing: 10) {
      Text(title)
        .font(.system(size: 34, weight: .bold))
        .foregroundStyle(AuthPalette.ink)
        .multilineTextAlignment(textAlignment)
        .lineSpacing(0)
        .minimumScaleFactor(0.75)

      Text(subtitle)
        .font(.system(size: 16, weight: .regular))
        .foregroundStyle(AuthPalette.ink.opacity(0.62))
        .multilineTextAlignment(textAlignment)
        .lineSpacing(3)
    }
    .frame(maxWidth: .infinity, alignment: alignment == .leading ? .leading : .center)
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
        .font(.system(size: 16, weight: .semibold))
    }
    .frame(maxWidth: .infinity)
    .frame(height: 62)
    .foregroundStyle(variant == .primary ? AuthPalette.paper : AuthPalette.ink)
    .background {
      Capsule()
        .fill(variant == .primary ? AuthPalette.ink : AuthPalette.field)
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
            .tint(AuthPalette.paper)
        }

        Text(title)
          .font(.system(size: 16, weight: .semibold))

        if !isLoading {
          Image(systemName: "arrow.right")
            .font(.system(size: 15, weight: .black))
            .accessibilityHidden(true)
        }
      }
      .frame(maxWidth: .infinity)
      .frame(height: 62)
      .foregroundStyle(AuthPalette.paper)
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
    AuthInputShell(title: title) {
      TextField(title, text: $text)
        .textContentType(.emailAddress)
        .keyboardType(.emailAddress)
        .textInputAutocapitalization(.never)
        .autocorrectionDisabled()
    }
  }
}

struct AuthIdentifierField: View {
  let title: String
  @Binding var text: String
  var showsLabel = false

  private var placeholder: String {
    showsLabel ? "Your email or username" : title
  }

  var body: some View {
    AuthInputShell(title: title, showsLabel: showsLabel) {
      TextField(placeholder, text: $text)
        .textContentType(.username)
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
    AuthInputShell(title: title) {
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
    AuthInputShell(title: title) {
      HStack(spacing: 8) {
        Text("35mm/")
          .font(.system(size: 15, weight: .semibold))
          .foregroundStyle(AuthPalette.ink.opacity(0.36))

        TextField(title, text: $text)
          .textContentType(.username)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()

        if let trailingStatus, !trailingStatus.isEmpty {
          Text(trailingStatus)
            .font(.system(size: 11, weight: .semibold))
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
  var showsLabel = false
  @State private var isRevealed = false

  private var placeholder: String {
    showsLabel ? "Your password" : title
  }

  var body: some View {
    AuthInputShell(title: title, showsLabel: showsLabel) {
      HStack(spacing: 8) {
        Group {
          if isRevealed {
            TextField(placeholder, text: $text)
          } else {
            SecureField(placeholder, text: $text)
          }
        }
        .textContentType(contentType == .password ? .password : .newPassword)

        Button {
          isRevealed.toggle()
        } label: {
          Label(
            isRevealed ? "Hide password" : "Show password",
            systemImage: isRevealed ? "eye.slash.fill" : "eye.fill"
          )
          .labelStyle(.iconOnly)
        }
        .foregroundStyle(AuthPalette.ink.opacity(0.42))
        .accessibilityValue(isRevealed ? "Visible" : "Hidden")
      }
    }
  }
}

struct AuthDateField: View {
  let title: String
  @Binding var date: Date
  @State private var isPickerPresented = false

  private var dateRange: ClosedRange<Date> {
    let calendar = Calendar.current
    let start = calendar.date(from: DateComponents(year: 1900, month: 1, day: 1)) ?? .distantPast
    return start...Date.now
  }

  private var formattedDate: String {
    date.formatted(.dateTime.month(.wide).day().year())
  }

  var body: some View {
    Button {
      isPickerPresented = true
    } label: {
      Text(formattedDate)
        .font(.system(size: 24, weight: .regular))
        .foregroundStyle(AuthPalette.ink)
        .frame(maxWidth: .infinity, minHeight: 66, alignment: .leading)
        .padding(.horizontal, 22)
        .background(AuthPalette.fieldBorder.opacity(0.75), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
    .buttonStyle(.plain)
    .accessibilityLabel(title)
    .accessibilityValue(formattedDate)
    .sheet(isPresented: $isPickerPresented) {
      VStack(spacing: 0) {
        HStack {
          Spacer()
          Button("Done") {
            isPickerPresented = false
          }
          .font(.system(size: 18, weight: .semibold))
          .foregroundStyle(AuthPalette.ink)
          .padding(.horizontal, 24)
          .padding(.vertical, 18)
        }
        .background(AuthPalette.field)

        DatePicker(
          title,
          selection: $date,
          in: dateRange,
          displayedComponents: [.date]
        )
        .datePickerStyle(.wheel)
        .labelsHidden()
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 18)
        .padding(.bottom, 26)
        .background(AuthPalette.paper)
      }
      .presentationDetents([.height(360)])
      .presentationDragIndicator(.hidden)
      .presentationBackground(AuthPalette.paper)
    }
  }
}

struct AuthCodeField: View {
  let title: String
  @Binding var text: String

  var body: some View {
    AuthInputShell(title: title) {
      TextField(title, text: $text)
        .textContentType(.oneTimeCode)
        .keyboardType(.numberPad)
    }
  }
}

private struct AuthInputShell<Field: View>: View {
  let title: String
  var showsLabel = false
  let field: Field

  init(
    title: String,
    showsLabel: Bool = false,
    @ViewBuilder field: () -> Field
  ) {
    self.title = title
    self.showsLabel = showsLabel
    self.field = field()
  }

  var body: some View {
    VStack(alignment: .leading, spacing: showsLabel ? 9 : 0) {
      if showsLabel {
        Text(title)
          .font(.body.weight(.semibold))
          .foregroundStyle(AuthPalette.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.82)
      }

      HStack(spacing: 0) {
        field
          .font(.system(size: 16, weight: .regular))
          .foregroundStyle(AuthPalette.ink)
          .submitLabel(.done)
      }
      .padding(.horizontal, 18)
      .frame(height: 58)
      .background(AuthPalette.field, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
      .overlay {
        RoundedRectangle(cornerRadius: 8, style: .continuous)
          .stroke(AuthPalette.fieldBorder, lineWidth: 1)
      }
    }
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
        .font(.system(size: 13, weight: .regular))
        .foregroundStyle(AuthPalette.ink.opacity(0.74))
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(14)
    .background(AuthPalette.error.opacity(0.10), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
  }
}

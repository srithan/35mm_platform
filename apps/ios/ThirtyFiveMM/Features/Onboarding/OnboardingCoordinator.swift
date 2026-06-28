import SwiftUI

private let onboardingSignOutTitle = "Sign out"
private let onboardingContinueTitle = "Continue"
private let onboardingFinishTitle = "Let's go"

private enum OnboardingStep: Int, CaseIterable {
  case role
  case genres
  case people
}

private struct RoleChoice: Identifiable, Equatable {
  let id: String
  let label: String
  let symbol: String
  let description: String
}

private let roleChoices = [
  RoleChoice(
    id: "cinephile",
    label: "Cinephile",
    symbol: "movieclapper.fill",
    description: "I watch, log, and live for film"
  ),
  RoleChoice(
    id: "creator",
    label: "Creator",
    symbol: "video.fill",
    description: "I make films"
  ),
  RoleChoice(
    id: "critic",
    label: "Critic",
    symbol: "pencil.and.scribble",
    description: "I write about film"
  ),
  RoleChoice(
    id: "film_student",
    label: "Film Student",
    symbol: "graduationcap.fill",
    description: "I am learning the craft"
  ),
  RoleChoice(
    id: "industry",
    label: "Industry",
    symbol: "briefcase.fill",
    description: "I work in the business"
  ),
]

private let genreLabels = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "War",
  "Western",
  "Foreign",
  "Arthouse",
  "Cult Classic",
  "Silent Film",
  "Short Film",
]

struct OnboardingCoordinator: View {
  @EnvironmentObject private var env: AppEnvironment
  @State private var step: OnboardingStep = .role
  @State private var selectedRole: RoleChoice?
  @State private var headlineContext = ""
  @State private var selectedGenreIds = Set<String>()
  @State private var selectedFollowIds = Set<String>()
  @State private var suggestions = [OnboardingSuggestionUser]()
  @State private var isLoadingSuggestions = false
  @State private var isSubmitting = false
  @State private var isSigningOut = false
  @State private var error: String?

  var body: some View {
    GeometryReader { proxy in
      ScrollView(showsIndicators: false) {
        VStack(spacing: 22) {
          header

          VStack(alignment: .leading, spacing: 18) {
            OnboardingProgress(step: step)

            VStack(alignment: .leading, spacing: 8) {
              Text(stepTitle)
                .font(.system(size: 34, weight: .black, design: .serif))
                .foregroundStyle(AuthPalette.ink)
                .lineSpacing(-2)

              Text(stepSubtitle)
                .font(.system(size: 15, weight: .medium, design: .rounded))
                .foregroundStyle(AuthPalette.ink.opacity(0.64))
            }

            stepContent

            if let error {
              AuthErrorBanner(message: error)
            }

            footerActions
          }
          .padding(22)
          .background(.white.opacity(0.78), in: RoundedRectangle(cornerRadius: 28, style: .continuous))
          .overlay {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
              .stroke(AuthPalette.ink.opacity(0.08), lineWidth: 1)
          }
          .shadow(color: .black.opacity(0.08), radius: 24, y: 14)
        }
        .padding(.horizontal, 20)
        .padding(.top, 18)
        .padding(.bottom, 56)
        .frame(maxWidth: 620)
        .frame(minHeight: proxy.size.height, alignment: .center)
        .frame(maxWidth: .infinity)
      }
      .scrollDismissesKeyboard(.interactively)
      .background(AuthScreenBackground())
      .task(id: step) {
        if step == .people {
          await loadSuggestions()
        }
      }
    }
  }

  private var header: some View {
    HStack {
      VStack(alignment: .leading, spacing: 4) {
        Text(AppConstants.appName)
          .font(.system(size: 25, weight: .black, design: .serif))
          .foregroundStyle(AuthPalette.ink)

        Text("Set up your film feed.")
          .font(.system(size: 13, weight: .bold, design: .rounded))
          .foregroundStyle(AuthPalette.ink.opacity(0.56))
      }

      Spacer()

      Button {
        signOut()
      } label: {
        if isSigningOut {
          ProgressView()
            .tint(AuthPalette.ink)
        } else {
          Image(systemName: "rectangle.portrait.and.arrow.right")
            .font(.system(size: 16, weight: .bold))
        }
      }
      .frame(width: 44, height: 44)
      .foregroundStyle(AuthPalette.ink)
      .background(.white, in: Circle())
      .overlay {
        Circle().stroke(AuthPalette.ink.opacity(0.10), lineWidth: 1)
      }
      .disabled(isSigningOut)
      .accessibilityLabel(onboardingSignOutTitle)
    }
  }

  @ViewBuilder
  private var stepContent: some View {
    switch step {
    case .role:
      roleStep
    case .genres:
      genreStep
    case .people:
      peopleStep
    }
  }

  private var roleStep: some View {
    VStack(spacing: 12) {
      LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
        ForEach(roleChoices) { choice in
          RoleCard(choice: choice, isSelected: selectedRole == choice) {
            selectedRole = choice
            error = nil
          }
        }
      }

      if selectedRole?.id != "cinephile", selectedRole != nil {
        TextField("Add context... (25 chars max)", text: $headlineContext)
          .font(.system(size: 15, weight: .semibold, design: .rounded))
          .textInputAutocapitalization(.words)
          .padding(.horizontal, 16)
          .frame(height: 52)
          .background(.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
          .overlay {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
              .stroke(AuthPalette.ink.opacity(0.10), lineWidth: 1)
          }
          .onChange(of: headlineContext) { _, value in
            if value.count > 25 {
              headlineContext = String(value.prefix(25))
            }
          }
      }
    }
  }

  private var genreStep: some View {
    VStack(alignment: .leading, spacing: 14) {
      FlowLayout(spacing: 8) {
        ForEach(genreLabels, id: \.self) { label in
          let slug = slugifyGenre(label)
          let selected = selectedGenreIds.contains(slug)

          Button {
            toggleGenre(slug)
          } label: {
            Text(label)
              .font(.system(size: 14, weight: .black, design: .rounded))
              .foregroundStyle(selected ? .white : AuthPalette.ink.opacity(0.70))
              .padding(.horizontal, 14)
              .frame(height: 38)
              .background(
                selected ? AuthPalette.ink : .white,
                in: Capsule()
              )
              .overlay {
                Capsule().stroke(AuthPalette.ink.opacity(selected ? 0 : 0.12), lineWidth: 1)
              }
          }
        }
      }

      Text("\(selectedGenreIds.count)/10 selected")
        .font(.system(size: 12, weight: .bold, design: .rounded))
        .foregroundStyle(AuthPalette.ink.opacity(0.52))
    }
  }

  private var peopleStep: some View {
    VStack(spacing: 12) {
      HStack {
        Text("\(selectedFollowIds.count) selected")
          .font(.system(size: 12, weight: .bold, design: .rounded))
          .foregroundStyle(AuthPalette.ink.opacity(0.52))

        Spacer()

        Button {
          selectedFollowIds = Set(suggestions.map(\.id))
        } label: {
          Text("Follow all")
            .font(.system(size: 12, weight: .black, design: .rounded))
            .foregroundStyle(AuthPalette.socialAccent)
        }
        .disabled(suggestions.isEmpty)
      }

      if isLoadingSuggestions {
        HStack(spacing: 10) {
          ProgressView()
          Text("Loading suggestions...")
            .font(.system(size: 14, weight: .semibold, design: .rounded))
            .foregroundStyle(AuthPalette.ink.opacity(0.62))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 28)
      } else if suggestions.isEmpty {
        Text("No suggestions yet. You can finish now and find people later.")
          .font(.system(size: 14, weight: .semibold, design: .rounded))
          .foregroundStyle(AuthPalette.ink.opacity(0.62))
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(16)
          .background(.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
      } else {
        VStack(spacing: 10) {
          ForEach(suggestions) { person in
            SuggestedFollowRow(
              person: person,
              isSelected: selectedFollowIds.contains(person.id)
            ) {
              toggleFollow(person.id)
            }
          }
        }
      }
    }
  }

  private var footerActions: some View {
    VStack(spacing: 12) {
      AuthActionButton(
        title: step == .people ? onboardingFinishTitle : onboardingContinueTitle,
        isLoading: isSubmitting,
        isDisabled: step == .role && selectedRole == nil
      ) {
        advance()
      }

      if step != .role {
        Button {
          advance()
        } label: {
          Text(step == .people ? "Skip, I'll find people later" : "Skip for now")
            .font(.system(size: 13, weight: .black, design: .rounded))
            .foregroundStyle(AuthPalette.ink.opacity(0.54))
        }
        .disabled(isSubmitting)
      }
    }
  }

  private var stepTitle: String {
    switch step {
    case .role:
      return "What's your relationship with film?"
    case .genres:
      return "What do you love watching?"
    case .people:
      return "Follow some people to get started"
    }
  }

  private var stepSubtitle: String {
    switch step {
    case .role:
      return "This shapes your experience on 35mm."
    case .genres:
      return "Pick up to 10 genres so discover starts with your taste."
    case .people:
      return "Your feed gets better once it has voices to learn from."
    }
  }

  private func advance() {
    error = nil

    switch step {
    case .role:
      guard selectedRole != nil else { return }
      withAnimation(.snappy(duration: 0.28)) {
        step = .genres
      }
    case .genres:
      withAnimation(.snappy(duration: 0.28)) {
        step = .people
      }
    case .people:
      Task {
        await submitOnboarding()
      }
    }
  }

  private func toggleGenre(_ slug: String) {
    if selectedGenreIds.contains(slug) {
      selectedGenreIds.remove(slug)
    } else if selectedGenreIds.count < 10 {
      selectedGenreIds.insert(slug)
    }
  }

  private func toggleFollow(_ userId: String) {
    if selectedFollowIds.contains(userId) {
      selectedFollowIds.remove(userId)
    } else {
      selectedFollowIds.insert(userId)
    }
  }

  private func loadSuggestions() async {
    guard suggestions.isEmpty else { return }
    isLoadingSuggestions = true

    do {
      let response: OnboardingSuggestionsResponse = try await env.apiClient.request(
        .getOnboardingSuggestions()
      )
      suggestions = response.users
    } catch {
      self.error = error.localizedDescription
    }

    isLoadingSuggestions = false
  }

  private func submitOnboarding() async {
    guard let selectedRole, !isSubmitting else { return }
    isSubmitting = true
    error = nil

    do {
      let trimmedContext = headlineContext.trimmingCharacters(in: .whitespacesAndNewlines)
      let request = SubmitOnboardingRequest(
        role: selectedRole.id,
        headlineContext: selectedRole.id == "cinephile"
          ? nil
          : trimmedContext.isEmpty ? nil : trimmedContext,
        favoriteFilmIds: [],
        favoriteGenreIds: Array(selectedGenreIds),
        followUserIds: Array(selectedFollowIds)
      )
      let _: OnboardingSubmitResponse = try await env.apiClient.request(
        .submitOnboarding(request)
      )
      await env.authManager.refreshAfterOnboarding()
    } catch {
      self.error = error.localizedDescription
    }

    isSubmitting = false
  }

  private func signOut() {
    isSigningOut = true
    error = nil

    Task {
      do {
        try await env.authManager.signOut()
      } catch {
        self.error = error.localizedDescription
      }

      isSigningOut = false
    }
  }
}

private struct OnboardingProgress: View {
  let step: OnboardingStep

  var body: some View {
    HStack(spacing: 8) {
      ForEach(OnboardingStep.allCases, id: \.self) { item in
        Capsule()
          .fill(item.rawValue <= step.rawValue ? AuthPalette.ink : AuthPalette.ink.opacity(0.14))
          .frame(width: item == step ? 28 : 9, height: 9)
      }
    }
    .animation(.snappy(duration: 0.24), value: step)
  }
}

private struct RoleCard: View {
  let choice: RoleChoice
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      VStack(alignment: .leading, spacing: 9) {
        Image(systemName: choice.symbol)
          .font(.system(size: 20, weight: .bold))
          .foregroundStyle(isSelected ? .white : AuthPalette.socialAccent)

        Text(choice.label)
          .font(.system(size: 15, weight: .black, design: .rounded))
          .foregroundStyle(isSelected ? .white : AuthPalette.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.78)

        Text(choice.description)
          .font(.system(size: 12, weight: .semibold, design: .rounded))
          .foregroundStyle(isSelected ? .white.opacity(0.78) : AuthPalette.ink.opacity(0.58))
          .lineLimit(2)
          .multilineTextAlignment(.leading)
      }
      .frame(maxWidth: .infinity, minHeight: 132, alignment: .topLeading)
      .padding(14)
      .background(isSelected ? AuthPalette.ink : .white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
      .overlay {
        RoundedRectangle(cornerRadius: 20, style: .continuous)
          .stroke(isSelected ? AuthPalette.ink : AuthPalette.ink.opacity(0.10), lineWidth: 1)
      }
    }
  }
}

private struct SuggestedFollowRow: View {
  let person: OnboardingSuggestionUser
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    HStack(spacing: 12) {
      AsyncImage(url: person.avatarUrl.flatMap(URL.init(string:))) { phase in
        switch phase {
        case .success(let image):
          image.resizable().scaledToFill()
        default:
          ZStack {
            Circle().fill(AuthPalette.mist)
            Text(String(person.displayName.prefix(1)).uppercased())
              .font(.system(size: 17, weight: .black, design: .rounded))
              .foregroundStyle(AuthPalette.ink.opacity(0.64))
          }
        }
      }
      .frame(width: 48, height: 48)
      .clipShape(Circle())

      VStack(alignment: .leading, spacing: 3) {
        Text(person.displayName)
          .font(.system(size: 15, weight: .black, design: .rounded))
          .foregroundStyle(AuthPalette.ink)
          .lineLimit(1)

        Text("@\(person.username)")
          .font(.system(size: 12, weight: .bold, design: .rounded))
          .foregroundStyle(AuthPalette.ink.opacity(0.52))
          .lineLimit(1)

        if let role = person.role {
          Text(role)
            .font(.system(size: 11, weight: .semibold, design: .rounded))
            .foregroundStyle(AuthPalette.ink.opacity(0.42))
            .lineLimit(1)
        }
      }

      Spacer()

      Button(action: action) {
        Text(isSelected ? "Following" : "Follow")
          .font(.system(size: 12, weight: .black, design: .rounded))
          .foregroundStyle(isSelected ? .white : AuthPalette.ink)
          .padding(.horizontal, 13)
          .frame(height: 34)
          .background(isSelected ? AuthPalette.ink : .white, in: Capsule())
          .overlay {
            Capsule().stroke(AuthPalette.ink.opacity(isSelected ? 0 : 0.12), lineWidth: 1)
          }
      }
    }
    .padding(12)
    .background(.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    .overlay {
      RoundedRectangle(cornerRadius: 18, style: .continuous)
        .stroke(AuthPalette.ink.opacity(0.08), lineWidth: 1)
    }
  }
}

private struct FlowLayout: Layout {
  var spacing: CGFloat

  func sizeThatFits(
    proposal: ProposedViewSize,
    subviews: Subviews,
    cache: inout ()
  ) -> CGSize {
    let maxWidth = proposal.width ?? 320
    let rows = rows(for: subviews, maxWidth: maxWidth)
    return CGSize(width: maxWidth, height: rows.reduce(0) { $0 + $1.height } + CGFloat(max(0, rows.count - 1)) * spacing)
  }

  func placeSubviews(
    in bounds: CGRect,
    proposal: ProposedViewSize,
    subviews: Subviews,
    cache: inout ()
  ) {
    var x = bounds.minX
    var y = bounds.minY
    var rowHeight: CGFloat = 0

    for subview in subviews {
      let size = subview.sizeThatFits(.unspecified)

      if x > bounds.minX && x + size.width > bounds.maxX {
        x = bounds.minX
        y += rowHeight + spacing
        rowHeight = 0
      }

      subview.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
      x += size.width + spacing
      rowHeight = max(rowHeight, size.height)
    }
  }

  private func rows(for subviews: Subviews, maxWidth: CGFloat) -> [(width: CGFloat, height: CGFloat)] {
    var rows = [(width: CGFloat, height: CGFloat)]()
    var rowWidth: CGFloat = 0
    var rowHeight: CGFloat = 0

    for subview in subviews {
      let size = subview.sizeThatFits(.unspecified)
      let nextWidth = rowWidth == 0 ? size.width : rowWidth + spacing + size.width

      if rowWidth > 0 && nextWidth > maxWidth {
        rows.append((rowWidth, rowHeight))
        rowWidth = size.width
        rowHeight = size.height
      } else {
        rowWidth = nextWidth
        rowHeight = max(rowHeight, size.height)
      }
    }

    if rowWidth > 0 {
      rows.append((rowWidth, rowHeight))
    }

    return rows
  }
}

private func slugifyGenre(_ label: String) -> String {
  let lowered = label.lowercased()
  var output = ""
  var previousWasDash = false

  for scalar in lowered.unicodeScalars {
    if CharacterSet.alphanumerics.contains(scalar) {
      output.unicodeScalars.append(scalar)
      previousWasDash = false
    } else if !previousWasDash {
      output.append("-")
      previousWasDash = true
    }
  }

  return output.trimmingCharacters(in: CharacterSet(charactersIn: "-"))
}

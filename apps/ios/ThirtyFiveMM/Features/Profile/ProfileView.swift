import SwiftUI

struct ProfileDestination: Hashable {
  let username: String

  init(username: String) {
    self.username = username
      .trimmingCharacters(in: .whitespacesAndNewlines)
      .lowercased()
  }
}

struct ProfileView: View {
  @Environment(\.theme) private var theme
  @Environment(\.accessibilityReduceMotion) private var accessibilityReduceMotion

  private let service: any ProfileServicing
  private let showsBackButton: Bool
  private let headerProfile: UserProfile?
  private let headerProfileLoadError: String?
  private let canOpenMessages: Bool
  private let onProfileTapped: () -> Void
  private let onMessagesTapped: () -> Void
  private let onCurrentProfileUpdated: (PublicProfile) -> Void
  private let onScrollDirectionChange: (ScrollChromeDirection) -> Void
  let model: ProfileViewModel
  @State private var isHeaderVisible = true

  init(
    model: ProfileViewModel,
    service: any ProfileServicing,
    showsBackButton: Bool = true,
    headerProfile: UserProfile? = nil,
    headerProfileLoadError: String? = nil,
    canOpenMessages: Bool = false,
    onProfileTapped: @escaping () -> Void = {},
    onMessagesTapped: @escaping () -> Void = {},
    onCurrentProfileUpdated: @escaping (PublicProfile) -> Void = { _ in },
    onScrollDirectionChange: @escaping (ScrollChromeDirection) -> Void = { _ in }
  ) {
    self.model = model
    self.service = service
    self.showsBackButton = showsBackButton
    self.headerProfile = headerProfile
    self.headerProfileLoadError = headerProfileLoadError
    self.canOpenMessages = canOpenMessages
    self.onProfileTapped = onProfileTapped
    self.onMessagesTapped = onMessagesTapped
    self.onCurrentProfileUpdated = onCurrentProfileUpdated
    self.onScrollDirectionChange = onScrollDirectionChange
  }

  var body: some View {
    VStack(spacing: 0) {
      navigationHeader
      .frame(height: isHeaderVisible ? navigationHeaderHeight : 0, alignment: .top)
      .opacity(isHeaderVisible ? 1 : 0)
      .clipped()
      .allowsHitTesting(isHeaderVisible)
      .accessibilityHidden(!isHeaderVisible)

      Group {
        switch model.screenPhase {
        case .loading:
          ProfileLoadingSkeletonView()
        case .failure(let error):
          ContentUnavailableView {
            Label("Couldn't load profile", systemImage: "person.crop.circle.badge.exclamationmark")
          } description: {
            Text(error)
          } actions: {
            Button("Try again") {
              Task { await model.load() }
            }
            .buttonStyle(.borderedProminent)
          }
        case .blocked:
          ContentUnavailableView(
            "Profile blocked",
            systemImage: "person.crop.circle.badge.xmark",
            description: Text("This account can no longer view or interact with you.")
          )
        case .content(let profile):
          ProfileLoadedView(
            profile: profile,
            model: model,
            service: service,
            onCurrentProfileUpdated: onCurrentProfileUpdated,
            onScrollDirectionChange: handleScrollDirection
          )
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .background(theme.bg)
    .navigationTitle(navigationHeaderTitle)
    .toolbar(.hidden, for: .navigationBar)
    .task {
      await model.load()
    }
  }

  @ViewBuilder
  private var navigationHeader: some View {
    AppHeader(
      title: .text(navigationHeaderTitle),
      profile: headerProfile,
      profileLoadError: headerProfileLoadError,
      canOpenMessages: canOpenMessages,
      onProfileTapped: onProfileTapped,
      onMessagesTapped: onMessagesTapped
    )
  }

  private var navigationHeaderHeight: CGFloat {
    AppChromeMetrics.homeHeaderHeight
  }

  private var navigationHeaderTitle: String {
    Self.navigationHeaderTitle(
      profile: model.profile,
      username: model.username,
      showsBackButton: showsBackButton
    )
  }

  static func navigationHeaderTitle(
    profile: PublicProfile?,
    username: String,
    showsBackButton: Bool
  ) -> String {
    if let profile {
      return profile.isOwnProfile ? "Profile" : "@\(profile.username)"
    }
    return showsBackButton ? "@\(username)" : "Profile"
  }

  private func handleScrollDirection(_ direction: ScrollChromeDirection) {
    onScrollDirectionChange(direction)
    withAnimation(chromeAnimation) {
      isHeaderVisible = direction != .down
    }
  }

  private var chromeAnimation: Animation? {
    accessibilityReduceMotion
      ? nil
      : .timingCurve(0.32, 0.72, 0, 1, duration: 0.26)
  }
}

private struct ProfileLoadingSkeletonView: View {
  @Environment(\.theme) private var theme

  var body: some View {
    ScrollView {
      VStack(spacing: 0) {
        Rectangle()
          .fill(theme.bgSunken)
          .containerRelativeFrame(.horizontal)
          .aspectRatio(ProfileDesign.coverAspectRatio, contentMode: .fit)

        VStack(alignment: .leading, spacing: 12) {
          HStack(alignment: .top, spacing: 12) {
            Circle()
              .fill(theme.bgSunken)
              .frame(width: ProfileDesign.avatarSize, height: ProfileDesign.avatarSize)
              .overlay {
                Circle().stroke(theme.bg, lineWidth: 4)
              }

            Spacer(minLength: 4)

            HStack(spacing: 10) {
              Circle()
                .fill(theme.bgElevated)
                .frame(width: 44, height: 44)
              Circle()
                .fill(theme.bgElevated)
                .frame(width: 44, height: 44)
            }
          }

          VStack(alignment: .leading, spacing: 7) {
            skeletonLine(width: 176, height: 20)
            skeletonLine(width: 112, height: 14)
          }

          skeletonLine(width: 104, height: 26)
            .clipShape(.rect(cornerRadius: 13))

          VStack(alignment: .leading, spacing: 7) {
            skeletonLine(width: nil, height: 14)
            skeletonLine(width: 268, height: 14)
          }

          HStack(spacing: 12) {
            ForEach(0..<3, id: \.self) { index in
              skeletonLine(width: index == 0 ? 86 : 114, height: 14)
            }
          }

          HStack(spacing: 22) {
            skeletonLine(width: 86, height: 18)
            skeletonLine(width: 92, height: 18)
          }
          .padding(.top, 4)

          RoundedRectangle(cornerRadius: 22)
            .fill(theme.fillStrong)
            .frame(height: 44)
        }
        .padding(.horizontal, ProfileDesign.horizontalPadding)
        .padding(.bottom, 16)

        ProfileLoadingTabSkeleton()

        LazyVStack(spacing: 0) {
          ForEach(0..<3, id: \.self) { index in
            FeedPostSkeletonCard(index: index, isCompact: index == 2)
            Divider()
          }
        }
      }
    }
    .redacted(reason: .placeholder)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("Loading profile")
    .accessibilityIdentifier("profile.loading.skeleton")
  }

  private func skeletonLine(width: CGFloat?, height: CGFloat) -> some View {
    RoundedRectangle(cornerRadius: 4)
      .fill(theme.fillStrong)
      .frame(width: width, height: height)
  }
}

private struct ProfileLoadingTabSkeleton: View {
  @Environment(\.theme) private var theme

  var body: some View {
    HStack(spacing: 0) {
      ForEach(ProfileTab.allCases) { _ in
        Circle()
          .fill(theme.fillStrong)
          .frame(width: 22, height: 22)
          .frame(maxWidth: .infinity, minHeight: ProfileDesign.tabBarHeight)
      }
    }
    .padding(.horizontal, ProfileDesign.tabBarHorizontalPadding)
    .background(theme.bg)
    .overlay(alignment: .bottom) {
      Rectangle()
        .fill(theme.text.opacity(0.08))
        .frame(height: 1)
    }
    .accessibilityHidden(true)
  }
}

struct ProfilePostTabSkeleton: View {
  let accessibilityLabel: String
  var rowCount = 3

  var body: some View {
    LazyVStack(spacing: 0) {
      ForEach(0..<rowCount, id: \.self) { index in
        FeedPostSkeletonCard(index: index)
        Divider()
      }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(accessibilityLabel)
    .accessibilityIdentifier("profile.posts.loading.skeleton")
  }
}

struct ProfilePostTabPaginationSkeleton: View {
  var body: some View {
    VStack(spacing: 0) {
      ForEach(0..<2, id: \.self) { index in
        FeedPostSkeletonCard(index: index + 3, isCompact: true)
        Divider()
      }
    }
    .accessibilityHidden(true)
  }
}

struct ProfileDiaryTabSkeleton: View {
  @Environment(\.theme) private var theme

  let accessibilityLabel: String
  var rowCount = 3

  var body: some View {
    LazyVStack(alignment: .leading, spacing: 18) {
      RoundedRectangle(cornerRadius: 4)
        .fill(theme.fillStrong)
        .frame(width: 126, height: 14)

      ForEach(0..<rowCount, id: \.self) { index in
        ProfileDiarySkeletonRow(index: index)
      }
    }
    .padding(ProfileDesign.horizontalPadding)
    .redacted(reason: .placeholder)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(accessibilityLabel)
    .accessibilityIdentifier("profile.diary.loading.skeleton")
  }
}

struct ProfileDiaryPaginationSkeleton: View {
  var body: some View {
    LazyVStack(alignment: .leading, spacing: 18) {
      ForEach(0..<2, id: \.self) { index in
        ProfileDiarySkeletonRow(index: index + 3, isCompact: true)
      }
    }
    .padding(.horizontal, ProfileDesign.horizontalPadding)
    .padding(.bottom, ProfileDesign.horizontalPadding)
    .redacted(reason: .placeholder)
    .accessibilityHidden(true)
  }
}

private struct ProfileDiarySkeletonRow: View {
  @Environment(\.theme) private var theme

  let index: Int
  var isCompact = false

  var body: some View {
    HStack(alignment: .top, spacing: 12) {
      VStack(spacing: 8) {
        skeletonLine(width: 34, height: 10)
        skeletonLine(width: 26, height: 24)
      }
      .frame(width: 42)

      RoundedRectangle(cornerRadius: 6)
        .fill(theme.bgSunken)
        .frame(width: 54, height: 80)

      VStack(alignment: .leading, spacing: 8) {
        HStack(alignment: .top, spacing: 8) {
          VStack(alignment: .leading, spacing: 7) {
            skeletonLine(width: index.isMultiple(of: 2) ? 168 : 122, height: 17)
            skeletonLine(width: 86, height: 10)
          }

          Spacer(minLength: 0)

          skeletonLine(width: 44, height: 14)
        }

        VStack(alignment: .leading, spacing: 6) {
          skeletonLine(width: nil, height: 13)
          if !isCompact {
            skeletonLine(width: index.isMultiple(of: 2) ? 224 : 156, height: 13)
          }
        }
      }
    }
    .padding(12)
    .background(theme.bgSunken, in: .rect(cornerRadius: ProfileDesign.cardRadius))
    .accessibilityHidden(true)
  }

  private func skeletonLine(width: CGFloat?, height: CGFloat) -> some View {
    RoundedRectangle(cornerRadius: 4)
      .fill(theme.fillStrong)
      .frame(width: width, height: height)
  }
}

struct ProfileListsTabSkeleton: View {
  let accessibilityLabel: String
  var rowCount = 4

  var body: some View {
    LazyVStack(spacing: 0) {
      ForEach(0..<rowCount, id: \.self) { index in
        ProfileListSkeletonRow(index: index)
        Divider().padding(.leading, 110)
      }
    }
    .redacted(reason: .placeholder)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(accessibilityLabel)
    .accessibilityIdentifier("profile.lists.loading.skeleton")
  }
}

struct ProfileListsPaginationSkeleton: View {
  var body: some View {
    VStack(spacing: 0) {
      ForEach(0..<2, id: \.self) { index in
        ProfileListSkeletonRow(index: index + 4, isCompact: true)
        Divider().padding(.leading, 110)
      }
    }
    .redacted(reason: .placeholder)
    .accessibilityHidden(true)
  }
}

private struct ProfileListSkeletonRow: View {
  @Environment(\.theme) private var theme

  let index: Int
  var isCompact = false

  var body: some View {
    HStack(spacing: 14) {
      HStack(spacing: -14) {
        ForEach(0..<3, id: \.self) { posterIndex in
          RoundedRectangle(cornerRadius: 5)
            .fill(theme.bgSunken)
            .frame(width: 44, height: 66)
            .overlay {
              RoundedRectangle(cornerRadius: 5).stroke(theme.bg, lineWidth: 2)
            }
            .zIndex(Double(3 - posterIndex))
        }
      }
      .frame(width: 78, alignment: .leading)

      VStack(alignment: .leading, spacing: 8) {
        skeletonLine(width: index.isMultiple(of: 2) ? 186 : 136, height: 17)

        if !isCompact {
          skeletonLine(width: nil, height: 13)
        }

        skeletonLine(width: 118, height: 11)
      }

      Spacer(minLength: 0)
    }
    .padding(.horizontal, ProfileDesign.horizontalPadding)
    .padding(.vertical, 14)
    .accessibilityHidden(true)
  }

  private func skeletonLine(width: CGFloat?, height: CGFloat) -> some View {
    RoundedRectangle(cornerRadius: 4)
      .fill(theme.fillStrong)
      .frame(width: width, height: height)
  }
}

struct ProfileStatsTabSkeleton: View {
  @Environment(\.theme) private var theme

  private let metricColumns = [GridItem(.flexible()), GridItem(.flexible())]

  var body: some View {
    VStack(alignment: .leading, spacing: 28) {
      LazyVGrid(columns: metricColumns, spacing: 10) {
        ForEach(0..<4, id: \.self) { index in
          ProfileMetricSkeletonCard(index: index)
        }
      }

      ProfileFavoriteFilmsSkeleton()
      ProfileActivitySkeleton()
      ProfileGenreBreakdownSkeleton()
      ProfileRecentDiarySkeleton()
    }
    .padding(ProfileDesign.horizontalPadding)
    .redacted(reason: .placeholder)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("Loading stats")
    .accessibilityIdentifier("profile.stats.loading.skeleton")
  }
}

private struct ProfileMetricSkeletonCard: View {
  @Environment(\.theme) private var theme

  let index: Int

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      RoundedRectangle(cornerRadius: 4)
        .fill(theme.fillStrong)
        .frame(width: index.isMultiple(of: 2) ? 74 : 54, height: 24)
      RoundedRectangle(cornerRadius: 4)
        .fill(theme.fillStrong)
        .frame(width: 104, height: 14)
      RoundedRectangle(cornerRadius: 4)
        .fill(theme.fillStrong)
        .frame(width: index.isMultiple(of: 2) ? 128 : 96, height: 11)
    }
    .frame(maxWidth: .infinity, minHeight: 110, alignment: .topLeading)
    .padding(14)
    .background(theme.bgSunken, in: .rect(cornerRadius: ProfileDesign.cardRadius))
    .accessibilityHidden(true)
  }
}

private struct ProfileFavoriteFilmsSkeleton: View {
  @Environment(\.theme) private var theme

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      sectionTitle(width: 128)

      HStack(spacing: 10) {
        ForEach(0..<4, id: \.self) { _ in
          RoundedRectangle(cornerRadius: 7)
            .fill(theme.bgSunken)
            .aspectRatio(2.0 / 3.0, contentMode: .fit)
        }
      }
    }
    .accessibilityHidden(true)
  }

  private func sectionTitle(width: CGFloat) -> some View {
    RoundedRectangle(cornerRadius: 4)
      .fill(theme.fillStrong)
      .frame(width: width, height: 17)
  }
}

private struct ProfileActivitySkeleton: View {
  @Environment(\.theme) private var theme

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      RoundedRectangle(cornerRadius: 4)
        .fill(theme.fillStrong)
        .frame(width: 96, height: 17)

      HStack(alignment: .bottom, spacing: 7) {
        ForEach(0..<12, id: \.self) { index in
          RoundedRectangle(cornerRadius: 4)
            .fill(theme.bgSunken)
            .frame(height: CGFloat(22 + ((index % 5) * 9)))
        }
      }
      .frame(height: 78, alignment: .bottom)
    }
    .accessibilityHidden(true)
  }
}

private struct ProfileGenreBreakdownSkeleton: View {
  @Environment(\.theme) private var theme

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      RoundedRectangle(cornerRadius: 4)
        .fill(theme.fillStrong)
        .frame(width: 142, height: 17)

      ForEach(0..<4, id: \.self) { index in
        HStack(spacing: 10) {
          RoundedRectangle(cornerRadius: 4)
            .fill(theme.fillStrong)
            .frame(width: index.isMultiple(of: 2) ? 78 : 112, height: 13)

          RoundedRectangle(cornerRadius: 4)
            .fill(theme.bgSunken)
            .frame(height: 10)

          RoundedRectangle(cornerRadius: 4)
            .fill(theme.fillStrong)
            .frame(width: 34, height: 12)
        }
      }
    }
    .accessibilityHidden(true)
  }
}

private struct ProfileRecentDiarySkeleton: View {
  @Environment(\.theme) private var theme

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      RoundedRectangle(cornerRadius: 4)
        .fill(theme.fillStrong)
        .frame(width: 112, height: 17)

      ForEach(0..<3, id: \.self) { index in
        HStack(spacing: 10) {
          RoundedRectangle(cornerRadius: 5)
            .fill(theme.bgSunken)
            .frame(width: 34, height: 50)

          VStack(alignment: .leading, spacing: 7) {
            RoundedRectangle(cornerRadius: 4)
              .fill(theme.fillStrong)
              .frame(width: index.isMultiple(of: 2) ? 152 : 116, height: 14)
            RoundedRectangle(cornerRadius: 4)
              .fill(theme.fillStrong)
              .frame(width: 86, height: 11)
          }

          Spacer(minLength: 0)
        }

        if index < 2 {
          Divider()
        }
      }
    }
    .accessibilityHidden(true)
  }
}

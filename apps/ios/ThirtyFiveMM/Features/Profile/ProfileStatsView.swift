import SwiftUI

struct ProfileStatsView: View {
  let model: ProfileViewModel

  private let metricColumns = [GridItem(.flexible()), GridItem(.flexible())]

  var body: some View {
    if model.isLoadingStats && model.stats == nil {
      ProgressView("Loading stats")
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
    } else if let error = model.statsError, model.stats == nil {
      ContentUnavailableView {
        Label("Couldn't load stats", systemImage: "chart.bar.xaxis")
      } description: {
        Text(error)
      } actions: {
        Button("Try again") {
          Task { await model.retryStats() }
        }
        .buttonStyle(.borderedProminent)
      }
    } else if let stats = model.stats {
      VStack(alignment: .leading, spacing: 28) {
        LazyVGrid(columns: metricColumns, spacing: 10) {
          ProfileMetricCard(
            value: stats.filmsLoggedCount.compactFormatted,
            label: "Films logged",
            detail: memberSinceText(stats.memberSince)
          )
          ProfileMetricCard(
            value: stats.hoursWatched.compactFormatted,
            label: "Hours watched",
            detail: hoursDetail(stats.hoursWatched)
          )
          ProfileMetricCard(
            value: averageRatingText(stats.averageRating),
            label: "Average rating",
            detail: stats.averageRating == nil ? "No ratings yet" : "Across rated logs and reviews"
          )
          ProfileMetricCard(
            value: stats.reviewsWrittenCount.compactFormatted,
            label: "Reviews written",
            detail: "\(stats.reviewLikeCount.compactFormatted) total \(stats.reviewLikeCount == 1 ? "like" : "likes")"
          )
        }

        ProfileFavoriteFilmsView(films: stats.favoriteFilms)
        ProfileActivityView(activity: stats.activity)
        ProfileGenreBreakdownView(genres: stats.genres)

        VStack(alignment: .leading, spacing: 14) {
          Text("Recent diary")
            .font(.headline)

          if stats.recentDiary.isEmpty {
            Text("No film logs yet")
              .font(.subheadline)
              .foregroundStyle(.secondary)
          } else {
            ForEach(stats.recentDiary) { entry in
              ProfileStatsDiaryRow(entry: entry)
              if entry.id != stats.recentDiary.last?.id {
                Divider()
              }
            }
          }
        }
      }
      .padding(ProfileDesign.horizontalPadding)
    }
  }

  private func memberSinceText(_ date: Date?) -> String {
    guard let date else { return "Member history unavailable" }
    return "Watching since \(date.formatted(.dateTime.year()))"
  }

  private func hoursDetail(_ hours: Int) -> String {
    guard hours > 0 else { return "No runtime data yet" }
    let days = hours / 24
    guard days > 0 else { return "Under one day of screen time" }
    return "About \(days.compactFormatted) \(days == 1 ? "day" : "days") of screen time"
  }

  private func averageRatingText(_ rating: Double?) -> String {
    guard let rating else { return "—" }
    return rating.formatted(.number.precision(.fractionLength(1)))
  }
}

import SwiftUI

struct ProfileGenreBreakdownView: View {
  @Environment(\.theme) private var theme
  let genres: [ProfileStatsSummary.Genre]

  var body: some View {
    if !genres.isEmpty {
      VStack(alignment: .leading, spacing: 14) {
        Text("Genre breakdown")
          .font(.headline)

        ForEach(genres.prefix(8)) { genre in
          VStack(alignment: .leading, spacing: 6) {
            HStack {
              Text(genre.name).font(.subheadline).bold()
              Spacer()
              Text(genre.percentage / 100, format: .percent.precision(.fractionLength(0)))
                .font(.caption)
                .foregroundStyle(theme.textSecondary)
                .monospacedDigit()
            }

            ProgressView(value: genre.percentage, total: 100)
              .tint(ProfileDesign.accent)
              .accessibilityLabel(genre.name)
              .accessibilityValue("\(genre.count) films, \(genre.percentage / 100, format: .percent.precision(.fractionLength(0)))")
          }
        }
      }
    }
  }
}

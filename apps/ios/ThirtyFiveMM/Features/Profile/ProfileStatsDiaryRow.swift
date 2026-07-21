import Kingfisher
import SwiftUI

struct ProfileStatsDiaryRow: View {
  @Environment(\.theme) private var theme
  let entry: ProfileStatsSummary.DiaryEntry

  var body: some View {
    HStack(spacing: 12) {
      KFImage(URL(string: entry.film.posterUrl ?? ""))
        .placeholder {
          Rectangle().fill(theme.fill)
        }
        .resizable()
        .scaledToFill()
        .frame(width: 42, height: 62)
        .clipShape(.rect(cornerRadius: 5))

      VStack(alignment: .leading, spacing: 5) {
        Text(entry.film.title)
          .font(.subheadline)
          .bold()
          .lineLimit(2)
        Text(entry.createdAt, format: .dateTime.month(.abbreviated).day())
          .font(.caption)
          .foregroundStyle(theme.textSecondary)
      }

      Spacer()

      if let rating = entry.rating {
        Label {
          Text(rating, format: .number.precision(.fractionLength(1)))
        } icon: {
          Image(systemName: "star.fill")
        }
        .font(.caption)
        .foregroundStyle(ProfileDesign.accent)
      }
    }
    .accessibilityElement(children: .combine)
  }
}

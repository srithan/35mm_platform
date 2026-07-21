import Kingfisher
import SwiftUI

struct ProfileDiaryRow: View {
  @Environment(\.theme) private var theme
  let post: FeedPost
  let onOpen: () -> Void

  var body: some View {
    Button(action: onOpen) {
      HStack(alignment: .top, spacing: 12) {
        VStack(spacing: 1) {
          Text(post.createdAt, format: .dateTime.weekday(.abbreviated))
            .font(.caption)
            .foregroundStyle(theme.textSecondary)
          Text(post.createdAt, format: .dateTime.day())
            .font(.title2)
            .bold()
            .monospacedDigit()
        }
        .frame(width: 42)

        KFImage(URL(string: post.film?.posterUrl ?? ""))
          .placeholder {
            Rectangle()
              .fill(theme.bgSunken)
              .overlay {
                Image(systemName: "film").foregroundStyle(theme.textTertiary)
              }
          }
          .resizable()
          .scaledToFill()
          .frame(width: 54, height: 80)
          .clipShape(.rect(cornerRadius: 6))

        VStack(alignment: .leading, spacing: 6) {
          HStack(alignment: .firstTextBaseline) {
            Text(post.film?.title ?? "Untitled film")
              .font(.headline)
              .foregroundStyle(theme.text)
              .lineLimit(2)

            Spacer(minLength: 6)

            if let rating = post.starRating, rating > 0 {
              Label {
                Text(rating, format: .number.precision(.fractionLength(1)))
              } icon: {
                Image(systemName: "star.fill")
              }
              .font(.caption)
              .foregroundStyle(ProfileDesign.accent)
            }
          }

          Text(metaText)
            .font(.caption)
            .foregroundStyle(theme.textSecondary)
            .textCase(.uppercase)

          if let notes {
            Text(notes)
              .font(.subheadline)
              .foregroundStyle(theme.textSecondary)
              .lineLimit(3)
          } else {
            Text("No notes added")
              .font(.subheadline)
              .foregroundStyle(theme.textTertiary)
          }
        }
      }
      .padding(12)
      .background(theme.bgSunken, in: .rect(cornerRadius: ProfileDesign.cardRadius))
      .contentShape(.rect)
    }
    .buttonStyle(.plain)
    .accessibilityLabel(accessibilitySummary)
  }

  private var metaText: String {
    let type = post.type == .review ? "Review" : "Log"
    guard let year = post.film?.year else { return type }
    return "\(year) · \(type)"
  }

  private var notes: String? {
    let text = post.body?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let automatic = post.film.map { "Logged \($0.title)" } ?? ""
    return text.isEmpty || text == automatic ? nil : text
  }

  private var accessibilitySummary: String {
    var parts = [post.film?.title ?? "Untitled film", metaText]
    if let rating = post.starRating {
      parts.append("\(rating) stars")
    }
    if let notes {
      parts.append(notes)
    }
    return parts.joined(separator: ", ")
  }
}

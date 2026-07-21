import Kingfisher
import SwiftUI

struct ProfileListRow: View {
  @Environment(\.theme) private var theme
  let list: FilmListSummary

  var body: some View {
    HStack(spacing: 14) {
      HStack(spacing: -14) {
        ForEach(list.posterUrls.indices.prefix(3), id: \.self) { index in
          KFImage(URL(string: list.posterUrls[index] ?? ""))
            .placeholder {
              Rectangle().fill(theme.fill)
            }
            .resizable()
            .scaledToFill()
            .frame(width: 44, height: 66)
            .clipShape(.rect(cornerRadius: 5))
            .overlay {
              RoundedRectangle(cornerRadius: 5).stroke(theme.bg, lineWidth: 2)
            }
            .zIndex(Double(3 - index))
        }
      }
      .frame(width: 78, alignment: .leading)

      VStack(alignment: .leading, spacing: 5) {
        HStack(spacing: 6) {
          Text(list.title)
            .font(.headline)
            .lineLimit(2)
          if list.visibility == .private {
            Image(systemName: "lock.fill")
              .font(.caption)
              .foregroundStyle(theme.textSecondary)
          }
        }

        if let description = list.description, !description.isEmpty {
          Text(description)
            .font(.subheadline)
            .foregroundStyle(theme.textSecondary)
            .lineLimit(2)
        }

        Text("^[\(list.entryCount) film](inflect: true) · ^[\(list.likeCount) like](inflect: true)")
          .font(.caption)
          .foregroundStyle(theme.textSecondary)
      }

      Spacer(minLength: 0)
    }
    .padding(.horizontal, ProfileDesign.horizontalPadding)
    .padding(.vertical, 14)
    .accessibilityElement(children: .combine)
  }
}

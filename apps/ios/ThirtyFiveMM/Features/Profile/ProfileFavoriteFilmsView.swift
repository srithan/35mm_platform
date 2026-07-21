import Kingfisher
import SwiftUI

struct ProfileFavoriteFilmsView: View {
  @Environment(\.theme) private var theme
  let films: [ProfileStatsSummary.Film]

  var body: some View {
    if !films.isEmpty {
      VStack(alignment: .leading, spacing: 12) {
        Text("Favorite films")
          .font(.headline)

        ScrollView(.horizontal) {
          LazyHStack(spacing: 12) {
            ForEach(films) { film in
              VStack(alignment: .leading, spacing: 6) {
                KFImage(URL(string: film.posterUrl ?? ""))
                  .placeholder {
                    Rectangle()
                      .fill(theme.fill)
                      .overlay { Image(systemName: "film").foregroundStyle(theme.textTertiary) }
                  }
                  .resizable()
                  .scaledToFill()
                  .frame(width: 92, height: 138)
                  .clipShape(.rect(cornerRadius: 8))

                Text(film.title)
                  .font(.caption)
                  .bold()
                  .lineLimit(2)
                  .frame(width: 92, alignment: .leading)
              }
              .accessibilityElement(children: .combine)
            }
          }
        }
        .scrollIndicators(.hidden)
      }
    }
  }
}

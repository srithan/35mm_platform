import SwiftUI

struct ProfileActivityView: View {
  @Environment(\.theme) private var theme
  let activity: [ProfileStatsSummary.ActivityDay]

  private let rows = Array(repeating: GridItem(.fixed(11), spacing: 4), count: 7)

  var body: some View {
    if !activity.isEmpty {
      VStack(alignment: .leading, spacing: 12) {
        Text("Activity")
          .font(.headline)

        ScrollView(.horizontal) {
          LazyHGrid(rows: rows, spacing: 4) {
            ForEach(activity.suffix(364)) { day in
              RoundedRectangle(cornerRadius: 2)
                .fill(color(for: day.count))
                .frame(width: 11, height: 11)
                .accessibilityLabel("\(day.date), ^[\(day.count) activity](inflect: true)")
            }
          }
          .padding(.vertical, 2)
        }
        .scrollIndicators(.hidden)
      }
    }
  }

  private func color(for count: Int) -> Color {
    switch count {
    case 0: theme.fill
    case 1: ProfileDesign.accent.opacity(0.28)
    case 2: ProfileDesign.accent.opacity(0.5)
    case 3: ProfileDesign.accent.opacity(0.72)
    default: ProfileDesign.accent
    }
  }
}

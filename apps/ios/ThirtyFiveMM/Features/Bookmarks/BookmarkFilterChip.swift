import SwiftUI

struct BookmarkFilterChip: View {
  let filter: BookmarkFilter
  let unsortedCount: Int
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      VStack(spacing: 6) {
        HStack(spacing: 5) {
          Text(title)
            .font(isSelected ? .subheadline.bold() : .subheadline)
            .foregroundStyle(.primary)
            .lineLimit(1)

          if let count {
            Text(count, format: .number.notation(.compactName))
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }

        Capsule()
          .fill(isSelected ? Color.primary : Color.clear)
          .frame(height: 2)
      }
      .padding(.horizontal, 10)
      .frame(minHeight: 44)
      .contentShape(.rect)
    }
    .buttonStyle(.plain)
    .accessibilityAddTraits(isSelected ? .isSelected : [])
  }

  private var title: String {
    switch filter {
    case .all:
      "All"
    case .unsorted:
      "Unsorted"
    case .folder(let folder):
      folder.name
    }
  }

  private var count: Int? {
    switch filter {
    case .all:
      nil
    case .unsorted:
      unsortedCount
    case .folder(let folder):
      folder.itemCount
    }
  }
}

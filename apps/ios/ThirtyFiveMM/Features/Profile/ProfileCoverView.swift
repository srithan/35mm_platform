import Kingfisher
import SwiftUI

struct ProfileCoverView: View {
  let url: String?
  let preservesAspectRatio: Bool

  init(url: String?, preservesAspectRatio: Bool = true) {
    self.url = url
    self.preservesAspectRatio = preservesAspectRatio
  }

  var body: some View {
    if preservesAspectRatio {
      coverImage
        .aspectRatio(ProfileDesign.coverAspectRatio, contentMode: .fit)
    } else {
      coverImage
    }
  }

  private var coverImage: some View {
    KFImage(URL(string: url ?? ""))
      .placeholder {
        LinearGradient(
          colors: [Color(red: 0.12, green: 0.10, blue: 0.09), Color(red: 0.45, green: 0.18, blue: 0.15)],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        )
      }
      .resizable()
      .scaledToFill()
      .containerRelativeFrame(.horizontal)
      .clipped()
      .accessibilityHidden(true)
  }
}

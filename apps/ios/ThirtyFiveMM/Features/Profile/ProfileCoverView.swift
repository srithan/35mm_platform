import Kingfisher
import SwiftUI

struct ProfileCoverView: View {
  let url: String?

  var body: some View {
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
      .aspectRatio(ProfileDesign.coverAspectRatio, contentMode: .fit)
      .clipped()
      .accessibilityHidden(true)
  }
}

import SwiftUI

struct PostRepostContextView: View {
  let context: RepostContext
  let viewerUserId: String?
  let viewerHasReposted: Bool

  var body: some View {
    Label {
      Text(summary)
        .font(.caption.weight(.medium))
        .foregroundStyle(.secondary)
        .lineLimit(1)
    } icon: {
      Image("PostActionRepost")
        .resizable()
        .scaledToFit()
        .frame(width: 14, height: 14)
        .foregroundStyle(repostColor)
    }
    .labelStyle(.titleAndIcon)
    .padding(.leading, 52)
    .accessibilityLabel(summary)
  }

  private var summary: String {
    let namedUsers = context.users.isEmpty ? [context.user] : context.users
    let viewerIsNamed = viewerUserId.map { viewerID in
      namedUsers.contains(where: { $0.id == viewerID })
    } ?? false
    let showsViewer = viewerHasReposted || viewerIsNamed
    let otherUsers: [RepostContext.User]
    if let viewerUserId {
      otherUsers = namedUsers.filter { $0.id != viewerUserId }
    } else if showsViewer {
      otherUsers = Array(namedUsers.dropFirst())
    } else {
      otherUsers = namedUsers
    }

    var names: [String] = []
    if showsViewer {
      names.append("You")
      if let otherUser = otherUsers.first {
        names.append(otherUser.displayName)
      }
    } else {
      names = namedUsers.prefix(2).map(\.displayName)
    }

    let totalCount = max(context.totalCount, names.count)
    let remainingCount = max(totalCount - names.count, 0)
    let namedSummary: String
    switch names.count {
    case 0:
      namedSummary = "Someone"
    case 1:
      namedSummary = names[0]
    default:
      namedSummary = remainingCount > 0
        ? names.joined(separator: ", ")
        : names.joined(separator: " and ")
    }

    guard remainingCount > 0 else {
      return "\(namedSummary) reposted"
    }

    let noun = remainingCount == 1 ? "other" : "others"
    return "\(namedSummary) and \(remainingCount) \(noun) reposted"
  }

  private var repostColor: Color {
    Color(red: 90.0 / 255.0, green: 158.0 / 255.0, blue: 122.0 / 255.0)
  }
}

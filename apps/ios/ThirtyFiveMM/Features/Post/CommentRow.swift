import Kingfisher
import SwiftUI
import UIKit

struct CommentRow: View {
  let node: CommentNode
  let depth: Int
  let onLike: (Comment) -> Void
  let onReply: (Comment) -> Void
  let postId: String

  @State private var isShowingCommentActions = false
  @State private var areRepliesExpanded = true

  private var comment: Comment {
    node.comment
  }

  private var authorName: String {
    guard let displayName = comment.author.displayName, !displayName.isEmpty else {
      return comment.author.username
    }

    return displayName
  }

  private var avatarSize: CGFloat {
    depth == 0 ? 32 : 28
  }

  private var authorDestination: ProfileDestination {
    ProfileDestination(username: comment.author.username)
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .top, spacing: 10) {
        avatar

        VStack(alignment: .leading, spacing: 6) {
          header
          bodyText

          if !isDeleted {
            actionsBar
          }
        }
      }

      if depth < 2 && areRepliesExpanded {
        ForEach(node.replies) { reply in
          CommentRow(
            node: reply,
            depth: depth + 1,
            onLike: onLike,
            onReply: onReply,
            postId: postId
          )
          .padding(.leading, 44)
        }
      }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 12)
    .fullScreenCover(isPresented: $isShowingCommentActions) {
      BottomActionSheet(
        title: "Comment actions",
        actions: commentActions
      )
    }
  }

  private var avatar: some View {
    NavigationLink(value: AppRoute.profile(authorDestination)) {
      KFImage(URL(string: comment.author.avatarUrl ?? ""))
        .placeholder {
          Image(systemName: "person.circle.fill")
            .resizable()
            .foregroundStyle(.secondary)
        }
        .resizable()
        .scaledToFill()
        .frame(width: avatarSize, height: avatarSize)
        .clipShape(Circle())
        .background(Circle().fill(Color(.secondarySystemBackground)))
    }
    .buttonStyle(.plain)
    .frame(minWidth: 44, minHeight: 44, alignment: .top)
    .contentShape(Circle())
    .accessibilityLabel("View @\(comment.author.username)'s profile")
  }

  private var header: some View {
    HStack(alignment: .firstTextBaseline, spacing: 6) {
      NavigationLink(value: AppRoute.profile(authorDestination)) {
        HStack(alignment: .firstTextBaseline, spacing: 4) {
          Text(authorName)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.primary)
            .lineLimit(1)

          Text("@\(comment.author.username)")
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
      }
      .buttonStyle(.plain)
      .frame(minHeight: 44)
      .contentShape(Rectangle())
      .accessibilityLabel("\(authorName), @\(comment.author.username)")
      .accessibilityHint("Opens profile")

      Text("·")
        .font(.caption)
        .foregroundStyle(.secondary)

      Text(comment.createdAt.relativeShort)
        .font(.caption)
        .foregroundStyle(.secondary)

      Spacer(minLength: 8)

      Button {
        isShowingCommentActions = true
      } label: {
        Image(systemName: "ellipsis")
          .font(.caption.weight(.semibold))
          .frame(width: 24, height: 24)
          .contentShape(Rectangle())
      }
      .buttonStyle(.plain)
      .foregroundStyle(.secondary)
      .accessibilityLabel("More comment actions")
    }
  }

  private var actionsBar: some View {
    HStack(spacing: 0) {
      Button {
        onLike(comment)
      } label: {
        HStack(spacing: 6) {
          Image(comment.isLiked ? "PostActionHeartFilled" : "PostActionHeart")
            .resizable()
            .scaledToFit()
            .frame(width: 19, height: 19)

          if comment.likeCount > 0 {
            Text(comment.likeCount.compactFormatted)
              .monospacedDigit()
          }
        }
        .frame(minWidth: 72, minHeight: 44, alignment: .leading)
        .contentShape(Rectangle())
      }
      .foregroundStyle(
        comment.isLiked
          ? Color(red: 1.0, green: 0.02, blue: 0.22)
          : Color.secondary
      )
      .accessibilityLabel(comment.isLiked ? "Unlike comment" : "Like comment")

      Button {
        guard !node.replies.isEmpty else { return }
        areRepliesExpanded.toggle()
      } label: {
        HStack(spacing: 6) {
          Image("PostActionComment")
            .resizable()
            .scaledToFit()
            .frame(width: 19, height: 19)

          if !node.replies.isEmpty {
            Text(node.replies.count.compactFormatted)
              .monospacedDigit()
          }
        }
        .frame(minWidth: 72, minHeight: 44, alignment: .leading)
        .contentShape(Rectangle())
      }
      .disabled(node.replies.isEmpty)
      .accessibilityLabel(replyCountAccessibilityLabel)

      if depth < 2 {
        Button {
          onReply(comment)
        } label: {
          Label("Reply", systemImage: "arrowshape.turn.up.left")
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .accessibilityLabel("Reply to @\(comment.author.username)")
      }

      Spacer(minLength: 0)
    }
    .font(.caption.weight(.medium))
    .foregroundStyle(.secondary)
    .buttonStyle(.plain)
  }

  private var replyCountAccessibilityLabel: String {
    if node.replies.isEmpty {
      return "No replies"
    }

    return areRepliesExpanded ? "Hide replies" : "Show replies"
  }

  @ViewBuilder
  private var bodyText: some View {
    if isDeleted {
      Text("[comment deleted]")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    } else {
      RichTextView(body: comment.body, font: .subheadline)
        .fixedSize(horizontal: false, vertical: true)
    }
  }

  private var isDeleted: Bool {
    comment.isDeleted || comment.body == nil
  }

  private var commentActions: [BottomActionSheetAction] {
    var actions = [
      BottomActionSheetAction("Copy link", systemImage: "link") {
        UIPasteboard.general.string = "https://35mm.app/posts/\(postId)/comments/\(comment.id)"
      }
    ]

    if !isDeleted {
      actions.append(
        BottomActionSheetAction("Edit comment", systemImage: "pencil") {
          // TODO: Wire edit own comment in comment management stage.
        }
      )
      actions.append(
        BottomActionSheetAction("Delete comment", systemImage: "trash", role: .destructive) {
          // TODO: Wire delete own comment in comment management stage.
        }
      )
      actions.append(
        BottomActionSheetAction(
          "Report comment",
          systemImage: "exclamationmark.bubble",
          role: .destructive
        ) {
          // TODO: Open report flow when moderation API exists.
        }
      )
    }

    return actions
  }
}

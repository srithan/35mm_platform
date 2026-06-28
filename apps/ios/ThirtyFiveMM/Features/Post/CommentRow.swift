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

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .top, spacing: 10) {
        avatar

        VStack(alignment: .leading, spacing: 6) {
          header
          bodyText

          if !isDeleted {
            Button("Reply") {
              onReply(comment)
            }
            .font(.caption.weight(.medium))
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
          }
        }
      }

      if depth == 0 {
        ForEach(node.replies) { reply in
          CommentRow(
            node: reply,
            depth: 1,
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
    Button {
      // TODO: Navigate to author profile in Profile stage.
    } label: {
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
  }

  private var header: some View {
    HStack(alignment: .firstTextBaseline, spacing: 6) {
      Button {
        // TODO: Navigate to author profile in Profile stage.
      } label: {
        HStack(alignment: .firstTextBaseline, spacing: 4) {
          Text(authorName)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.primary)
            .lineLimit(1)

          Text("@\(comment.author.username)")
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(1)

          Text("·")
            .font(.caption)
            .foregroundStyle(.secondary)

          Text(comment.createdAt.relativeShort)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }
      .buttonStyle(.plain)

      Spacer(minLength: 8)

      if !isDeleted {
        Button {
          onLike(comment)
        } label: {
          HStack(spacing: 4) {
            Image(systemName: comment.isLiked ? "heart.fill" : "heart")
              .font(.caption)

            Text(comment.likeCount.compactFormatted)
              .font(.caption2)
              .monospacedDigit()
          }
          .foregroundStyle(comment.isLiked ? Color.accentColor : Color.secondary)
        }
        .buttonStyle(.plain)
      }

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

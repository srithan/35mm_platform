import SwiftUI

struct CommentInputBar: View {
  @Binding var text: String
  @Binding var isExpanded: Bool
  let replyingTo: Comment?
  let postAuthor: PostAuthor
  let isPosting: Bool
  let onSubmit: () -> Void
  let onCancel: () -> Void

  @FocusState private var isFocused: Bool

  var body: some View {
    Group {
      if isExpanded {
        expandedComposer
      } else {
        composerTrigger
      }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 12)
    .overlay(alignment: .bottom) {
      Divider()
    }
    .onChange(of: replyingTo?.id) { _, newValue in
      if newValue != nil {
        isExpanded = true
        isFocused = true
      }
    }
    .onChange(of: isExpanded) { _, newValue in
      if newValue {
        isFocused = true
      }
    }
  }

  private var composerTrigger: some View {
    Button {
      isExpanded = true
    } label: {
      HStack(spacing: 12) {
        Image(systemName: "person.crop.circle.fill")
          .resizable()
          .scaledToFit()
          .frame(width: 40, height: 40)
          .foregroundStyle(.secondary)

        Text("Post your reply…")
          .font(.subheadline.weight(.medium))
          .foregroundStyle(.secondary)

        Spacer(minLength: 8)

        Image(systemName: "arrowshape.turn.up.left.fill")
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(Color(.systemBackground))
          .frame(width: 32, height: 32)
          .background(Color.primary, in: Circle())
      }
      .padding(.leading, 2)
      .padding(.trailing, 12)
      .padding(.vertical, 10)
      .background(
        Color(.secondarySystemBackground).opacity(0.6),
        in: RoundedRectangle(cornerRadius: 16)
      )
      .overlay {
        RoundedRectangle(cornerRadius: 16)
          .stroke(
            Color.secondary.opacity(0.35),
            style: StrokeStyle(lineWidth: 1.5, dash: [6, 4])
          )
      }
    }
    .buttonStyle(.plain)
    .accessibilityLabel("Post your reply")
  }

  private var expandedComposer: some View {
    HStack(alignment: .top, spacing: 12) {
      VStack(spacing: 8) {
        Image(systemName: "person.crop.circle.fill")
          .resizable()
          .scaledToFit()
          .frame(width: 40, height: 40)
          .foregroundStyle(.secondary)

        Capsule()
          .fill(Color.secondary.opacity(0.25))
          .frame(width: 1)
          .frame(minHeight: 40)
      }
      .frame(width: 40)

      VStack(alignment: .leading, spacing: 10) {
        replyContext

        VStack(spacing: 0) {
          TextField("Post your reply…", text: $text, axis: .vertical)
            .textFieldStyle(.plain)
            .lineLimit(3...8)
            .focused($isFocused)
            .submitLabel(.send)
            .onSubmit(submitIfPossible)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, minHeight: 96, alignment: .topLeading)

          Divider()

          HStack(spacing: 8) {
            Spacer(minLength: 0)

            Button("Cancel", action: onCancel)
              .font(.subheadline.weight(.medium))
              .foregroundStyle(.secondary)
              .frame(minHeight: 44)

            Button(action: submitIfPossible) {
              Group {
                if isPosting {
                  ProgressView()
                    .tint(Color(.systemBackground))
                } else {
                  Text("Reply")
                }
              }
              .font(.subheadline.weight(.semibold))
              .foregroundStyle(Color(.systemBackground))
              .frame(minWidth: 72, minHeight: 36)
              .background(isSendDisabled ? Color.secondary : Color.primary, in: Capsule())
            }
            .disabled(isSendDisabled)
          }
          .padding(.horizontal, 10)
          .padding(.vertical, 4)
          .background(Color(.secondarySystemBackground).opacity(0.55))
        }
        .background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 12))
        .overlay {
          RoundedRectangle(cornerRadius: 12)
            .stroke(Color.secondary.opacity(0.25))
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }

  private var replyContext: some View {
    HStack(spacing: 8) {
      Image(systemName: "arrowshape.turn.up.left.fill")
        .font(.caption.weight(.semibold))
        .foregroundStyle(.white)
        .frame(width: 28, height: 28)
        .background(Color.accentColor, in: Circle())

      Text("Replying to")
        .font(.caption.weight(.medium))

      Text("@\(replyTarget.username)")
        .font(.caption.weight(.semibold))
        .foregroundStyle(Color.accentColor)
        .lineLimit(1)

      if let displayName = replyTarget.displayName, !displayName.isEmpty {
        Text("· \(displayName)")
          .font(.caption)
          .foregroundStyle(.tertiary)
          .lineLimit(1)
      }
    }
  }

  private var replyTarget: PostAuthor {
    replyingTo?.author ?? postAuthor
  }

  private var isSendDisabled: Bool {
    text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isPosting
  }

  private func submitIfPossible() {
    guard !isSendDisabled else { return }
    onSubmit()
  }
}

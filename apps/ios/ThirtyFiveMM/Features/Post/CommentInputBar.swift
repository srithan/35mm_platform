import SwiftUI

struct CommentInputBar: View {
  @Binding var text: String
  let replyingTo: Comment?
  let isPosting: Bool
  let onSubmit: () -> Void
  let onCancelReply: () -> Void

  @FocusState private var isFocused: Bool

  var body: some View {
    VStack(spacing: 0) {
      if let replyingTo {
        HStack {
          Text("Replying to @\(replyingTo.author.username)")
            .font(.caption)
            .foregroundStyle(.secondary)

          Spacer()

          Button(action: onCancelReply) {
            Image(systemName: "xmark")
              .font(.caption.weight(.bold))
          }
          .buttonStyle(.plain)
          .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)

        Divider()
      }

      HStack(alignment: .bottom, spacing: 10) {
        TextField("Add a comment...", text: $text, axis: .vertical)
          .textFieldStyle(.plain)
          .lineLimit(1...5)
          .focused($isFocused)
          .submitLabel(.send)
          .onSubmit(submitIfPossible)
          .padding(.horizontal, 12)
          .padding(.vertical, 10)
          .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 8))

        if isPosting {
          ProgressView()
            .frame(width: 34, height: 34)
        } else {
          Button(action: submitIfPossible) {
            Image(systemName: "arrow.up.circle.fill")
              .font(.system(size: 30))
          }
          .buttonStyle(.plain)
          .disabled(isSendDisabled)
          .foregroundStyle(isSendDisabled ? Color.secondary : Color.accentColor)
        }
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 10)
    }
    .background(.regularMaterial)
    .onChange(of: replyingTo?.id) { _, newValue in
      if newValue != nil {
        isFocused = true
      }
    }
  }

  private var isSendDisabled: Bool {
    text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isPosting
  }

  private func submitIfPossible() {
    guard !isSendDisabled else { return }
    onSubmit()
  }
}

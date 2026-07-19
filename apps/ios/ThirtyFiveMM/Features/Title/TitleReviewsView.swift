import Kingfisher
import SwiftUI
import UIKit

struct TitleReviewsView: View {
  @ObservedObject var viewModel: TitleDetailViewModel
  let apiClient: APIClient

  var body: some View {
    VStack(alignment: .leading, spacing: 18) {
      VStack(alignment: .leading, spacing: 5) {
        Text("Reviews on 35mm")
          .font(.title3.weight(.bold))
          .accessibilityAddTraits(.isHeader)
        Text("Newest public reviews from the 35mm community.")
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }

      reviewsContent
    }
    .padding(.horizontal, 20)
  }

  @ViewBuilder
  private var reviewsContent: some View {
    if viewModel.detail?.legacyFilmId == nil {
      CatalogLoadState(
        systemImage: "link.badge.plus",
        title: "Reviews not connected",
        message: "This catalog record is not yet linked to its 35mm social title.",
        actionTitle: nil,
        action: nil
      )
    } else if viewModel.isLoadingReviews && viewModel.reviews.isEmpty {
      VStack(spacing: 14) {
        ForEach(0..<3, id: \.self) { _ in
          RoundedRectangle(cornerRadius: 14)
            .fill(Color(.secondarySystemBackground))
            .frame(height: 170)
        }
      }
      .redacted(reason: .placeholder)
      .accessibilityLabel("Loading reviews")
    } else if let error = viewModel.reviewsError, viewModel.reviews.isEmpty {
      CatalogLoadState(
        systemImage: "text.bubble",
        title: "Reviews unavailable",
        message: error,
        actionTitle: "Try Again"
      ) {
        Task { await viewModel.retryReviews() }
      }
    } else if viewModel.reviews.isEmpty {
      CatalogLoadState(
        systemImage: "text.bubble",
        title: "No reviews yet",
        message: "Community reviews will appear here when members publish them.",
        actionTitle: nil,
        action: nil
      )
    } else {
      LazyVStack(spacing: 14) {
        ForEach(viewModel.reviews) { review in
          TitleReviewCard(review: review, apiClient: apiClient) {
            Task { await viewModel.toggleReviewLike(postID: review.id) }
          }
          .onAppear {
            if review.id == viewModel.reviews.last?.id {
              Task { await viewModel.loadMoreReviews() }
            }
          }
        }

        if viewModel.isLoadingMoreReviews {
          ProgressView("Loading more reviews")
            .padding(.vertical, 16)
        } else if viewModel.hasMoreReviews {
          Button("Load more reviews") {
            Task { await viewModel.loadMoreReviews() }
          }
          .font(.subheadline.weight(.semibold))
          .padding(.vertical, 16)
        }

        if let error = viewModel.reviewsError {
          Text(error)
            .font(.footnote)
            .foregroundStyle(.red)
            .frame(maxWidth: .infinity, alignment: .center)
        }
      }
    }
  }
}

private struct TitleReviewCard: View {
  let review: FeedPost
  let apiClient: APIClient
  let onLike: () -> Void
  @State private var isShowingActions = false

  private var authorName: String {
    let value = review.author.displayName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    return value.isEmpty ? review.author.username : value
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      NavigationLink {
        PostDetailView(post: review, apiClient: apiClient)
      } label: {
        VStack(alignment: .leading, spacing: 12) {
          HStack(spacing: 11) {
            KFImage(review.author.avatarUrl.flatMap(URL.init(string:)))
              .placeholder {
                Circle()
                  .fill(Color(.tertiarySystemFill))
                  .overlay {
                    Image(systemName: "person.fill")
                      .foregroundStyle(.tertiary)
                  }
              }
              .retry(maxCount: 2, interval: .seconds(1))
              .resizable()
              .scaledToFill()
              .frame(width: 42, height: 42)
              .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
              Text(authorName)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.primary)
                .lineLimit(1)
              Text("@\(review.author.username) · \(review.createdAt.relativeShort)")
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }

            Spacer(minLength: 6)
            Image(systemName: "chevron.right")
              .font(.caption.weight(.semibold))
              .foregroundStyle(.tertiary)
          }

          if let rating = review.starRating {
            ReviewStars(rating: rating)
          }

          if let headline = review.headline, !headline.isEmpty {
            RichTextView(body: headline, font: .headline)
              .foregroundStyle(.primary)
          }

          RichTextView(body: review.body, font: .body)
            .foregroundStyle(.primary)
            .lineLimit(8)
            .lineSpacing(3)
        }
      }
      .buttonStyle(.plain)
      .accessibilityHint("Opens full review and comments")

      HStack(spacing: 18) {
        Button(action: onLike) {
          Label(
            review.likeCount.compactFormatted,
            systemImage: review.isLiked ? "heart.fill" : "heart"
          )
          .foregroundStyle(review.isLiked ? Color.red : Color.secondary)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(review.isLiked ? "Unlike review" : "Like review")

        Label(review.commentCount.compactFormatted, systemImage: "bubble.left")
          .foregroundStyle(.secondary)

        Spacer(minLength: 0)

        Button {
          isShowingActions = true
        } label: {
          Image(systemName: "ellipsis")
            .frame(width: 32, height: 32)
        }
        .buttonStyle(.plain)
        .foregroundStyle(.secondary)
        .accessibilityLabel("Review actions")
      }
      .font(.subheadline.weight(.medium))
    }
    .padding(16)
    .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
    .contentShape(RoundedRectangle(cornerRadius: 14))
    .accessibilityElement(children: .contain)
    .bottomActionSheet(isPresented: $isShowingActions) {
      BottomActionSheet(
        title: "Review actions",
        actions: [
          BottomActionSheetAction("Copy link", systemImage: "link") {
            UIPasteboard.general.string = "https://35mm.app/posts/\(review.id)"
          }
        ]
      )
    }
  }
}

private struct ReviewStars: View {
  let rating: Double

  var body: some View {
    HStack(spacing: 2) {
      ForEach(1...5, id: \.self) { value in
        Image(systemName: symbol(for: Double(value)))
          .foregroundStyle(Color.accentColor)
      }
      Text(rating.formatted(.number.precision(.fractionLength(1))))
        .font(.caption.weight(.semibold))
        .foregroundStyle(.secondary)
        .padding(.leading, 5)
    }
    .font(.caption)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("\(rating.formatted(.number.precision(.fractionLength(1)))) out of 5 stars")
  }

  private func symbol(for position: Double) -> String {
    if rating >= position { return "star.fill" }
    if rating >= position - 0.5 { return "star.leadinghalf.filled" }
    return "star"
  }
}

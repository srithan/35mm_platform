export const POST_PREVIEW_GRAPHEME_LIMIT = 400;

var graphemeSegmenter = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
  : null;

function splitGraphemes(text: string) {
  if (!graphemeSegmenter) return Array.from(text);
  return Array.from(graphemeSegmenter.segment(text), function (part) {
    return part.segment;
  });
}

export function truncatePostPreview(
  text: string,
  limit = POST_PREVIEW_GRAPHEME_LIMIT
): string | null {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("Post preview limit must be a positive integer");
  }

  var graphemes = splitGraphemes(text);
  if (graphemes.length <= limit) return null;

  var minimumWordBoundary = Math.floor(limit * 0.8);
  var cutoff = limit;
  for (var index = limit - 1; index >= minimumWordBoundary; index -= 1) {
    if (/\s/u.test(graphemes[index] ?? "")) {
      cutoff = index;
      break;
    }
  }

  return graphemes.slice(0, cutoff).join("").trimEnd();
}

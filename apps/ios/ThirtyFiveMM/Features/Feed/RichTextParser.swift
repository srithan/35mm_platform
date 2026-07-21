import Foundation
import SwiftUI

struct RichTextParser {
  static let sentinel = "__35MM_RICH_TEXT_V1__"

  static func parse(_ body: String?, suppressingURL: String? = nil) -> AttributedString? {
    guard let body else { return nil }

    guard body.hasPrefix(sentinel) else {
      return AttributedString(suppressPreviewURL(in: body, matching: suppressingURL))
    }

    let json = String(body.dropFirst(sentinel.count))
    guard let data = json.data(using: .utf8) else {
      return AttributedString(body)
    }

    do {
      let document = try JSONDecoder().decode(TipTapNode.self, from: data)
      var output = render(document, suppressingURL: suppressingURL)
      trimTrailingNewlines(&output)
      return output
    } catch {
      #if DEBUG
        print("Unsupported or malformed rich text payload: \(error.localizedDescription)")
      #endif
      return AttributedString(body)
    }
  }

  private static func render(
    _ node: TipTapNode,
    suppressingURL: String?
  ) -> AttributedString {
    switch node.type {
    case "doc":
      return renderChildren(node.content, suppressingURL: suppressingURL)
    case "paragraph":
      let original = plainText(node)
      let visible = suppressPreviewURL(in: original, matching: suppressingURL)
      if original != visible && isOnlyDiscardableURLPunctuation(visible) {
        return AttributedString()
      }
      var text = renderChildren(node.content, suppressingURL: suppressingURL)
      text.append(AttributedString("\n"))
      return text
    case "text":
      return markedText(
        suppressPreviewURL(in: node.text ?? "", matching: suppressingURL),
        marks: node.marks ?? []
      )
    case "mention":
      return mentionText(label: node.attrs?.label)
    case "hardBreak":
      return AttributedString("\n")
    default:
      #if DEBUG
        print("Unsupported rich text node: \(node.type)")
      #endif
      return fallbackText(for: node, suppressingURL: suppressingURL)
    }
  }

  private static func renderChildren(
    _ children: [TipTapNode]?,
    suppressingURL: String?
  ) -> AttributedString {
    var output = AttributedString()
    for child in children ?? [] {
      output.append(render(child, suppressingURL: suppressingURL))
    }
    return output
  }

  private static func markedText(_ value: String, marks: [TipTapMark]) -> AttributedString {
    var text = AttributedString(value)

    for mark in marks {
      switch mark.type {
      case "bold":
        text.inlinePresentationIntent = addIntent(
          .stronglyEmphasized,
          to: text.inlinePresentationIntent
        )
      case "italic":
        text.inlinePresentationIntent = addIntent(.emphasized, to: text.inlinePresentationIntent)
      case "underline":
        text.underlineStyle = .single
      case "strike":
        text.strikethroughStyle = .single
      default:
        #if DEBUG
          print("Unsupported rich text mark: \(mark.type)")
        #endif
      }
    }

    return text
  }

  private static func mentionText(label: String?) -> AttributedString {
    let cleanLabel = (label ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    var text = AttributedString("@\(cleanLabel)")
    text.foregroundColor = .blue

    if let encoded = cleanLabel.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
      let url = URL(string: "mention://\(encoded)")
    {
      text.link = url
    }

    return text
  }

  private static func fallbackText(
    for node: TipTapNode,
    suppressingURL: String?
  ) -> AttributedString {
    if let text = node.text {
      return AttributedString(suppressPreviewURL(in: text, matching: suppressingURL))
    }

    return renderChildren(node.content, suppressingURL: suppressingURL)
  }

  private static func plainText(_ node: TipTapNode) -> String {
    switch node.type {
    case "text":
      return node.text ?? ""
    case "hardBreak":
      return "\n"
    case "mention":
      return "@\(node.attrs?.label ?? "")"
    default:
      return (node.content ?? []).map(plainText).joined()
    }
  }

  private static func normalizedURL(_ value: String) -> String? {
    guard var components = URLComponents(string: value),
      let scheme = components.scheme?.lowercased(),
      scheme == "http" || scheme == "https",
      let host = components.host?.lowercased()
    else {
      return nil
    }

    components.scheme = scheme
    components.host = host
    if components.path.isEmpty { components.path = "/" }
    if (scheme == "http" && components.port == 80) || (scheme == "https" && components.port == 443) {
      components.port = nil
    }
    return components.string
  }

  private static func isOnlyDiscardableURLPunctuation(_ value: String) -> Bool {
    let punctuation = CharacterSet(charactersIn: "()[],.!?;:")
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.unicodeScalars.allSatisfy { punctuation.contains($0) }
  }

  private static func suppressPreviewURL(in value: String, matching previewURL: String?) -> String {
    guard let previewURL, let normalizedPreview = normalizedURL(previewURL), !value.isEmpty,
      let expression = try? NSRegularExpression(pattern: #"https?://[^\s]+"#, options: .caseInsensitive)
    else {
      return value
    }

    var output = value
    let matches = expression.matches(
      in: value,
      range: NSRange(value.startIndex..<value.endIndex, in: value)
    )
    let punctuation = CharacterSet(charactersIn: "),.!?;:")
    var removed = false

    for match in matches.reversed() {
      guard let range = Range(match.range, in: output) else { continue }
      let raw = String(output[range])
      let candidate = raw.trimmingCharacters(in: punctuation)
      guard normalizedURL(candidate) == normalizedPreview else { continue }
      let suffix = String(raw.dropFirst(candidate.count))
      output.replaceSubrange(range, with: suffix)
      removed = true
    }

    if !removed { return value }

    let cleaned = output
      .replacingOccurrences(of: #"[ \t]{2,}"#, with: " ", options: .regularExpression)
      .trimmingCharacters(in: .whitespacesAndNewlines)
    return isOnlyDiscardableURLPunctuation(cleaned) ? "" : cleaned
  }

  private static func addIntent(
    _ intent: InlinePresentationIntent,
    to existing: InlinePresentationIntent?
  ) -> InlinePresentationIntent {
    guard var existing else { return intent }
    existing.insert(intent)
    return existing
  }

  private static func trimTrailingNewlines(_ text: inout AttributedString) {
    while text.characters.last?.isNewline == true {
      text.removeSubrange(text.characters.index(before: text.endIndex)..<text.endIndex)
    }
  }
}

private struct TipTapNode: Decodable {
  let type: String
  let text: String?
  let attrs: TipTapAttrs?
  let marks: [TipTapMark]?
  let content: [TipTapNode]?
}

private struct TipTapAttrs: Decodable {
  let id: String?
  let label: String?
}

private struct TipTapMark: Decodable {
  let type: String
}

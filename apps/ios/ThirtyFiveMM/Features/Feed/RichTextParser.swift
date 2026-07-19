import Foundation
import SwiftUI

struct RichTextParser {
  static let sentinel = "__35MM_RICH_TEXT_V1__"

  static func parse(_ body: String?) -> AttributedString? {
    guard let body else { return nil }

    guard body.hasPrefix(sentinel) else {
      return AttributedString(body)
    }

    let json = String(body.dropFirst(sentinel.count))
    guard let data = json.data(using: .utf8) else {
      return AttributedString(body)
    }

    do {
      let document = try JSONDecoder().decode(TipTapNode.self, from: data)
      var output = render(document)
      trimTrailingNewlines(&output)
      return output
    } catch {
      #if DEBUG
        print("Unsupported or malformed rich text payload: \(error.localizedDescription)")
      #endif
      return AttributedString(body)
    }
  }

  private static func render(_ node: TipTapNode) -> AttributedString {
    switch node.type {
    case "doc":
      return renderChildren(node.content)
    case "paragraph":
      var text = renderChildren(node.content)
      text.append(AttributedString("\n"))
      return text
    case "text":
      return markedText(node.text ?? "", marks: node.marks ?? [])
    case "mention":
      return mentionText(label: node.attrs?.label)
    case "hardBreak":
      return AttributedString("\n")
    default:
      #if DEBUG
        print("Unsupported rich text node: \(node.type)")
      #endif
      return fallbackText(for: node)
    }
  }

  private static func renderChildren(_ children: [TipTapNode]?) -> AttributedString {
    var output = AttributedString()
    for child in children ?? [] {
      output.append(render(child))
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

  private static func fallbackText(for node: TipTapNode) -> AttributedString {
    if let text = node.text {
      return AttributedString(text)
    }

    return renderChildren(node.content)
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

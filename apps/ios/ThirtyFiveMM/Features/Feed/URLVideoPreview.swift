import Foundation

struct URLVideoPreview: Equatable, Identifiable {
  enum Provider: String {
    case youtube
    case vimeo
    case dailymotion

    var label: String {
      switch self {
      case .youtube:
        "YouTube"
      case .vimeo:
        "Vimeo"
      case .dailymotion:
        "Dailymotion"
      }
    }
  }

  let provider: Provider
  let videoID: String
  let url: URL
  let thumbnailURL: URL

  var id: String {
    "\(provider.rawValue):\(videoID):\(url.absoluteString)"
  }

  init?(linkPreview: LinkPreview) {
    guard let preview = Self(urlString: linkPreview.url) else { return nil }

    provider = preview.provider
    videoID = preview.videoID
    url = preview.url
    thumbnailURL = linkPreview.imageUrl.flatMap(URL.init(string:)) ?? preview.thumbnailURL
  }

  static func previews(inStoredText body: String?, suppressingURL: String? = nil) -> [Self] {
    guard
      let rendered = RichTextParser.parse(body, suppressingURL: suppressingURL)
    else {
      return []
    }

    return previews(in: String(rendered.characters))
  }

  static func previews(in text: String) -> [Self] {
    var seenURLs = Set<String>()
    var results: [Self] = []

    for token in text.split(whereSeparator: \Character.isWhitespace) {
      let rawToken = String(token)
      guard
        let schemeRange = rawToken.range(of: "https://", options: .caseInsensitive)
          ?? rawToken.range(of: "http://", options: .caseInsensitive)
      else {
        continue
      }

      let candidate = String(rawToken[schemeRange.lowerBound...])
        .trimmingCharacters(in: trailingURLPunctuation)
      guard let preview = Self(urlString: candidate) else { continue }
      guard seenURLs.insert(preview.url.absoluteString).inserted else { continue }
      results.append(preview)
    }

    return results
  }

  private init?(urlString: String) {
    guard
      let url = URL(string: urlString),
      let scheme = url.scheme?.lowercased(),
      scheme == "http" || scheme == "https",
      let rawHost = url.host?.lowercased()
    else {
      return nil
    }

    let host = rawHost.hasPrefix("www.") ? String(rawHost.dropFirst(4)) : rawHost
    let pathComponents = url.pathComponents.filter { $0 != "/" }

    if host == "youtu.be", let videoID = pathComponents.first, !videoID.isEmpty {
      self.init(
        provider: .youtube,
        videoID: videoID,
        url: url,
        thumbnailURL: URL(string: "https://img.youtube.com/vi/\(videoID)/hqdefault.jpg")
      )
      return
    }

    if host == "youtube.com" || host == "m.youtube.com" {
      let videoID: String?
      if url.path == "/watch" {
        videoID = URLComponents(url: url, resolvingAgainstBaseURL: false)?
          .queryItems?
          .first(where: { $0.name == "v" })?
          .value
      } else if pathComponents.first == "shorts" || pathComponents.first == "embed" {
        videoID = pathComponents.dropFirst().first
      } else {
        videoID = nil
      }

      if let videoID, !videoID.isEmpty {
        self.init(
          provider: .youtube,
          videoID: videoID,
          url: url,
          thumbnailURL: URL(string: "https://img.youtube.com/vi/\(videoID)/hqdefault.jpg")
        )
        return
      }
    }

    if host == "vimeo.com" || host == "player.vimeo.com" {
      let videoID = pathComponents.first(where: { !$0.isEmpty && $0.allSatisfy(\.isNumber) })
      if let videoID {
        self.init(
          provider: .vimeo,
          videoID: videoID,
          url: url,
          thumbnailURL: URL(string: "https://vumbnail.com/\(videoID).jpg")
        )
        return
      }
    }

    let dailymotionID: String?
    if host == "dai.ly" {
      dailymotionID = pathComponents.first
    } else if host == "dailymotion.com", pathComponents.first == "video" {
      dailymotionID = pathComponents.dropFirst().first?.split(separator: "_").first.map(String.init)
    } else {
      dailymotionID = nil
    }

    if let dailymotionID, !dailymotionID.isEmpty {
      self.init(
        provider: .dailymotion,
        videoID: dailymotionID,
        url: url,
        thumbnailURL: URL(
          string: "https://www.dailymotion.com/thumbnail/video/\(dailymotionID)"
        )
      )
      return
    }

    return nil
  }

  private init?(
    provider: Provider,
    videoID: String,
    url: URL,
    thumbnailURL: URL?
  ) {
    guard let thumbnailURL else { return nil }
    self.provider = provider
    self.videoID = videoID
    self.url = url
    self.thumbnailURL = thumbnailURL
  }

  private static let trailingURLPunctuation = CharacterSet(charactersIn: "),.!?;:")
}

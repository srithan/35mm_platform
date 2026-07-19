import Foundation

extension Date {
  var relativeDisplayString: String {
    RelativeDateTimeFormatter().localizedString(for: self, relativeTo: Date())
  }

  var relativeShort: String {
    let now = Date()
    let seconds = max(Int(now.timeIntervalSince(self)), 0)

    if seconds < 60 {
      return "just now"
    }

    let minutes = seconds / 60
    if minutes < 60 {
      return "\(minutes)m"
    }

    let hours = minutes / 60
    if hours < 24 {
      return "\(hours)h"
    }

    let days = hours / 24
    if days < 7 {
      return "\(days)d"
    }

    var format = Date.FormatStyle()
      .month(.abbreviated)
      .day()

    if !Calendar.current.isDate(self, equalTo: now, toGranularity: .year) {
      format = format.year()
    }

    return formatted(format)
  }

  var feedRelativeShort: String {
    feedRelativeShort(relativeTo: Date())
  }

  func feedRelativeShort(relativeTo now: Date) -> String {
    let seconds = max(Int(now.timeIntervalSince(self)), 0)

    if seconds < 60 {
      return "now"
    }

    let minutes = seconds / 60
    if minutes < 60 {
      return "\(minutes)m"
    }

    let hours = minutes / 60
    if hours < 24 {
      return "\(hours)h"
    }

    return "\(hours / 24)d"
  }
}

import Foundation

extension Int {
  var compactFormatted: String {
    let absolute = abs(self)

    if absolute < 1_000 {
      return String(self)
    }

    if absolute < 1_000_000 {
      return compactString(dividingBy: 1_000, suffix: "K")
    }

    return compactString(dividingBy: 1_000_000, suffix: "M")
  }

  private func compactString(dividingBy divisor: Int, suffix: String) -> String {
    let value = Double(self) / Double(divisor)
    let rounded = (value * 10).rounded() / 10

    if rounded.truncatingRemainder(dividingBy: 1) == 0 {
      return "\(Int(rounded))\(suffix)"
    }

    return String(format: "%.1f%@", rounded, suffix)
  }
}

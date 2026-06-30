import SwiftUI
import UIKit

enum ChatBlurhash {
  static func image(from blurhash: String?, width: Int = 24, height: Int = 24) -> UIImage? {
    guard let blurhash, blurhash.count >= 6 else { return nil }
    let chars = Array(blurhash)
    guard
      let sizeFlag = decode83(chars[0]),
      let quantizedMaximumValue = decode83(chars[1])
    else {
      return nil
    }

    let componentsY = (sizeFlag / 9) + 1
    let componentsX = (sizeFlag % 9) + 1
    let expectedLength = 4 + 2 * componentsX * componentsY
    guard blurhash.count == expectedLength else { return nil }

    let maximumValue = Double(quantizedMaximumValue + 1) / 166.0
    guard let dcValue = decode83(String(chars[2...5])) else { return nil }

    var colors: [(Double, Double, Double)] = [decodeDC(dcValue)]
    var index = 6
    for _ in 1..<(componentsX * componentsY) {
      let end = index + 1
      guard end < chars.count, let acValue = decode83(String(chars[index...end])) else {
        return nil
      }
      colors.append(decodeAC(acValue, maximumValue: maximumValue))
      index += 2
    }

    let pixelCount = width * height
    var pixels = [UInt8](repeating: 255, count: pixelCount * 4)

    for y in 0..<height {
      for x in 0..<width {
        var red = 0.0
        var green = 0.0
        var blue = 0.0

        for componentY in 0..<componentsY {
          for componentX in 0..<componentsX {
            let basis = cos(Double.pi * Double(x) * Double(componentX) / Double(width))
              * cos(Double.pi * Double(y) * Double(componentY) / Double(height))
            let color = colors[componentX + componentY * componentsX]
            red += color.0 * basis
            green += color.1 * basis
            blue += color.2 * basis
          }
        }

        let offset = (x + y * width) * 4
        pixels[offset] = encodeSRGB(red)
        pixels[offset + 1] = encodeSRGB(green)
        pixels[offset + 2] = encodeSRGB(blue)
      }
    }

    guard
      let provider = CGDataProvider(data: Data(pixels) as CFData),
      let cgImage = CGImage(
        width: width,
        height: height,
        bitsPerComponent: 8,
        bitsPerPixel: 32,
        bytesPerRow: width * 4,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue),
        provider: provider,
        decode: nil,
        shouldInterpolate: true,
        intent: .defaultIntent
      )
    else {
      return nil
    }

    return UIImage(cgImage: cgImage)
  }

  private static let alphabet = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~")

  private static func decode83(_ character: Character) -> Int? {
    alphabet.firstIndex(of: character)
  }

  private static func decode83(_ value: String) -> Int? {
    var result = 0
    for character in value {
      guard let digit = decode83(character) else { return nil }
      result = result * 83 + digit
    }
    return result
  }

  private static func decodeDC(_ value: Int) -> (Double, Double, Double) {
    (
      decodeSRGB(value >> 16),
      decodeSRGB((value >> 8) & 255),
      decodeSRGB(value & 255)
    )
  }

  private static func decodeAC(_ value: Int, maximumValue: Double) -> (Double, Double, Double) {
    let quantizedRed = value / (19 * 19)
    let quantizedGreen = (value / 19) % 19
    let quantizedBlue = value % 19

    return (
      signPow((Double(quantizedRed) - 9.0) / 9.0, 2.0) * maximumValue,
      signPow((Double(quantizedGreen) - 9.0) / 9.0, 2.0) * maximumValue,
      signPow((Double(quantizedBlue) - 9.0) / 9.0, 2.0) * maximumValue
    )
  }

  private static func decodeSRGB(_ value: Int) -> Double {
    let normalized = Double(value) / 255.0
    if normalized <= 0.04045 {
      return normalized / 12.92
    }
    return pow((normalized + 0.055) / 1.055, 2.4)
  }

  private static func encodeSRGB(_ value: Double) -> UInt8 {
    let clamped = min(1.0, max(0.0, value))
    let encoded: Double
    if clamped <= 0.0031308 {
      encoded = clamped * 12.92
    } else {
      encoded = 1.055 * pow(clamped, 1.0 / 2.4) - 0.055
    }
    return UInt8(min(255, max(0, Int(encoded * 255.0 + 0.5))))
  }

  private static func signPow(_ value: Double, _ exponent: Double) -> Double {
    (value < 0 ? -1.0 : 1.0) * pow(abs(value), exponent)
  }
}

struct ChatBlurhashPlaceholder: View {
  let blurhash: String?

  var body: some View {
    ZStack {
      if let image = ChatBlurhash.image(from: blurhash) {
        Image(uiImage: image)
          .resizable()
          .scaledToFill()
          .blur(radius: 10)
      } else {
        Rectangle()
          .fill(Color(.systemGray5))
      }
    }
  }
}

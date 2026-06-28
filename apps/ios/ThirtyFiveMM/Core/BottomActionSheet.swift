import SwiftUI

struct BottomActionSheetAction: Identifiable {
  let id = UUID()
  let title: String
  let systemImage: String?
  let role: ButtonRole?
  let action: () -> Void

  init(
    _ title: String,
    systemImage: String? = nil,
    role: ButtonRole? = nil,
    action: @escaping () -> Void
  ) {
    self.title = title
    self.systemImage = systemImage
    self.role = role
    self.action = action
  }
}

struct BottomActionSheetSection: Identifiable {
  let id = UUID()
  let actions: [BottomActionSheetAction]
}

struct BottomActionSheet: View {
  @Environment(\.dismiss) private var dismiss

  let title: String
  let sections: [BottomActionSheetSection]

  init(title: String, actions: [BottomActionSheetAction]) {
    self.title = title
    self.sections = [BottomActionSheetSection(actions: actions)]
  }

  init(title: String, sections: [BottomActionSheetSection]) {
    self.title = title
    self.sections = sections
  }

  var body: some View {
    ZStack(alignment: .bottom) {
      Color.black.opacity(0.22)
        .ignoresSafeArea()
        .onTapGesture {
          dismiss()
        }

      VStack(spacing: 12) {
        Capsule()
          .fill(Color(.systemGray3))
          .frame(width: 40, height: 5)
          .padding(.top, 12)

        if !title.isEmpty {
          Text(title)
            .font(.system(size: 12, weight: .bold, design: .rounded))
            .foregroundStyle(Color(.systemGray))
            .textCase(.uppercase)
            .tracking(0.8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 26)
            .accessibilityHidden(true)
        }

        VStack(spacing: 10) {
          ForEach(sections) { section in
            VStack(spacing: 0) {
              ForEach(section.actions) { item in
                actionRow(item)

                if item.id != section.actions.last?.id {
                  Divider()
                    .overlay(Color(.separator).opacity(0.35))
                    .padding(.leading, 18)
                }
              }
            }
            .background(Color(red: 0.95, green: 0.95, blue: 0.96), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
          }
        }
      }
      .padding(.horizontal, 16)
      .padding(.bottom, 20)
      .frame(maxWidth: .infinity)
      .background(
        UnevenRoundedRectangle(
          topLeadingRadius: 28,
          bottomLeadingRadius: 0,
          bottomTrailingRadius: 0,
          topTrailingRadius: 28,
          style: .continuous
        )
        .fill(Color.white)
        .ignoresSafeArea(edges: .bottom)
      )
    }
    .ignoresSafeArea()
    .presentationBackground(.clear)
  }

  private func actionRow(_ item: BottomActionSheetAction) -> some View {
    Button(role: item.role) {
      dismiss()
      item.action()
    } label: {
      HStack(spacing: 16) {
        Text(item.title)
          .font(.system(size: 18, weight: .semibold, design: .rounded))
          .foregroundStyle(item.role == .destructive ? Color(red: 1.0, green: 0.02, blue: 0.22) : Color.black)
          .lineLimit(1)
          .minimumScaleFactor(0.78)

        Spacer(minLength: 16)

        if let systemImage = item.systemImage {
          Image(systemName: systemImage)
            .font(.system(size: 22, weight: .medium))
            .foregroundStyle(item.role == .destructive ? Color(red: 1.0, green: 0.02, blue: 0.22) : Color.black)
            .frame(width: 30)
        }
      }
      .frame(maxWidth: .infinity, minHeight: 58, alignment: .leading)
      .padding(.horizontal, 18)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
  }
}

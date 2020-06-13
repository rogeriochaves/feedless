//
//  Button.swift
//  feedless
//
//  Created by Rogerio Chaves on 24/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct PrimaryButton : View {
    private let action: () -> Void
    private let text: String
    private let color: Color

    @EnvironmentObject var context : Context
    @State private var menuOpen = false

    init(text: String, color: Color = Styles.primaryBlue, action: @escaping () -> Void) {
        self.action = action
        self.text = text
        self.color = color
    }

    var body: some View {
        Button(action: action) {
            Text(self.text).lineLimit(1)
        }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .background(self.color)
            .foregroundColor(Color.black)
            .cornerRadius(5)
            .overlay(
                RoundedRectangle(cornerRadius: 5)
                    .stroke(Styles.darkGray, lineWidth: 1)
            )
    }
}

struct PrimaryButton_Previews: PreviewProvider {
    static var previews: some View {
        PrimaryButton(text: "Test button", action: {})
    }
}

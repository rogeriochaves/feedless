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

    @EnvironmentObject var context : Context
    @State private var menuOpen = false

    init(text: String, action: @escaping () -> Void) {
        self.action = action
        self.text = text
    }

    var body: some View {
        Button(action: action) {
            Text("Publish")
        }
            .padding(.vertical, 10)
            .padding(.horizontal, 15)
            .background(Styles.primaryBlue)
            .foregroundColor(Color.black)
            .cornerRadius(10)
    }
}

struct PrimaryButton_Previews: PreviewProvider {
    static var previews: some View {
        PrimaryButton(text: "Test button", action: {})
    }
}

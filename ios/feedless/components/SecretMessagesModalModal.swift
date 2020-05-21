//
//  SecretMessages.swift
//  feedless
//
//  Created by Rogerio Chaves on 21/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct SecretMessagesModal : View {
    private var onClose : () -> ()
    @State private var messages: [SecretMessage]
    @EnvironmentObject var context : Context
    @State private var menuOpen = false
    @State private var step = 0

    init(messages: [SecretMessage], onClose: @escaping () -> ()) {
        _messages = State(initialValue: messages)
        self.onClose = onClose
    }

    func nextStep() {
        self.step += 1
        if self.step >= self.messages.count {
            self.step -= 1
            self.onClose()
        }
    }

    var body: some View {
        VStack {
            HStack {
                ForEach(0..<messages.count) { index in
                    Capsule()
                        .frame(height: 3)
                        .foregroundColor(self.step == index ? Styles.darkGray : Styles.gray)
                }
            }
            .padding()
            ForEach((0..<messages.count), id: \.self) { index in
                Group {
                    if (self.step == index) {
                        Text(self.messages[index].value.content.text)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .font(.system(size: 35))
                            .lineSpacing(10)
                            .multilineTextAlignment(.center)
                            .padding(20)
                    }
                }
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            self.nextStep()
        }
    }
}

struct SecretMessagesModal_Previews: PreviewProvider {
    static var previews: some View {
        SecretMessagesModal(messages: [
            Entry(
                key: "secret1key",
                value: AuthorContent(
                    author: "authorkey",
                    content: Post(
                        text: "first secret, don't tell anybody, and it's a big secret so we test line-breaking"
                    )
                )
            ),
            Entry(
                key: "secret2key",
                value: AuthorContent(
                    author: "authorkey",
                    content: Post(
                        text: "second secret!"
                    )
                )
            )
        ], onClose: {})
    }
}

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
    private var onSubmit : (String) -> ()
    @State private var chat: SecretChat
    private var messages: [SecretMessage]
    @State private var menuOpen = false
    @State private var step = 0
    @State var message = ""
    @ObservedObject private var keyboard = KeyboardResponder()
    @State private var focusOnCompose : Bool? = false
    @State private var composePlaceholder : String? = "Write a message"

    init(chat: SecretChat, onClose: @escaping () -> (), onSubmit: @escaping (String) -> ()) {
        _chat = State(initialValue: chat)
        self.messages = chat.messages.reversed()
        self.onClose = onClose
        self.onSubmit = onSubmit
    }

    func nextStep() {
        self.step += 1
        if self.step >= self.messages.count {
            self.step -= 1
            self.onClose()
        }
    }

    var messagesPassing: some View {
        Group {
            HStack {
                ForEach(0..<self.messages.count) { index in
                    Capsule()
                        .frame(height: 3)
                        .foregroundColor(self.step == index ? Styles.darkGray : Styles.gray)
                }
            }
            .padding()
            VStack {
                ForEach((0..<self.messages.count), id: \.self) { index in
                    Group {
                        if (self.step == index) {
                            Text(self.messages[index].value.content.text ?? "")
                                .font(.system(size: 35))
                                .lineSpacing(10)
                                .multilineTextAlignment(.center)
                                .padding(20)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .contentShape(Rectangle())
            .onTapGesture {
                self.nextStep()
            }
        }
    }

    var messageField : some View {
        HStack {
            VStack {
                FocusableTextField(
                    text: self.$message,
                    nextResponder: .constant(nil),
                    isResponder: self.$focusOnCompose,
                    placeholder: self.$composePlaceholder,
                    isSecured: false,
                    keyboard: .default
                )
                .frame(height: 20)
                .padding(.leading)
                .padding(.vertical)
            }

            if self.message.count > 0 {
                Button(action: {
                    self.onSubmit(self.message)
                    self.message = ""
                    self.nextStep()
                }) {
                    Text("Send")
                }
                .padding()
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: 15)
                .stroke(Styles.gray, lineWidth: 1)
        )
        .padding(.horizontal)
        .padding(.bottom, keyboard.currentHeight)
        .edgesIgnoringSafeArea(.bottom)
        .animation(.easeOut(duration: 0.16))
    }

    var body: some View {
        VStack {
            messagesPassing
            messageField
        }.onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                if self.messages.count == 0 {
                    self.focusOnCompose = true
                }
            }
        }
    }
}

struct SecretMessagesModal_Previews: PreviewProvider {
    static var previews: some View {
        SecretMessagesModal(
            chat:
                SecretChat(
                    messages: [
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
                    ],
                    author: "foo",
                    authorProfile: Profile(
                        id: "foo",
                        name: nil,
                        image: nil
                    )
                ),
            onClose: {},
            onSubmit: { _ in }
        )
    }
}

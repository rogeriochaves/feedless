//
//  SecretsScreen.swift
//  feedless
//
//  Created by Rogerio Chaves on 21/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct SecretsScreen : View {
    @EnvironmentObject var context : Context
    @EnvironmentObject var secrets : Secrets
    @EnvironmentObject var imageLoader : ImageLoader
    @State private var modal : SecretMessagesModal? = nil

    private var isModalOpen: Binding<Bool> { Binding (
        get: { self.modal != nil },
        set: { _ in }
    )}

    func newMessagesText(_ chat: SecretChat) -> some View {
        if chat.messages.count > 0 {
            return Text(chat.messages.count == 1 ? "1 new message" : "\(chat.messages.count) new messages")
                .font(.subheadline)
        }
        return Text("No new secrets").font(.subheadline)
    }

    func secretChats(_ secrets : [SecretChat]) -> some View {
        return Section {
            ForEach(secrets, id: \.author) { chat in
                Button(action: {
                    self.secrets.vanish(context: self.context, chat: chat)
                    self.modal = SecretMessagesModal(
                        chat: chat,
                        onClose: {
                            self.modal = nil
                        },
                        onSubmit: { message in
                            self.secrets.publish(context: self.context, chat: chat, message: message)
                        }
                    )
                }) {
                    HStack {
                        AsyncImage(url: Utils.avatarUrl(profile: chat.authorProfile), imageLoader: self.imageLoader)
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 48, height: 48)
                            .border(Styles.darkGray)
                        VStack(alignment: .leading) {
                            Text(chat.authorProfile.name ?? "unknown")
                            self.newMessagesText(chat)
                        }
                    }
                }.foregroundColor(.primary)
            }
        }
    }

    func secretsFetchingState() -> some View {
        switch secrets.secrets {
        case .loading:
            return AnyView(Text("Loading..."))
        case let .success(secrets):
            return AnyView(
                Form {
                    secretChats(secrets)
                        .sheet(isPresented: isModalOpen, content: {
                            self.modal!
                        })
                }
            )
        case let .error(message):
            return AnyView(Text(message))
        }
    }

    var body: some View {
        secretsFetchingState()
            .navigationBarTitle(Text("Secrets"))
            .onAppear() {
                self.secrets.load(context: self.context)
            }
    }
}

struct SecretsScreen_Previews: PreviewProvider {
    static var previews: some View {
        SecretsScreen()
            .environmentObject(Samples.context())
            .environmentObject(Samples.secrets())
            .environmentObject(ImageLoader())
    }
}



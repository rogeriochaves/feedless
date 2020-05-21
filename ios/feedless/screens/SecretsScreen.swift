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
    @State private var selection = 0

    func secretChats(_ secrets : [SecretChat]) -> some View {
        return Section {
            ForEach(secrets, id: \.author) { chat in
                //NavigationLink(destination: ProfileScreen(id: friend.id)) {
                    HStack {
                        AsyncImage(url: Utils.avatarUrl(profile: chat.authorProfile), imageLoader: self.imageLoader)
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 32, height: 32)
                            .border(Styles.darkGray)
                        Text(chat.authorProfile.name ?? "unknown")
                    }
                //}
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



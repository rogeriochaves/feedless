//
//  FriendsScreen.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct FriendsScreen : View {
    @EnvironmentObject var context : Context
    @EnvironmentObject var profiles : Profiles
    @EnvironmentObject var imageLoader : ImageLoader
    @State private var selection = 0

    func friendsList(_ title: String, _ friends : [Profile]) -> some View {
        return Section {
            Text(title).font(.headline)
            ForEach(friends, id: \.id) { friend in
                NavigationLink(destination: ProfileScreen(id: friend.id)) {
                    HStack {
                        AsyncImage(url: Utils.avatarUrl(profile: friend), imageLoader: self.imageLoader)
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 32, height: 32)
                            .border(Styles.darkGray)
                        Text(friend.name ?? "unknown")
                    }
                }
            }
        }
    }

    func friendsLists() -> some View {
        if let ssbKey = context.ssbKey, let profile = profiles.profiles[ssbKey.id] {
            switch profile {
            case .notAsked:
                return AnyView(EmptyView())
            case .loading:
                return AnyView(Text("Loading..."))
            case let .success(profile):
                return AnyView(
                    Form {
                        if profile.friends.requestsReceived.count > 0 {
                            friendsList("Friend Requests", profile.friends.requestsReceived)
                        }

                        friendsList("Friends", profile.friends.friends)

                        if profile.friends.requestsSent.count > 0 {
                            friendsList("Requests Sent", profile.friends.requestsSent)
                        }
                    }
                )
            case let .error(message):
                return AnyView(Text(message))
            }
        } else {
            return AnyView(Text("Loading..."))
        }
    }

    var body: some View {
        friendsLists()
            .navigationBarTitle(Text("Friends"))
    }
}

struct FriendsScreen_Previews: PreviewProvider {
    static var previews: some View {
        FriendsScreen()
            .environmentObject(Samples.context())
            .environmentObject(Samples.profiles())
            .environmentObject(ImageLoader())
    }
}


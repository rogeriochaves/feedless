//
//  CommunitiesList.swift
//  feedless
//
//  Created by Rogerio Chaves on 23/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct CommunitiesList : View {
    @EnvironmentObject var context : Context
    @EnvironmentObject var profiles : Profiles
    @EnvironmentObject var imageLoader : ImageLoader
    @EnvironmentObject var router : Router
    @State private var selection = 0

    func communitiesList() -> some View {
        if let ssbKey = context.ssbKey, let profile = profiles.profiles[ssbKey.id] {
            switch profile {
            case .notAsked:
                return AnyView(EmptyView())
            case .loading:
                return AnyView(Text("Loading..."))
            case let .success(profile):
                return AnyView(
                    Form {
                        ForEach(profile.communities, id: \.self) { community in
                            NavigationLink(destination: CommunitiesShow(name: community)) {
                                HStack {
                                    Text("#\(community)")
                                }
                            }
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
        communitiesList()
            .navigationBarTitle(Text("Communities"))
            .onAppear {
                self.router.changeNavigationBarColorWithDelay(route: .communities)
            }
    }
}

struct CommunitiesList_Previews: PreviewProvider {
    static var previews: some View {
        CommunitiesList()
            .environmentObject(Samples.context())
            .environmentObject(Samples.profiles())
            .environmentObject(ImageLoader())
    }
}

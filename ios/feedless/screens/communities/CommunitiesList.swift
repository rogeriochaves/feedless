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
    @EnvironmentObject var communities : Communities
    @State private var selection = 0

    func communitiesExplore() -> some View {
        switch communities.exploreResponse {
        case let .success(response):
            return AnyView(
                ForEach(response.communities, id: \.self) { community in
                    NavigationLink(destination: CommunitiesShow(name: community)) {
                        Text("#\(community)")
                    }
                }
            )
        case .loading:
            return AnyView(
                Text("Loading...")
            )
        default:
            return AnyView(EmptyView())
        }
    }

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
                        Section {
                            Text("My communities").font(.headline)
                            ForEach(profile.communities, id: \.self) { community in
                                NavigationLink(destination: CommunitiesShow(name: community)) {
                                    Text("#\(community)")
                                }
                            }
                        }

                        Section {
                            Text("Explore").font(.headline)
                            communitiesExplore()
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
        UITableView.appearance().backgroundColor = Styles.uiPink

        return communitiesList()
            .navigationBarTitle(Text("Communities"))
            .onAppear {
                self.router.updateNavigationBarColor(route: .communities)
                self.communities.loadExplore(context: self.context)
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

//
//  CommunitiesShow.swift
//  feedless
//
//  Created by Rogerio Chaves on 23/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct CommunitiesShow : View {
    @EnvironmentObject var context : Context
    @EnvironmentObject var communities : Communities
    @EnvironmentObject var imageLoader : ImageLoader
    @EnvironmentObject var profiles : Profiles
    @EnvironmentObject var router : Router
    @State private var selection = 0
    private var name : String

    init(name : String) {
        self.name = name
    }

    func communitiesList() -> some View {
        if let community = communities.communities[self.name] {
            switch community {
            case .notAsked:
                return AnyView(EmptyView())
            case .loading:
                return AnyView(Text("Loading..."))
            case let .success(community):
                return AnyView(
                    Form {
                        ForEach(community.topics.sorted(by: { a, b in
                            a.rts ?? 0 < b.rts ?? 0
                        }), id: \.key) { topic in
                            NavigationLink(destination: CommunitiesTopic(name: community.name, topicKey: topic.key)) {
                                HStack {
                                    Text(Utils.topicTitle(topic))
                                    Spacer()
                                    Text("💬 \(topic.value.content.replies.count) replies")
                                }
                            }
                        }
                    }
                    .navigationBarTitle("#\(community.name)")
                    .navigationBarItems(trailing: joinLeaveButton(community: community))
                )
            case let .error(message):
                return AnyView(Text(message))
            }
        } else {
            return AnyView(Text("Loading..."))
        }
    }

    func joinLeaveButton(community: CommunityDetails) -> PrimaryButton {
        if community.isMember {
            return PrimaryButton(text: "Leave", color: Color(Styles.uiPink)) {
                self.communities.subscribe(context: self.context, profiles: self.profiles, name: self.name, subscribed: false)
            }
        } else {
            return PrimaryButton(text: "Join", color: Color(Styles.uiPink)) {
                self.communities.subscribe(context: self.context, profiles: self.profiles, name: self.name, subscribed: true)
            }
        }
    }

    var body: some View {
        UITableView.appearance().backgroundColor = Styles.uiPink

        return communitiesList()
            .onAppear() {
                self.communities.load(context: self.context, name: self.name)
                self.router.updateNavigationBarColor(route: .communities)
            }
    }
}

struct CommunitiesShow_Previews: PreviewProvider {
    static var previews: some View {
        NavigationMenu {
            CommunitiesShow(name: "ssb-clients")
        }
            .environmentObject(Samples.context())
            .environmentObject(Samples.communities())
            .environmentObject(ImageLoader())
            .environmentObject(Samples.profiles())
            .environmentObject(Router())
    }
}

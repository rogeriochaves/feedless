//
//  CommunitiesShow.swift
//  feedless
//
//  Created by Rogerio Chaves on 23/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct CommunitiesTopic : View {
    @EnvironmentObject var context : Context
    @EnvironmentObject var communities : Communities
    @EnvironmentObject var imageLoader : ImageLoader
    @State private var selection = 0
    private var name : String
    private var topicKey : String

    init(name : String, topicKey : String) {
        self.name = name
        self.topicKey = topicKey
    }

    func findTopic(_ community : CommunityDetails) -> TopicEntry? {
        return community.topics.first(where: { $0.key == self.topicKey })
    }

    func topicWithReplies(_ topic : TopicEntry) -> Posts {
        let firstPost = Entry(
            key: topic.key,
            value: AuthorProfileContent(
                author: topic.value.author,
                authorProfile: topic.value.authorProfile,
                content: Post(text: topic.value.content.text)
            )
        )
        var allPosts = [firstPost]
        allPosts.append(contentsOf: topic.value.content.replies)
        return allPosts
    }

    func topicReplies() -> some View {
        if let community = communities.communities[self.name] {
            switch community {
            case .loading:
                return AnyView(Text("Loading..."))
            case let .success(community):
                if let topic = findTopic(community) {
                    return AnyView(
                        ScrollView {
                            Divider()
                            PostsList(topicWithReplies(topic), limit: 10_000)
                        }
                        .navigationBarTitle(Utils.topicTitle(topic))
                    )
                } else {
                    return AnyView(Text("Topic not found"))
                }
            case let .error(message):
                return AnyView(Text(message))
            }
        } else {
            return AnyView(Text("Loading..."))
        }
    }

    var body: some View {
        topicReplies()
            .onAppear() {
                self.communities.load(context: self.context, name: self.name)
            }
    }
}

struct CommunitiesTopic_Previews: PreviewProvider {
    static var previews: some View {
        NavigationMenu {
            CommunitiesTopic(name: "ssb-clients", topicKey: "%j0/mywlnDar3HJ6ED34ICxzyep3QhM0hvi1ov12A04s=.sha256")
        }
            .environmentObject(Samples.context())
            .environmentObject(Samples.communities())
            .environmentObject(ImageLoader())
    }
}

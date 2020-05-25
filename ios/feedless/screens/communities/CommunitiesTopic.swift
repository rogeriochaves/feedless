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
    @EnvironmentObject var profiles : Profiles
    @EnvironmentObject var imageLoader : ImageLoader
    @State private var selection = 0
    private var name : String
    private var topicKey : String

    @ObservedObject private var keyboard = KeyboardResponder()
    @State private var reply = ""
    @State private var isReplyFocused = false

    func keyboardOffset() -> CGFloat {
        return [keyboard.currentHeight - 110, CGFloat(0)].max()! * -1
    }

    init(name : String, topicKey : String) {
        self.name = name
        self.topicKey = topicKey
    }

    var composer : some View {
        VStack {
            MultilineTextField("Reply to this topic",
                text: $reply,
                isResponder: $isReplyFocused
            )
                .padding(5)
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Styles.gray, lineWidth: 1)
                )
            HStack {
                Spacer()
                PrimaryButton(text: "Publish", action: {
                    self.communities.replyToTopic(context: self.context, profiles: self.profiles, name: self.name, topicKey: self.topicKey, reply: self.reply)
                    self.reply = ""
                })
            }
        }
        .padding(.horizontal, 10)
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
            case .notAsked:
                return AnyView(EmptyView())
            case .loading:
                return AnyView(Text("Loading..."))
            case let .success(community):
                if let topic = findTopic(community) {
                    return AnyView(
                        ScrollView {
                            VStack {
                                Divider()
                                PostsList(topicWithReplies(topic), limit: 10_000)
                                composer
                                    .padding(.bottom, 10)
                            }
                            .offset(y: keyboardOffset())
                            .animation(.easeOut(duration: 0.16))
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
                if self.communities.communities[self.name] == nil {
                    self.communities.load(context: self.context, name: self.name)
                }
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

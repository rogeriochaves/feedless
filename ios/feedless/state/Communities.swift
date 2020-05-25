//
//  Communities.swift
//  feedless
//
//  Created by Rogerio Chaves on 23/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

typealias Topics = [TopicEntry]

typealias TopicEntry = Entry<AuthorProfileContent<Topic>>

struct Topic: Codable {
    public var title: String?
    public var text: String
    public var replies: Posts
}

struct CommunityDetails : Codable {
    public var name: String
    public var topics: Topics
    public var members: [Profile]
    public var isMember: Bool
}

class Communities: ObservableObject {
    @Published var communities : [String: ServerData<CommunityDetails>] = [:]

    func load(context: Context, name: String) {
        if self.communities[name] == nil {
            self.communities[name] = .loading
        }

        dataLoad(path: "/communities/\(name)", type: CommunityDetails.self, context: context) {(result) in
            DispatchQueue.main.async {
                let currentValue = self.communities[name]

                switch (currentValue, result) {
                case (.success(_), .error):
                    break // Do not overwrite previous success with error
                default:
                    self.communities[name] = result
                }
            }
        }
    }

    func replyToTopic(context: Context, profiles: Profiles, name: String, topicKey: String, reply: String) {
        let cleanTopicKey = topicKey.replacingOccurrences(of: "%", with: "")
        if
            let author = context.ssbKey?.id,
            case .success(let authorProfile) = profiles.profiles[author],
            case .success(var community) = self.communities[name],
            let topicIndex = community.topics.firstIndex(where: { $0.key == topicKey })
        {
            let url = URL(string: "http://127.0.0.1:3000/communities/\(name)")!
            let config = URLSessionConfiguration.default
            let session = URLSession(configuration: config)
            URLCache.shared.removeCachedResponse(for: session.dataTask(with: url))

            dataPost(path: "/communities/\(name)/\(cleanTopicKey)/publish", parameters: [ "reply": reply ], type: PostResult.self, context: context) {(result) in
                self.load(context: context, name: name)
            }

            DispatchQueue.main.async {
                let newPost : Entry<AuthorProfileContent<Post>> = Entry(
                    key: "",
                    value: AuthorProfileContent(
                        author: author,
                        authorProfile: authorProfile.profile,
                        content: Post(text: reply)
                    )
                )
                community.topics[topicIndex].value.content.replies.append(newPost)
                self.communities[name] = .success(community)
            }
        }
    }
}

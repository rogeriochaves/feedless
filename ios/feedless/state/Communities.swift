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
}

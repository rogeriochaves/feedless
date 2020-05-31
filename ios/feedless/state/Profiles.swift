//
//  Posts.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

struct Friendslists : Codable {
    public var requestsReceived: [Profile]
    public var friends: [Profile]
    public var requestsSent: [Profile]
}

struct FullProfile : Codable {
    public var profile: Profile
    public var posts: Posts
    public var friends: Friendslists
    public var communities: [String]
    public var friendshipStatus: String
    public var description: String?
}

class Profiles: ObservableObject {
    @Published var profiles : [String: ServerData<FullProfile>] = [:]

    func load(context: Context, id: String) {
        if self.profiles[id] == nil {
            self.profiles[id] = .loading
        }

        dataLoad(path: "/profile/\(id)", type: FullProfile.self, context: context) {(result) in
            DispatchQueue.main.async {
                let currentValue = self.profiles[id]

                switch (currentValue, result) {
                case (.success(_), .error):
                    break // Do not overwrite previous success with error
                default:
                    self.profiles[id] = result
                }
            }
        }
    }

    func publish(context: Context, id: String, message: String) {
        if
            let author = context.ssbKey?.id,
            case .success(var profile) = self.profiles[id],
            case .success(let authorProfile) = self.profiles[author]
        {
            Utils.clearCache("/profile/\(id)")

            dataPost(path: "/profile/\(id)/publish", parameters: [ "message": message ], type: PostResult.self, context: context) {(result) in
                self.load(context: context, id: id)
            }

            DispatchQueue.main.async {
                let newPost : Entry<AuthorProfileContent<Post>> = Entry(
                    key: "",
                    value: AuthorProfileContent(
                        author: author,
                        authorProfile: authorProfile.profile,
                        content: Post(text: message)
                    ),
                    rts: Int(NSDate().timeIntervalSince1970)
                )
                profile.posts.insert(newPost, at: 0)
                self.profiles[id] = .success(profile)
            }
        }
    }

    func addFriend(context: Context, id: String) {
        if case .success(var profile) = self.profiles[id] {
            Utils.clearCache("/profile/\(id)")

            dataPost(path: "/profile/\(id)/add_friend", parameters: [:], type: PostResult.self, context: context) {(result) in
                self.load(context: context, id: id)
            }

            DispatchQueue.main.async {
                if profile.friendshipStatus == "no_relation" {
                    profile.friendshipStatus = "request_sent"
                } else if profile.friendshipStatus == "request_received" {
                    profile.friendshipStatus = "friends"
                } else if profile.friendshipStatus == "request_rejected" {
                   profile.friendshipStatus = "friends"
                }
                self.profiles[id] = .success(profile)
            }
        }
    }

    func rejectFriend(context: Context, id: String) {
        if case .success(var profile) = self.profiles[id] {
            Utils.clearCache("/profile/\(id)")

            dataPost(path: "/profile/\(id)/reject_friend", parameters: [:], type: PostResult.self, context: context) {(result) in
                self.load(context: context, id: id)
            }

            DispatchQueue.main.async {
                if profile.friendshipStatus == "request_received" {
                    profile.friendshipStatus = "request_rejected"
                } else if profile.friendshipStatus == "friends" {
                    profile.friendshipStatus = "request_received"
                } else if profile.friendshipStatus == "request_sent" {
                    profile.friendshipStatus = "no_relation"
                }
                self.profiles[id] = .success(profile)
            }
        }
    }

    func signup(context: Context, name: String, completeHandler: @escaping () -> Void) {
        dataPost(path: "/signup", parameters: [ "name": name ], type: PostResult.self, context: context, waitForIndexing: false) {(result) in
            completeHandler()
        }
    }
}

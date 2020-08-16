//
//  Posts.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

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
    @Published var blockeds : Set<String> = Set.init()

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

    func publish(context: Context, id: String, message: String, replyTo: PostEntry?) {
        if
            let author = context.ssbKey?.id,
            case .success(var profile) = self.profiles[id],
            case .success(let authorProfile) = self.profiles[author]
        {
            Utils.clearCache("/profile/\(id)")

            var parameters = [ "message": message ]
            if let replyTo_ = replyTo {
                parameters["mentionId"] = replyTo_.value.author
                parameters["mentionName"] = replyTo_.value.authorProfile.name ?? ""
                parameters["prev"] = replyTo_.key
                parameters["root"] = replyTo_.value.content.root ?? replyTo_.key
            }

            dataPost(path: "/profile/\(id)/publish", parameters: parameters, type: PostResult.self, context: context) {(result) in
                self.load(context: context, id: id)
            }

            DispatchQueue.main.async {
                let newPost : Entry<AuthorProfileContent<Post>> = Entry(
                    key: "",
                    value: AuthorProfileContent(
                        author: author,
                        authorProfile: authorProfile.profile,
                        content: Post(text: message, inReplyTo: replyTo?.value.authorProfile)
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

    func block(context: Context, id: String) {
        if case .success(var profile) = self.profiles[id] {
            Utils.clearCache("/profile/\(id)")

            blockeds.insert(id)
            dataPost(path: "/profile/\(id)/block", parameters: [:], type: PostResult.self, context: context) {(result) in
                self.load(context: context, id: id)
            }

            DispatchQueue.main.async {
                profile.friendshipStatus = "blocked"
                self.profiles[id] = .success(profile)
            }
        }
    }

    func unblock(context: Context, id: String) {
        if case .success(var profile) = self.profiles[id] {
            Utils.clearCache("/profile/\(id)")

            blockeds.remove(id)
            dataPost(path: "/profile/\(id)/unblock", parameters: [:], type: PostResult.self, context: context) {(result) in
                self.load(context: context, id: id)
            }

            DispatchQueue.main.async {
                profile.friendshipStatus = "no_relation"
                self.profiles[id] = .success(profile)
            }
        }
    }

    func signup(context: Context, name: String, image: UIImage?, completeHandler: @escaping () -> Void) {
        var resizedImage : UIImage? = nil
        if let img = image {
            resizedImage = Utils.resizeImage(image: img, targetSize: CGSize(width: 256, height: 256))
        }

        dataPostMultipart(path: "/signup", image: resizedImage, parameters: [ "name": name ], type: PostResult.self, context: context, waitForIndexing: false) {(result) in
            completeHandler()
        }
    }

    @Published var updateResult : ServerData<PostResult> = .notAsked
    func updateProfile(context: Context, name: String, bio: String, image: UIImage?, completeHandler: @escaping () -> Void) {
        if let id = context.ssbKey?.id {
            self.updateResult = .loading

            var resizedImage : UIImage? = nil
            if let img = image {
                resizedImage = Utils.resizeImage(image: img, targetSize: CGSize(width: 256, height: 256))
            }

            dataPostMultipart(path: "/about", image: resizedImage, parameters: [ "name": name, "description": bio ], type: PostResult.self, context: context) {(result) in
                self.updateResult = result
                if case .success(_) = result {
                    self.profiles[id] = .loading
                    Utils.clearCache("/profile/\(id)")
                    self.load(context: context, id: id)
                    completeHandler()
                }
            }
        }
    }

    func deletePost(context: Context, wall: String, post: PostEntry) {
        let cleanKey = post.key.replacingOccurrences(of: "%", with: "")
        if case .success(var profile) = self.profiles[wall] {
            Utils.clearCache("/profile/\(wall)")

            dataPost(path: "/delete/\(cleanKey)", parameters: [:], type: PostResult.self, context: context) {(result) in
                // nothing
            }

            DispatchQueue.main.async {
                let postIndex = profile.posts.firstIndex(where: { p in
                    p.key == post.key
                })
                if let index = postIndex {
                    if context.ssbKey?.id == post.value.author {
                        profile.posts[index].value.deleted = true
                    } else {
                        profile.posts[index].value.hidden = true
                    }
                    self.profiles[wall] = .success(profile)
                }
            }
        }
    }

    func flagPost(context: Context, post: PostEntry, reason: String) {
        let cleanKey = post.key.replacingOccurrences(of: "%", with: "")

        dataPost(path: "/flag/\(cleanKey)", parameters: ["reason": reason], type: PostResult.self, context: context) {(result) in
            // nothing
        }
    }
}

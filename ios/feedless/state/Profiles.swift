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
            let url = URL(string: "http://127.0.0.1:3000/profile/\(id)")!
            let config = URLSessionConfiguration.default
            let session = URLSession(configuration: config)
            URLCache.shared.removeCachedResponse(for: session.dataTask(with: url))

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
                    )
                )
                profile.posts.insert(newPost, at: 0)
                self.profiles[id] = .success(profile)
            }
        }

    }
}

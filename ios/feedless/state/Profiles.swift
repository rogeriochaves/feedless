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
        self.profiles[id] = .loading

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
}

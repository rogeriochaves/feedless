//
//  Pubs.swift
//  feedless
//
//  Created by Rogerio Chaves on 30/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

struct Peer : Codable {
    public var address: String
}

struct PubsResponse : Codable {
    public var peers: [Peer]
}

class Pubs: ObservableObject {
    @Published var response : ServerData<PubsResponse> = .loading
    @Published var addInviteResponse : ServerData<PostResult> = .notAsked

    func load(context: Context) {
        dataLoad(path: "/pubs", type: PubsResponse.self, context: context) {(result) in
            DispatchQueue.main.async {
                self.response = result
            }
        }
    }

    func addInvite(context: Context, invite: String) {
        dataPost(path: "/pubs/add", parameters: [ "invite_code": invite ], type: PostResult.self, context: context) {(result) in
            self.addInviteResponse = result
            if case .success(_) = result {
                Utils.clearCache("/pubs")
                self.response = .loading
                self.load(context: context)
            }
        }
    }
}

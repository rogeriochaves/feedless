//
//  Secrets.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

typealias SecretMessage = Entry<AuthorContent<Post>>

struct SecretChat : Codable {
    public var messages: [SecretMessage]
    public var author : String
    public var authorProfile: Profile
}

class Secrets: ObservableObject {
    @Published var secrets : ServerData<[SecretChat]> = .loading

    func load(context: Context) {
        if let id = context.ssbKey?.id {
            dataLoad(path: "/secrets/\(id)", type: [SecretChat].self, context: context) {(result) in
                DispatchQueue.main.async {
                    self.secrets = result
                }
            }
        }
    }
}

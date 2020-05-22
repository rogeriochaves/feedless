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

struct PostResult : Codable {
    public var result : String
}

class Secrets: ObservableObject {
    @Published var secrets : ServerData<[SecretChat]> = .loading
    var deletedKeys : [String] = []

    func filterDeleted(secrets: ServerData<[SecretChat]>) -> ServerData<[SecretChat]> {
        if case .success(var secretChats) = self.secrets {
            for index in 0..<secretChats.count {
                let messages = secretChats[index].messages.filter { message in
                    !self.deletedKeys.contains(message.key)
                }
                secretChats[index].messages = messages
            }
            return .success(secretChats)
        }
        return secrets
    }

    func load(context: Context) {
        if let id = context.ssbKey?.id {
            dataLoad(path: "/secrets/\(id)", type: [SecretChat].self, context: context) {(result) in
                DispatchQueue.main.async {
                    self.secrets = self.filterDeleted(secrets: result)
                }
            }
        }
    }

    func vanish(context: Context, chat: SecretChat) {
        let keys = chat.messages.map(\.key)
        if keys.count == 0 {
            return
        }

        if let id = context.ssbKey?.id {
            let url = URL(string: "http://127.0.0.1:3000/secrets/\(id)")!
            let config = URLSessionConfiguration.default
            let session = URLSession(configuration: config)
            URLCache.shared.removeCachedResponse(for: session.dataTask(with: url))
        }

        self.deletedKeys.append(contentsOf: keys)
        print("going to delete", keys)
        DispatchQueue.main.async {
            self.secrets = self.filterDeleted(secrets: self.secrets)
        }

        dataPost(path: "/vanish", parameters: [ "keys": keys ], type: PostResult.self, context: context) {(result) in
            self.load(context: context)
        }
    }

    func publish(context: Context, chat: SecretChat, message: String) {
        if let id = context.ssbKey?.id {
            let url = URL(string: "http://127.0.0.1:3000/secrets/\(id)")!
            let config = URLSessionConfiguration.default
            let session = URLSession(configuration: config)
            URLCache.shared.removeCachedResponse(for: session.dataTask(with: url))
        }

        dataPost(path: "/profile/\(chat.author)/publish_secret", parameters: [ "message": message ], type: PostResult.self, context: context) {(result) in
            self.load(context: context)
        }
    }
}

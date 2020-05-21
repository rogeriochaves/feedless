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
        if let id = context.ssbKey?.id {
            let url = URL(string: "http://127.0.0.1:3000/secrets/\(id)")!
            let config = URLSessionConfiguration.default
            let session = URLSession(configuration: config)
            URLCache.shared.removeCachedResponse(for: session.dataTask(with: url))
        }

        let keys = chat.messages.map(\.key)
        self.deletedKeys.append(contentsOf: keys)
        print("going to delete", keys)
        DispatchQueue.main.async {
            self.secrets = self.filterDeleted(secrets: self.secrets)
        }

        if let keysParam = keys.joined(separator: ",").addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            dataLoad(path: "/vanish?keys=\(keysParam)", type: PostResult.self, context: context) {(result) in
                self.load(context: context)
            }
        } else {
            print("Could not encode keys params", keys)
        }
    }
}

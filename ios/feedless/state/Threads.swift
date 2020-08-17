//
//  Threads.swift
//  feedless
//
//  Created by Rogerio Chaves on 17/08/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

class Threads: ObservableObject {
    @Published var posts : [String: ServerData<[PostEntry]>] = [:]

    func load(context: Context, key: String) {
        let cleanKey = key.replacingOccurrences(of: "%", with: "")
        if self.posts[key] == nil {
            self.posts[key] = .loading
        }

        dataLoad(path: "/post/\(cleanKey)", type: [PostEntry].self, context: context) {(result) in
            DispatchQueue.main.async {
                let currentValue = self.posts[key]

                switch (currentValue, result) {
                case (.success(_), .error):
                    break // Do not overwrite previous success with error
                default:
                    self.posts[key] = result
                }
            }
        }
    }

    func deletePost(context: Context, threadKey: String, post: PostEntry) {
        let cleanKey = post.key.replacingOccurrences(of: "%", with: "")
        if case .success(var posts) = self.posts[threadKey] {
            Utils.clearCache("/post/\(threadKey)")

            dataPost(path: "/delete/\(cleanKey)", parameters: [:], type: PostResult.self, context: context) {(result) in
                // nothing
            }

            DispatchQueue.main.async {
                let postIndex = posts.firstIndex(where: { p in
                    p.key == post.key
                })
                if let index = postIndex {
                    if context.ssbKey?.id == post.value.author {
                        posts[index].value.deleted = true
                    } else {
                        posts[index].value.hidden = true
                    }
                    self.posts[threadKey] = .success(posts)
                }
            }
        }
    }
}

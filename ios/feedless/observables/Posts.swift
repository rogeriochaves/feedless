//
//  Posts.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

class Posts: ObservableObject {
    @Published var posts : ServerData<[Entry<AuthorContent<Post>>]> = .loading

    func load(context: Context) {
        dataLoad(path: "/posts", type: [Entry<AuthorContent<Post>>].self, context: context) {(result) in
            DispatchQueue.main.async {
                self.posts = result
            }
        }
    }
}

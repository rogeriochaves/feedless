//
//  Posts.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

class Posts: ObservableObject {
    @Published var posts : ServerData<[Entry<AuthorContent<Post>>]> = .loading

    init () {
        print("FetchPosts initialized")
    }

    func load(context: Context) {
        let url = URL(string: "http://127.0.0.1:3000/posts")!

        let config = URLSessionConfiguration.default
        config.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        let session = URLSession(configuration: config)

        let task = session.dataTask(with: url) {(data, response, error) in
            do {
                if let rawData = data {
                    let decodedData = try JSONDecoder().decode([Entry<AuthorContent<Post>>].self, from: rawData)
                    DispatchQueue.main.async {
                        self.posts = .success(decodedData)
                    }
                } else {
                    print("No data loading posts")
                    self.posts = .error("No data loading posts")
                }
            } catch {
                print("Error loading posts")
                self.posts = .error("Error loading posts \(error)")
            }
        }

        URLCache.shared.getCachedResponse(for: task) {
            (response) in

            do {
                if let rawData = response?.data {
                    print("Cache hit");
                    let decodedData = try JSONDecoder().decode([Entry<AuthorContent<Post>>].self, from: rawData)
                    DispatchQueue.main.async {
                        self.posts = .success(decodedData)
                    }
                } else {
                    print("Cache miss");
                }
            } catch {
                print("Error parsing cache");
            }

            if context.status == .initializing || context.status == .indexing || context.indexing.current < context.indexing.target {
                print("Server still indexing, postponing fetch");
                DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
                    self.load(context: context)
                }
            } else {
                print("Going to server");
                task.resume();
            }
        }
    }
}

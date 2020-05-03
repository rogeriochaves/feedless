//
//  ContentView.swift
//  feedless
//
//  Created by Rogerio Chaves on 28/04/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct Post: Codable {
    public var text: String
}

struct AuthorContent<T: Codable>: Codable {
    public var author: String
    public var content: T
}

struct Entry<T: Codable>: Codable {
    public var key: String
    public var value: T
}

class FetchPosts: ObservableObject {
  // 1.
  @Published var posts = [Entry<AuthorContent<Post>>]()

    init() {
        let url = URL(string: "http://127.0.0.1:3000/posts")!
        // 2.
        URLSession.shared.dataTask(with: url) {(data, response, error) in
            do {
                if let todoData = data {
                    // 3.
                    let decodedData = try JSONDecoder().decode([Entry<AuthorContent<Post>>].self, from: todoData)
                    DispatchQueue.main.async {
                        self.posts = decodedData
                    }
                } else {
                    print("No data loading posts")
                }
            } catch {
                print("Error loading posts")
            }
        }.resume()
    }
}

struct Wall: View {
    @State private var selection = 0

    @ObservedObject var fetch = FetchPosts()

    var body: some View {
        TabView(selection: $selection){
            VStack {
                // 2.
                List(fetch.posts, id: \.key) { post in
                    VStack(alignment: .leading) {
                        Text(post.value.content.text)
                    }
                }
            }
                .tabItem {
                    VStack {
                        Text("🙂")
                    }
                }
                .tag(0)
            Text("Second View")
                .font(.title)
                .tabItem {
                    VStack {
                        Text("👨‍👧‍👦")
                    }
                }
                .tag(1)
        }
    }
}

struct Wall_Previews: PreviewProvider {
    static var previews: some View {
        Wall()
    }
}

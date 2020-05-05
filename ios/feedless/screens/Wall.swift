//
//  ContentView.swift
//  feedless
//
//  Created by Rogerio Chaves on 28/04/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

class FetchPosts: ObservableObject {
    @Published var posts = [Entry<AuthorContent<Post>>]()

    init() {
        let url = URL(string: "http://127.0.0.1:3000/posts")!

        URLSession.shared.dataTask(with: url) {(data, response, error) in
            do {
                if let todoData = data {
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
                List(fetch.posts, id: \.key) { post in
                    VStack(alignment: .leading) {
                        Text(post.value.content.text)
                    }
                }
            }
                .tabItem {
                    VStack {
                        Image(uiImage: "🙂".image()!).renderingMode(.original)
                        Text("Profile")
                    }
                }
                .tag(0)
            Text("Second View")
                .font(.title)
                .tabItem {
                    VStack {
                        Image(uiImage: "👨‍👧‍👦".image()!).renderingMode(.original)
                        Text("Friends")
                    }
                }
                .tag(1)
        }.accentColor(Color.purple)
    }
}

struct Wall_Previews: PreviewProvider {
    static var previews: some View {
        Wall()
    }
}

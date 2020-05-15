//
//  Profile.swift
//  feedless
//
//  Created by Rogerio Chaves on 15/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct ProfileScreen : View {
    @EnvironmentObject var context : Context
    @EnvironmentObject var posts : Posts
    @State private var selection = 0

    func viewDidLoad() {
        print("Loading posts")
        posts.load(context: context)
    }

    func postsList() -> some View {
        switch posts.posts {
        case .loading:
            return AnyView(Text("Loading..."))
        case let .success(posts):
            return AnyView(List(posts, id: \.key) { post in
                VStack(alignment: .leading) {
                    Text(post.value.content.text)
                }
            })
        case let .error(message):
            return AnyView(Text(message))
        }
    }

    var body: some View {
        postsList()
        .onAppear() {
            self.posts.load(context: self.context)
        }
    }
}

struct Profile_Previews: PreviewProvider {
    static var previews: some View {
        ProfileScreen()
        .environmentObject(Posts())
    }
}

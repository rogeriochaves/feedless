//
//  Profile.swift
//  feedless
//
//  Created by Rogerio Chaves on 15/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct ThreadScreen : View {
    let key : String
    @EnvironmentObject var context : Context
    @EnvironmentObject var imageLoader : ImageLoader
    @EnvironmentObject var threads : Threads
    @EnvironmentObject var router : Router

    init(key : String) {
        self.key = key
    }

    func postsResult() -> some View {
        if let posts = threads.posts[key] {
            switch posts {
            case .notAsked:
                return AnyView(EmptyView())
            case .loading:
                return AnyView(Text("Loading..."))
            case let .success(posts):
                return AnyView(
                    ScrollView(.vertical) {
                        PostsList(posts, reference: .Thread(key))
                    }
                )
            case let .error(message):
                return AnyView(Text(message))
            }
        } else {
            return AnyView(Text("Loading..."))
        }
    }

    var body: some View {
        postsResult()
            .onAppear() {
                self.threads.load(context: self.context, key: self.key)
                self.router.updateNavigationBarColor(route: .profile)
            }
    }
}

struct Thread_Previews: PreviewProvider {

    static var previews: some View {
        return ThreadScreen(key: "foo")
            .environmentObject(Samples.context())
            .environmentObject(ImageLoader())
            .environmentObject(Threads())
            .environmentObject(Router())
    }
}

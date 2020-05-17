//
//  Posts.swift
//  feedless
//
//  Created by Rogerio Chaves on 16/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct PostsList : View {
    @EnvironmentObject var imageLoader : ImageLoader
    private let posts:Posts

    init(_ posts: Posts) {
        self.posts = posts
    }

    func postItem(_ post: Entry<AuthorProfileContent<Post>>, _ text: String) -> some View {
        HStack(alignment: .top) {
            AsyncImage(url: Utils.avatarUrl(profile: post.value.authorProfile), imageLoader: self.imageLoader)
                .aspectRatio(contentMode: .fit)
                .frame(width: 48, height: 48)
                .border(Styles.darkGray)
            Group {
                Text(post.value.authorProfile.name ?? "unknown")
                .bold()
                +
                Text(" " + text)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
    }

    func smallPosts() -> [(String, PostEntry, String)] {
        let mapped : [[(String, PostEntry, String)]] = self.posts.map { (post) in
            let smallPosts = Utils.splitInSmallPosts(post.value.content.text)
            return smallPosts.map({ (post.key + $0, post, $0) })
        }
        return Array(mapped.joined())
    }

    var body: some View {
        VStack {
            ForEach(smallPosts(), id: \.0) { (id, post, text) in
                VStack (alignment: .leading) {
                    self.postItem(post, text)
                    Divider()
                }
            }
        }
    }
}

struct PostsList_Previews: PreviewProvider {
    static var previews: some View {
        ScrollView {
            PostsList(Samples.posts())
                .environmentObject(ImageLoader())
        }
    }
}

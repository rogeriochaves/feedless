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

    func postItem(_ post: Entry<AuthorProfileContent<Post>>) -> some View {
        HStack(alignment: .top) {
            AsyncImage(url: Utils.avatarUrl(profile: post.value.authorProfile), imageLoader: self.imageLoader)
                .aspectRatio(contentMode: .fit)
                .frame(width: 48, height: 48)
                .border(Styles.darkGray)
            Group {
                Text(post.value.authorProfile.name ?? "unknown")
                .bold()
                +
                Text(" " + post.value.content.text)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
    }

    var body: some View {
        VStack {
            ForEach(posts, id: \.key) { post in
                VStack (alignment: .leading) {
                    self.postItem(post)
                    Divider()
                }
            }
        }
    }
}

struct PostsList_Previews: PreviewProvider {
    static var previews: some View {
        PostsList(Samples.posts())
            .environmentObject(ImageLoader())
    }
}
